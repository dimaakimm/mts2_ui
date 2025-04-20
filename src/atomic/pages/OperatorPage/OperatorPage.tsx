import { useEffect, useState, useRef } from 'react';
import styles from './OperatorPage.module.scss';
import { hints, personalInfo } from '../../../mockedData/mockedData.ts';
import Button from '../../atoms/Button/Button.tsx';
import Typography from '../../atoms/Typography/Typography.tsx';
import { useNavigate } from 'react-router-dom';
import Hint from '../../atoms/Hint/Hint.tsx';

const OperatorPage = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [callStatus, setCallStatus] = useState<'disconnected' | 'waiting' |'connected'>('disconnected');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const navigate = useNavigate();

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        const ws = new WebSocket('wss://a8638059abbd30fd1957cef775619107.serveo.net/ws/operator');
        ws.binaryType = 'arraybuffer';

        const handleMessage = async (event: MessageEvent) => {
            if (typeof event.data === 'string') {
                const data = JSON.parse(event.data);
                console.log("Operator received:", data);
                
                if (data.type === 'client_connected') {
                    setCallStatus('connected');
                    await startRecording(ws);
                } else if (data.type === 'call_ended') {
                    stopRecording();
                    setCallStatus('disconnected');
                }
            } else {
                try {
                    const arrayBuffer = event.data instanceof ArrayBuffer 
                    ? event.data 
                    : await new Response(event.data).arrayBuffer();
      
                    setAudioQueue(prev => [...prev, arrayBuffer]);
                    if (!isPlaying) processAudioQueue();
                } catch (err) {
                    console.error("Audio processing error:", err);
                }
            }
        };

        ws.addEventListener('open', () => {
            console.log('Connected to WS as operator');
            setSocket(ws);
            setCallStatus('waiting');
        });

        ws.addEventListener('message', handleMessage);
        ws.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            setCallStatus('disconnected');
        });

        ws.addEventListener('close', () => {
            console.log('WebSocket closed');
            stopRecording();
            setCallStatus('disconnected');
        });

        return () => {
            ws.removeEventListener('message', handleMessage);
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            stopRecording();
            
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const processAudioQueue = async () => {
        if (audioQueue.length === 0 || isPlaying || !audioContextRef.current) return;
        
        setIsPlaying(true);
        try {
            const nextAudio = audioQueue[0];
            await playAudioBuffer(nextAudio);
            setAudioQueue(prev => prev.slice(1));
        } catch (err) {
            console.error('Queue processing error:', err);
        }
        setIsPlaying(false);
        processAudioQueue();
    };

    /**
     * Воспроизводит аудио буфер
     * 
     * @param {ArrayBuffer} arrayBuffer - Буфер с аудио данными
     */
    const playAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
        try {
          const audioContext = getAudioContext();
          
          // Вариант 1: Попробуем сначала как Blob
          const blob = new Blob([arrayBuffer], { type: 'audio/webm;codecs=opus' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio();
          audio.src = url;
          await audio.play();
          
          // Вариант 2: Если Blob не сработает - пробуем Web Audio API
          try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
          } catch (innerError) {
            console.warn('Web Audio API fallback failed:', innerError);
          }
        } catch (error) {
          console.error('Audio playback error:', error);
        }
    };

      /**
     * Начинает запись аудио и отправку через WebSocket
     * 
     * @param {WebSocket} ws - WebSocket соединение для отправки аудио
     */
    const startRecording = async (ws: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mimeType = getSupportedMimeType();

            if (!mimeType) {
                throw new Error('No supported audio format found');
            }

            console.log('Using MIME type:', mimeType);
            
            const recorder = new MediaRecorder(stream, { 
                mimeType,
                audioBitsPerSecond: 128000 
            });

            recorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    console.log(`Sending audio chunk: ${e.data.size} bytes`);
                    await new Promise(resolve => setTimeout(resolve, 50));
                    ws.send(await e.data.arrayBuffer());
                }
            };

            recorder.start(500);
            mediaRecorderRef.current = recorder;
        } catch (err) {
            console.error('Recording error:', err);
            setCallStatus('disconnected');
        }
    };

    const getSupportedMimeType = (): string => {
        const preferredFormats = [
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm'
        ];
        
        return preferredFormats.find(f => MediaRecorder.isTypeSupported(f)) || 
               'audio/mp4;codecs=mp4a';
      };

    const stopRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
            recorder.stream.getTracks().forEach(track => track.stop());
            recorder.stop();
            mediaRecorderRef.current = null;
        }
    };

    const endCall = () => {
        if (socket) {
            socket.close();
        }
        navigate('/');
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.left}>
                <div className={styles.leftContent}>
                    {hints.map((hint, index) => (
                        <Hint text={hint.text} type={hint.type} key={index} />
                    ))}
                </div>
            </div>
            <div className={styles.right}>
                <div className={styles.mainInfo}>
                    {callStatus === 'connected' 
                        ? 'РАЗГОВОР С КЛИЕНТОМ' 
                        : 'ОЖИДАНИЕ КЛИЕНТА'}
                </div>
                <div className={styles.info}>
                    <Typography dType="r20">{personalInfo}</Typography>
                </div>
                <Button onClick={endCall}>
                    <Typography dType="r24">
                        {callStatus === 'connected' ? 'Завершить звонок' : 'На главную'}
                    </Typography>
                </Button>
            </div>
        </div>
    );
};

export default OperatorPage;