import asyncio
import uuid
from typing import Dict, List
from fastapi import WebSocket
from websockets.exceptions import ConnectionClosed

class ConnectionManager:
    def __init__(self):
        self.active_pairs: Dict[str, Dict[str, WebSocket]] = {}
        self.waiting_clients: List[WebSocket] = []
        self.waiting_operators: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def accept_connection(self, websocket: WebSocket) -> bool:
        """Принимает соединение и возвращает статус"""
        try:
            await websocket.accept()
            print(f"Connection accepted from {websocket.client}")
            return True
        except Exception as e:
            print(f"Connection accept failed: {e}")
            return False

    async def connect_client(self, websocket: WebSocket) -> bool:
        """Обрабатывает подключение клиента"""
        if not await self.accept_connection(websocket):
            return False
            
        async with self.lock:
            try:
                await websocket.send_json({"type": "waiting"})
                self.waiting_clients.append(websocket)
                print(f"New client connected. Total clients: {len(self.waiting_clients)}")
                await self._try_pair_connections()
                return True
            except Exception as e:
                print(f"Client connection error: {e}")
                return False

    async def connect_operator(self, websocket: WebSocket) -> bool:
        """Обрабатывает подключение оператора"""
        if not await self.accept_connection(websocket):
            return False
            
        async with self.lock:
            try:
                self.waiting_operators.append(websocket)
                print(f"New operator connected. Total operators: {len(self.waiting_operators)}")
                await self._try_pair_connections()
                return True
            except Exception as e:
                print(f"Operator connection error: {e}")
                return False

    async def _try_pair_connections(self):
        """Пытается соединить клиентов и операторов"""
        while self.waiting_clients and self.waiting_operators:
            client = self.waiting_clients.pop(0)
            operator = self.waiting_operators.pop(0)
            
            session_id = str(uuid.uuid4())
            self.active_pairs[session_id] = {
                "client": client,
                "operator": operator
            }
            
            try:
                await asyncio.gather(
                    client.send_json({"type": "call_connected", "session_id": session_id}),
                    operator.send_json({"type": "client_connected", "session_id": session_id})
                )
                print(f"Paired successfully. Session ID: {session_id}")
            except Exception as e:
                print(f"Pairing failed: {e}")
                # Возвращаем в очереди при ошибке
                self.waiting_clients.insert(0, client)
                self.waiting_operators.insert(0, operator)
                del self.active_pairs[session_id]
                break

    async def broadcast_audio(self, sender: WebSocket, data: bytes):
        """Пересылает аудио между парой"""
        async with self.lock:
            for session_id, pair in self.active_pairs.items():
                if pair["client"] == sender:
                    try:
                        await pair["operator"].send_bytes(data)
                    except ConnectionClosed:
                        await self._cleanup_connection(pair["operator"])
                    return
                
                if pair["operator"] == sender:
                    try:
                        await pair["client"].send_bytes(data)
                    except ConnectionClosed:
                        await self._cleanup_connection(pair["client"])
                    return

    async def _cleanup_connection(self, websocket: WebSocket):
        """Очищает соединение из всех очередей"""
        async with self.lock:
            # Удаляем из очередей ожидания
            if websocket in self.waiting_clients:
                self.waiting_clients.remove(websocket)
                print("Removed client from waiting list")
                return
                
            if websocket in self.waiting_operators:
                self.waiting_operators.remove(websocket)
                print("Removed operator from waiting list")
                return
            
            # Удаляем из активных пар
            for session_id, pair in list(self.active_pairs.items()):
                if websocket in [pair["client"], pair["operator"]]:
                    other = pair["operator"] if websocket == pair["client"] else pair["client"]
                    try:
                        await other.send_json({"type": "call_ended"})
                    except:
                        pass
                    del self.active_pairs[session_id]
                    print(f"Session {session_id} terminated")
                    break