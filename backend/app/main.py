from app.managers import ConnectionManager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile
import json  
import uuid
import asyncio  
from typing import Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Server is running"}

@app.websocket("/ws/operator")
async def operator_endpoint(websocket: WebSocket):
    print("New operator connection attempt")
    try:
        if not await manager.connect_operator(websocket):
            return
            
        print("Operator successfully connected")
        while True:
            try:
                data = await websocket.receive_bytes()
                await manager.broadcast_audio(websocket, data)
            except WebSocketDisconnect:
                print("Operator disconnected normally")
                break
            except Exception as e:
                print(f"Operator data error: {e}")
                break
                
    except Exception as e:
        print(f"Operator critical error: {e}")
    finally:
        await manager._cleanup_connection(websocket)
        print("Operator connection cleanup complete")

@app.websocket("/ws/client")
async def client_endpoint(websocket: WebSocket):
    print("New client connection attempt")
    try:
        if not await manager.connect_client(websocket):
            return
            
        print("Client successfully connected")
        while True:
            try:
                data = await websocket.receive_bytes()
                await manager.broadcast_audio(websocket, data)
            except WebSocketDisconnect:
                print("Client disconnected normally")
                break
            except Exception as e:
                print(f"Client data error: {e}")
                break
                
    except Exception as e:
        print(f"Client critical error: {e}")
    finally:
        await manager._cleanup_connection(websocket)
        print("Client connection cleanup complete")

@app.get("/server-status")
async def server_status():
    return {
        "waiting_clients": len(manager.waiting_clients),
        "waiting_operators": len(manager.waiting_operators),
        "active_sessions": len(manager.active_pairs)
    }
        


@app.post("/upload_audio/{session_id}")
async def upload_audio(session_id: str, file: UploadFile):
    # Сохраняем аудиофайл временно
    temp_file = f"temp_audio_{session_id}.wav"
    async with aiofiles.open(temp_file, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Здесь будет вызов ML-моделей
    # Например:
    # emotion = emotion_agent.process(temp_file)
    # intent = intent_agent.process(temp_file)
    
    # Отправляем результат оператору
    await manager.broadcast(session_id, {
        "type": "analysis_result",
        "emotion": "neutral",  # Заглушка
        "intent": "billing_issue"  # Заглушка
    })
    
    return {"status": "processed"}