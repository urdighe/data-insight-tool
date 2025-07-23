from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from databot import DataBot
from contextlib import asynccontextmanager
import logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    await chatbot.connect_to_servers()
    yield
    await chatbot.cleanup()


app = FastAPI(lifespan=lifespan)
chatbot = DataBot()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            response = await chatbot.process_query(data)
            logging.info(response)
            await websocket.send_text(response or "")
    except WebSocketDisconnect:
        logging.info("Client disconnected")
    finally:
        await chatbot.cleanup()
