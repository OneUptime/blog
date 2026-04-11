# How to Use MySQL with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, FastAPI, SQLAlchemy

Description: Connect FastAPI to MySQL with SQLAlchemy async engine, define models with Mapped types, and write dependency-injected database sessions.

---

FastAPI's async-first design pairs well with MySQL when using SQLAlchemy 2's async engine. This combination gives you non-blocking database calls, automatic session lifecycle management via dependency injection, and Pydantic schema integration.

## Installing Dependencies

```bash
pip install fastapi uvicorn sqlalchemy aiomysql python-dotenv
```

`aiomysql` is the async MySQL driver used by SQLAlchemy's async engine.

## Database Engine and Session

Create `database.py`:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

DATABASE_URL = (
    f"mysql+aiomysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '3306')}"
    f"/{os.getenv('DB_NAME')}"
)

engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=5)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass
```

## Defining a Model

```python
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, func

class User(Base):
    __tablename__ = "users"

    id:         Mapped[int]      = mapped_column(primary_key=True)
    name:       Mapped[str]      = mapped_column(String(100))
    email:      Mapped[str]      = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

## Dependency for Session Injection

```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

## API Route Example

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User

app = FastAPI()

@app.get("/users/{user_id}")
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users")
async def create_user(name: str, email: str, db: AsyncSession = Depends(get_db)):
    user = User(name=name, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

## Environment Variables

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=strongpassword
DB_NAME=app_db
```

## Running Migrations with Alembic

```bash
pip install alembic
alembic init -t async alembic
alembic revision --autogenerate -m "create users table"
alembic upgrade head
```

## Summary

FastAPI and MySQL work seamlessly together via SQLAlchemy's async engine and `aiomysql`. Use dependency injection for session management, Alembic for schema migrations, and always use parameterized queries through the ORM to prevent SQL injection.
