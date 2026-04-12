# How to Build a REST API with MySQL and Python FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, FastAPI, Python, REST API, SQLAlchemy

Description: Build a high-performance async REST API with Python FastAPI and MySQL using SQLAlchemy async sessions, Pydantic models, and connection pooling.

---

## FastAPI with MySQL

FastAPI is a modern Python web framework that supports async request handling. Pairing it with SQLAlchemy's async engine allows you to handle MySQL queries without blocking the event loop, making it ideal for high-throughput APIs.

```bash
mkdir fastapi-mysql-api && cd fastapi-mysql-api
pip install fastapi uvicorn sqlalchemy asyncmy python-dotenv pydantic-settings
```

## Database Setup

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

DATABASE_URL = (
    f"mysql+asyncmy://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME')}"
)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

## Order Model

```python
# app/models.py
from sqlalchemy import Integer, Numeric, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from datetime import datetime
from decimal import Decimal

class Order(Base):
    __tablename__ = 'orders'

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:    Mapped[int]      = mapped_column(Integer, nullable=False)
    total:      Mapped[Decimal]  = mapped_column(Numeric(10, 2), nullable=False)
    status:     Mapped[str]      = mapped_column(String(20), default='pending')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

## Pydantic Schemas

```python
# app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class OrderCreate(BaseModel):
    user_id: int
    total:   Decimal

class OrderStatus(BaseModel):
    status: str

class OrderResponse(BaseModel):
    id:         int
    user_id:    int
    total:      Decimal
    status:     str
    created_at: datetime

    class Config:
        from_attributes = True
```

## Orders Router

```python
# app/routers/orders.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Order
from ..schemas import OrderCreate, OrderStatus, OrderResponse
from typing import List

router = APIRouter(prefix='/api/orders', tags=['orders'])

VALID_STATUSES = {'pending', 'processing', 'shipped', 'completed', 'cancelled'}

@router.get('/', response_model=List[OrderResponse])
async def list_orders(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(50)
    )
    return result.scalars().all()

@router.get('/{order_id}', response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    return order

@router.post('/', response_model=OrderResponse, status_code=201)
async def create_order(body: OrderCreate, db: AsyncSession = Depends(get_db)):
    order = Order(user_id=body.user_id, total=body.total)
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order

@router.patch('/{order_id}/status', response_model=OrderResponse)
async def update_status(order_id: int, body: OrderStatus, db: AsyncSession = Depends(get_db)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail='Invalid status')
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    order.status = body.status
    await db.commit()
    await db.refresh(order)
    return order
```

## Main Application

```python
# app/main.py
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .routers.orders import router as orders_router
from .database import engine

app = FastAPI(title='MySQL FastAPI')
app.include_router(orders_router)

@app.get('/health')
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {'status': 'ok'}
    except Exception:
        return JSONResponse(content={'status': 'error'}, status_code=503)
```

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Summary

A FastAPI MySQL REST API using SQLAlchemy's async engine handles database queries without blocking the event loop, enabling higher throughput under concurrent load. Pydantic models provide automatic request validation and response serialization, while `pool_pre_ping=True` tests connections before checkout and invalidates stale ones automatically. FastAPI's automatic OpenAPI documentation is generated at `/docs`.
