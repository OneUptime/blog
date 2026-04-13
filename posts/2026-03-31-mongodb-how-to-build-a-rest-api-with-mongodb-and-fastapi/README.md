# How to Build a REST API with MongoDB and FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, FastAPI, Python, REST API, Motor

Description: Learn how to build an async REST API with FastAPI and Motor (async MongoDB driver) including Pydantic models, CRUD endpoints, and pagination.

---

## Project Setup

```bash
pip install fastapi motor uvicorn "pydantic[email]" python-dotenv
```

Create `.env`:

```text
MONGODB_URI=mongodb://localhost:27017
DB_NAME=myapp
```

## Database Connection

```python
# database.py
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client[os.getenv('DB_NAME')]
    print('Connected to MongoDB')


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
```

## Pydantic Models

```python
# models.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: str = Field(alias='_id')
    name: str
    email: str
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

    @classmethod
    def from_mongo(cls, doc):
        doc['_id'] = str(doc['_id'])
        return cls(**doc)
```

## Main Application

```python
# main.py
from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from pymongo import ReturnDocument
from database import connect_db, close_db, get_db
from models import UserCreate, UserUpdate, UserResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    db = get_db()
    await db.users.create_index('email', unique=True)
    yield
    await close_db()


app = FastAPI(title='MongoDB FastAPI', lifespan=lifespan)


@app.get('/api/users', response_model=dict)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    db = get_db()
    skip = (page - 1) * limit
    cursor = db.users.find({}).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    total = await db.users.count_documents({})

    return {
        'data': [UserResponse.from_mongo(u).model_dump() for u in users],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': -(-total // limit),
        }
    }


@app.get('/api/users/{user_id}', response_model=UserResponse)
async def get_user(user_id: str):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail='Invalid ID format')

    user = await db.users.find_one({'_id': oid})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    return UserResponse.from_mongo(user)


@app.post('/api/users', response_model=UserResponse, status_code=201)
async def create_user(payload: UserCreate):
    db = get_db()
    doc = {
        'name': payload.name,
        'email': payload.email.lower(),
        'created_at': datetime.now(timezone.utc),
    }

    from pymongo.errors import DuplicateKeyError
    try:
        result = await db.users.insert_one(doc)
        doc['_id'] = result.inserted_id
        return UserResponse.from_mongo(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail='Email already exists')


@app.patch('/api/users/{user_id}', response_model=UserResponse)
async def update_user(user_id: str, payload: UserUpdate):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail='Invalid ID format')

    update = payload.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail='No fields to update')

    update['updated_at'] = datetime.now(timezone.utc)

    user = await db.users.find_one_and_update(
        {'_id': oid},
        {'$set': update},
        return_document=ReturnDocument.AFTER
    )
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    return UserResponse.from_mongo(user)


@app.delete('/api/users/{user_id}', status_code=204)
async def delete_user(user_id: str):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail='Invalid ID format')

    result = await db.users.delete_one({'_id': oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
```

## Running the Server

```bash
uvicorn main:app --reload --port 8000
```

The interactive API documentation is available at `http://localhost:8000/docs`.

## Testing

```bash
# Create user
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# List users
curl "http://localhost:8000/api/users?page=1&limit=10"
```

## Summary

FastAPI with Motor provides a fully async MongoDB REST API with automatic request/response validation via Pydantic. The lifespan context manager handles database connection setup and teardown, while Motor's async interface ensures non-blocking database operations that scale well under concurrent load.
