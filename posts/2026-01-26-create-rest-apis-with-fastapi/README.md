# How to Create REST APIs with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, REST API, Web Development, Async, Pydantic, OpenAPI

Description: Learn how to build high-performance REST APIs with FastAPI. This guide covers routing, request validation, authentication, database integration, and async operations with practical examples.

---

> FastAPI is a modern Python web framework designed for building APIs quickly. It combines the simplicity of Flask with the performance of Node.js, automatic validation with Pydantic, and interactive API documentation out of the box.

FastAPI has become the go-to choice for Python API development due to its speed, automatic documentation, and excellent developer experience. This guide shows you how to build production-ready APIs.

---

## Getting Started

### Installation

```bash
# Install FastAPI and an ASGI server
pip install fastapi uvicorn[standard]

# Additional useful packages
pip install python-multipart  # For file uploads
pip install python-jose[cryptography]  # For JWT
pip install passlib[bcrypt]  # For password hashing
pip install sqlalchemy  # For database
pip install httpx  # For async HTTP client
```

### Basic Application

```python
# main.py
# Basic FastAPI application
from fastapi import FastAPI

# Create the FastAPI application instance
app = FastAPI(
    title="My API",
    description="A sample REST API built with FastAPI",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint returning a welcome message."""
    return {"message": "Welcome to My API"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

# Run with: uvicorn main:app --reload
```

---

## Request and Response Models

### Using Pydantic for Validation

```python
# models.py
# Request and response models with Pydantic
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """User roles enumeration."""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class UserBase(BaseModel):
    """Base user model with shared fields."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.USER

class UserCreate(UserBase):
    """Model for creating a new user."""
    password: str = Field(..., min_length=8)

    @validator('password')
    def password_strength(cls, v):
        """Validate password has at least one digit."""
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserResponse(UserBase):
    """Model for user response (excludes password)."""
    id: int
    created_at: datetime
    is_active: bool = True

    class Config:
        # Allow ORM models to be converted
        orm_mode = True

class UserUpdate(BaseModel):
    """Model for partial user updates."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
```

### CRUD Endpoints

```python
# api.py
# CRUD endpoints with validation
from fastapi import FastAPI, HTTPException, status, Query, Path
from typing import List, Optional
from models import UserCreate, UserResponse, UserUpdate

app = FastAPI()

# In-memory database for demonstration
users_db = {}
user_id_counter = 1

@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    """Create a new user."""
    global user_id_counter

    # Check if email already exists
    for existing_user in users_db.values():
        if existing_user["email"] == user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Create user record
    user_data = user.dict()
    user_data["id"] = user_id_counter
    user_data["created_at"] = datetime.utcnow()
    user_data["is_active"] = True

    # Remove password from stored data (in real app, hash it)
    del user_data["password"]

    users_db[user_id_counter] = user_data
    user_id_counter += 1

    return user_data

@app.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max records to return"),
    role: Optional[str] = Query(None, description="Filter by role")
):
    """List all users with pagination and filtering."""
    users = list(users_db.values())

    # Apply role filter
    if role:
        users = [u for u in users if u["role"] == role]

    # Apply pagination
    return users[skip:skip + limit]

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int = Path(..., gt=0, description="The ID of the user")
):
    """Get a user by ID."""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return users_db[user_id]

@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate):
    """Partially update a user."""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update only provided fields
    update_data = user_update.dict(exclude_unset=True)
    users_db[user_id].update(update_data)

    return users_db[user_id]

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    """Delete a user."""
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    del users_db[user_id]
```

---

## Dependency Injection

```python
# dependencies.py
# Reusable dependencies with FastAPI
from fastapi import Depends, HTTPException, status, Header
from typing import Optional

# Database session dependency
async def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Common query parameters
class PaginationParams:
    """Common pagination parameters."""
    def __init__(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: Optional[str] = None,
        order: str = "asc"
    ):
        self.skip = skip
        self.limit = min(limit, 100)  # Cap at 100
        self.sort_by = sort_by
        self.order = order

# API key authentication
async def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key from header."""
    if x_api_key != "expected-api-key":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return x_api_key

# Using dependencies in endpoints
@app.get("/items")
async def list_items(
    pagination: PaginationParams = Depends(),
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """List items with pagination and authentication."""
    query = db.query(Item)

    if pagination.sort_by:
        column = getattr(Item, pagination.sort_by, None)
        if column:
            if pagination.order == "desc":
                column = column.desc()
            query = query.order_by(column)

    items = query.offset(pagination.skip).limit(pagination.limit).all()
    return items
```

---

## Authentication with JWT

```python
# auth.py
# JWT authentication implementation
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional

# Configuration
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decode JWT and return current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_from_db(username)
    if user is None:
        raise credentials_exception

    return user

# Login endpoint
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate and return JWT token."""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}

# Protected endpoint
@app.get("/users/me")
async def read_users_me(current_user = Depends(get_current_user)):
    """Get current user profile."""
    return current_user
```

---

## Async Database Operations

```python
# database.py
# Async database operations with SQLAlchemy
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

# Create async engine
DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"
engine = create_async_engine(DATABASE_URL, echo=True)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# Async dependency
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Async CRUD operations
from sqlalchemy import select

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get user by ID using async database."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.post("/users")
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_async_db)):
    """Create a new user using async database."""
    db_user = User(
        email=user.email,
        name=user.name,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user
```

---

## Error Handling

```python
# error_handling.py
# Custom exception handling
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()

class CustomException(Exception):
    """Custom application exception."""
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    """Handle custom exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "Application Error",
            "detail": exc.detail,
            "path": str(request.url)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with custom format."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": errors
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred"
        }
    )
```

---

## API Routers and Structure

```python
# Organize larger applications with routers
# project/
#   main.py
#   routers/
#     __init__.py
#     users.py
#     items.py

# routers/users.py
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}}
)

@router.get("/")
async def list_users():
    return []

@router.get("/{user_id}")
async def get_user(user_id: int):
    return {"id": user_id}

# main.py
from fastapi import FastAPI
from routers import users, items

app = FastAPI()

app.include_router(users.router)
app.include_router(items.router)
```

---

## Interactive Documentation

FastAPI automatically generates OpenAPI documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## Conclusion

FastAPI provides everything you need for modern API development:

- Automatic request validation with Pydantic
- Built-in async support for high performance
- Dependency injection for clean, testable code
- JWT authentication and security utilities
- Automatic OpenAPI documentation
- Excellent IDE support with type hints

The combination of Python type hints and Pydantic makes FastAPI APIs self-documenting and less prone to bugs.

---

*Building FastAPI applications? [OneUptime](https://oneuptime.com) helps you monitor your APIs, track performance, and get alerted when issues arise.*

