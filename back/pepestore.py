from fastapi import FastAPI
from fintoc import Fintoc

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import uvicorn
import os

from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ordenes = {}

# Productos hardcodeados
PRODUCTOS = [
    {"id": 1, "nombre": "Monster Lemon", "precio": 1990, "imagen": "🍋", "descripcion": " La mejor?"},
    {"id": 2, "nombre": "Monster Apple", "precio": 1990, "imagen": "🍏", "descripcion": "yum"},
    {"id": 3, "nombre": "Monster Melon", "precio": 1990, "imagen": "🍈", "descripcion": " Es verde"},
    {"id": 4, "nombre": "Monster Cherry", "precio": 1990, "imagen": "🍒", "descripcion": " ahah sip"},
#    {"id": 5, "nombre": "Auriculares", "precio": 45990, "imagen": "🎧", "descripcion": "Noise Cancelling"},
#    {"id": 6, "nombre": "Webcam HD", "precio": 35990, "imagen": "📷", "descripcion": "1080p, 60fps"},
]

# Carrito en memoria (en producción usarías BD o sesiones)
carrito_storage = {}

class ItemCarrito(BaseModel):
    producto_id: int
    cantidad: int

class Orden(BaseModel):
    items: List[ItemCarrito]
    total: int
    nombre: str
    email: str

# Endpoints
@app.get("/")
async def root():
    return FileResponse("front/page.html")

@app.get("/api/productos")
async def get_productos():
    return {"productos": PRODUCTOS}

@app.get("/api/producto/{producto_id}")
async def get_producto(producto_id: int):
    producto = next((p for p in PRODUCTOS if p["id"] == producto_id), None)
    if not producto:
        return {"error": "Producto no encontrado"}, 404
    return producto

@app.post("/api/carrito/agregar")
async def agregar_carrito(item: ItemCarrito):
    # Validar que el producto existe
    producto = next((p for p in PRODUCTOS if p["id"] == item.producto_id), None)
    if not producto:
        return {"error": "Producto no encontrado"}, 404
    
    # Agregar al carrito (simulado)
    session_id = "demo_session"  # En producción usarías session ID real
    if session_id not in carrito_storage:
        carrito_storage[session_id] = []
    
    # Verificar si ya existe en el carrito
    existente = next((i for i in carrito_storage[session_id] if i["producto_id"] == item.producto_id), None)
    if existente:
        existente["cantidad"] += item.cantidad
    else:
        carrito_storage[session_id].append({
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "producto": producto
        })
    
    return {"mensaje": "Producto agregado", "carrito": carrito_storage[session_id]}

@app.get("/api/carrito")
async def get_carrito():
    session_id = "demo_session"
    carrito = carrito_storage.get(session_id, [])
    
    # Calcular total
    total = sum(item["producto"]["precio"] * item["cantidad"] for item in carrito)
    
    return {
        "items": carrito,
        "total": total,
        "cantidad_items": len(carrito)
    }

@app.delete("/api/carrito/{producto_id}")
async def eliminar_carrito(producto_id: int):
    session_id = "demo_session"
    if session_id in carrito_storage:
        carrito_storage[session_id] = [
            item for item in carrito_storage[session_id] 
            if item["producto_id"] != producto_id
        ]
    return {"mensaje": "Producto eliminado"}

@app.post("/api/checkout")
async def checkout(orden: Orden):

        # 1. Generar ID interno de orden
    order_id = f"ORD-{abs(hash(orden.email + str(orden.total))) % 10_000_000}"

    client = Fintoc(os.environ["FINTOC_SECRET_KEY"])

    checkout = client.checkout_sessions.create(
        amount=orden.total,
        currency="clp",
        customer_email=orden.email
    )

    session_id = checkout.id
    session_token = checkout.session_token

    ordenes[order_id] = {
        "email": orden.email,
        "total": orden.total,
        "items": orden.items,
        "checkout_session_id": session_id,
        "status": "pending"
    }
    # Aquí luego integrarás Fintoc
    # Por ahora solo simulamos el proceso
    
    # 4. Devolver info al frontend (widget)
    return {
        "order_id": order_id,
        "session_token": session_token,
        "checkout_session_id": session_id
    }

@app.post("/api/limpiar-carrito")
async def limpiar_carrito():
    session_id = "demo_session"
    carrito_storage[session_id] = []
    return {"mensaje": "Carrito limpiado"}

# Montar archivos estáticos
app.mount("/front", StaticFiles(directory="front"), name="front")

if __name__ == "__main__":
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)