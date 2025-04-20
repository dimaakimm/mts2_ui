import { useEffect, useState, useRef } from 'react';
import styles from './UserPage.module.scss';
import SwipeButton from '../../molecules/SwipeButton/SwipeButton.tsx';
import { useNavigate } from 'react-router-dom';
import RippleAvatar from '../../molecules/RippleAvatar/RippleAvatar.tsx';

const UserPage = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [callStatus, setCallStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const navigate = useNavigate();

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    useEffect(() => {
        const ws = new WebSocket('wss://a8638059abbd30fd1957cef775619107.serveo.net/ws/client');
        
        ws.onopen = () => {
            console.log('Connected to WS as client');
            setSocket(ws);
            setCallStatus('waiting');
            
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => console.log("Microphone access pre-granted"))
                .catch(err => console.error("Microphone access denied:", err));
        };
    
        ws.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                const data = JSON.parse(event.data);
                console.log("Received message:", data); 
                
                if (data.type === 'call_connected') {
                    setCallStatus('connected');
                    await startRecording(ws);
                } else if (data.type === 'call_ended') {
                    stopRecording();
                    setCallStatus('disconnected');
                }
            } else {
                try {
                    console.log("Audio...");
                const arrayBuffer = await event.data.arrayBuffer();
                await playAudioBuffer(arrayBuffer);
                } catch (err) {
                    console.error("Audio processing error:", err);
                }
            }
        };
    
        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            stopRecording();
            setCallStatus('disconnected');
        };

        return () => {
            ws.close();
            stopRecording();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

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
        if (mediaRecorder) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            mediaRecorder.stop();
            setMediaRecorder(null);
        }
    };

    const handleSwipe = () => {
        if (socket) {
            socket.close();
        }
        navigate('/');
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <RippleAvatar isActive={callStatus === 'connected'} />
                <div className={styles.status}>
                    {callStatus === 'waiting' && 'Ожидание оператора...'}
                    {callStatus === 'connected' && 'Соединение установлено'}
                </div>
            </div>
            <SwipeButton onComplete={handleSwipe} className={styles.btn} />
        </div>
    );
};

export default UserPage; 