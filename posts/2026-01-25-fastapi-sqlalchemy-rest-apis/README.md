# How to Build REST APIs with FastAPI and SQLAlchemy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, SQLAlchemy, REST API, Database, ORM, Async, PostgreSQL

Description: Learn how to build production-ready REST APIs with FastAPI and SQLAlchemy. This guide covers database models, async operations, CRUD endpoints, validation with Pydantic, and best practices for scalable API design.

---

> FastAPI combined with SQLAlchemy gives you the best of both worlds: high-performance async APIs with a battle-tested ORM. This guide shows you how to build production-ready REST APIs that are fast, type-safe, and maintainable.

Building REST APIs in Python has never been easier. FastAPI provides automatic OpenAPI documentation, request validation, and async support out of the box. SQLAlchemy handles the database layer with its powerful ORM. Together, they form a solid foundation for any backend application.

---

## Why FastAPI and SQLAlchemy?

FastAPI is one of the fastest Python frameworks available, rivaling Node.js and Go in performance benchmarks. SQLAlchemy is the most mature and feature-rich ORM in the Python ecosystem. The combination offers:

- Automatic request/response validation with Pydantic
- Async database operations for better concurrency
- Built-in API documentation (Swagger UI and ReDoc)
- Type hints that improve code quality and IDE support
- Mature ecosystem with extensive community support

---

## Project Setup

### Installation

Start by creating a virtual environment and installing the required packages:

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy asyncpg alembic pydantic-settings
```

### Project Structure

Organize your project with a clear structure that separates concerns:

```
my_api/
    app/
        __init__.py
        main.py           # FastAPI application entry point
        config.py         # Configuration settings
        database.py       # Database connection setup
        models/
            __init__.py
            user.py       # SQLAlchemy models
        schemas/
            __init__.py
            user.py       # Pydantic schemas
        routers/
            __init__.py
            users.py      # API route handlers
        services/
            __init__.py
            user.py       # Business logic layer
    alembic/              # Database migrations
    tests/
    requirements.txt
```

---

## Database Configuration

### Setting Up the Async Engine

Create a database configuration that supports async operations. This setup uses SQLAlchemy 2.0 style with asyncpg for PostgreSQL connections.

```python
# app/database.py
# Database connection and session management
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create async engine for PostgreSQL
# pool_size controls how many connections to keep open
# max_overflow allows temporary connections beyond pool_size
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_size=5,          # Maintain 5 connections in the pool
    max_overflow=10,      # Allow up to 10 additional connections
    pool_pre_ping=True,   # Verify connections before use
)

# Session factory for creating database sessions
# expire_on_commit=False prevents attribute access issues after commit
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for all SQLAlchemy models
Base = declarative_base()


async def get_db():
    """
    Dependency that provides a database session.
    Automatically closes the session when the request completes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Configuration with Pydantic Settings

Use Pydantic settings for type-safe configuration management:

```python
# app/config.py
# Application configuration using environment variables
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database configuration
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/mydb"

    # Application settings
    DEBUG: bool = False
    APP_NAME: str = "My API"
    API_VERSION: str = "1.0.0"

    # Security settings
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        # Load settings from .env file
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Cache settings to avoid reading .env file on every request.
    Use @lru_cache for singleton pattern.
    """
    return Settings()


settings = get_settings()
```

---

## SQLAlchemy Models

### Defining Database Models

Create SQLAlchemy models that represent your database tables. Use proper indexes and constraints for data integrity.

```python
# app/models/user.py
# SQLAlchemy model for the users table
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    User model representing the users table.
    Includes timestamps and soft-delete support.
    """
    __tablename__ = "users"

    # Primary key with auto-increment
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User information
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Automatic timestamps using database functions
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
```

---

## Pydantic Schemas

### Request and Response Validation

Pydantic schemas handle request validation and response serialization. Define separate schemas for different operations.

```python
# app/schemas/user.py
# Pydantic schemas for request/response validation
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base schema with common user fields."""
    email: EmailStr
    username: str = Field(min_length=3, max_length=100, pattern="^[a-zA-Z0-9_]+$")
    full_name: Optional[str] = Field(None, max_length=200)


class UserCreate(UserBase):
    """Schema for creating a new user - includes password."""
    password: str = Field(min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user - all fields optional."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user responses - excludes sensitive data."""
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    # Enable ORM mode to read data from SQLAlchemy models
    model_config = ConfigDict(from_attributes=True)


class UserList(BaseModel):
    """Schema for paginated user list."""
    users: list[UserResponse]
    total: int
    page: int
    size: int
    pages: int
```

---

## Service Layer

### Business Logic Separation

Keep your business logic in a service layer to maintain clean, testable code:

```python
# app/services/user.py
# User service with business logic and database operations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from typing import Optional
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
import hashlib


class UserService:
    """
    Service class for user-related operations.
    Encapsulates all database interactions and business logic.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch a user by their ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their email address."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        active_only: bool = True
    ) -> tuple[list[User], int]:
        """
        Fetch paginated list of users.
        Returns tuple of (users, total_count).
        """
        # Build base query
        query = select(User)
        if active_only:
            query = query.where(User.is_active == True)

        # Get total count for pagination
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await self.db.execute(query)

        return result.scalars().all(), total

    async def create(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        Hashes password before storing.
        """
        # Hash the password (use bcrypt in production)
        hashed_password = self._hash_password(user_data.password)

        # Create user instance
        user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
        )

        self.db.add(user)

        try:
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("User with this email or username already exists")

    async def update(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Update an existing user."""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        # Update only provided fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete(self, user_id: int) -> bool:
        """Soft delete a user by setting is_active to False."""
        user = await self.get_by_id(user_id)
        if not user:
            return False

        user.is_active = False
        await self.db.commit()
        return True

    def _hash_password(self, password: str) -> str:
        """
        Hash password for storage.
        Note: Use bcrypt or argon2 in production.
        """
        return hashlib.sha256(password.encode()).hexdigest()
```

---

## API Routers

### Building the REST Endpoints

Create clean API endpoints using FastAPI's router system:

```python
# app/routers/users.py
# User API endpoints
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.user import UserService
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserList
import math

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """Dependency to get UserService instance."""
    return UserService(db)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service)
):
    """
    Create a new user account.

    - **email**: Valid email address (must be unique)
    - **username**: 3-100 alphanumeric characters (must be unique)
    - **password**: Minimum 8 characters
    """
    try:
        user = await service.create(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=UserList)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(True, description="Only show active users"),
    service: UserService = Depends(get_user_service)
):
    """
    Get paginated list of users.

    Supports filtering by active status and pagination.
    """
    skip = (page - 1) * size
    users, total = await service.get_all(skip=skip, limit=size, active_only=active_only)

    return UserList(
        users=users,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 1
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    """Get a specific user by their ID."""
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    service: UserService = Depends(get_user_service)
):
    """
    Update a user's information.

    Only provided fields will be updated.
    """
    user = await service.update(user_id, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    """
    Delete a user (soft delete).

    The user is marked as inactive rather than removed from the database.
    """
    success = await service.delete(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
```

---

## Main Application

### Putting It All Together

Create the main FastAPI application that ties everything together:

```python
# app/main.py
# FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.routers import users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for startup and shutdown events.
    Creates database tables on startup.
    """
    # Startup: Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield  # Application runs here

    # Shutdown: Clean up resources
    await engine.dispose()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Production-ready REST API built with FastAPI and SQLAlchemy",
    lifespan=lifespan,
)

# Configure CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "healthy", "version": settings.API_VERSION}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": settings.API_VERSION,
        "docs": "/docs",
    }
```

---

## Database Migrations with Alembic

### Setting Up Alembic

Use Alembic for database migrations to manage schema changes safely:

```bash
# Initialize Alembic
alembic init alembic

# Edit alembic.ini to set your database URL
# sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/mydb
```

```python
# alembic/env.py (key changes for async support)
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.user import User  # Import all models
from app.database import Base

# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_online():
    """Run migrations in online mode with async engine."""
    connectable = create_async_engine(config.get_main_option("sqlalchemy.url"))

    async def do_run_migrations(connection):
        await connection.run_sync(do_migrations)

    import asyncio
    asyncio.run(do_run_migrations(connectable))
```

Generate and apply migrations:

```bash
# Generate a new migration
alembic revision --autogenerate -m "Create users table"

# Apply migrations
alembic upgrade head
```

---

## Running the Application

Start the development server with hot reload:

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production (with multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Access the automatic API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Best Practices Summary

1. **Use async database operations** - Take advantage of FastAPI's async nature for better concurrency
2. **Separate concerns** - Keep models, schemas, services, and routers in separate modules
3. **Validate at the boundary** - Use Pydantic schemas for all input validation
4. **Use dependency injection** - FastAPI's dependency system makes testing easier
5. **Handle errors gracefully** - Use HTTP exceptions with appropriate status codes
6. **Use migrations** - Never modify database schemas manually in production
7. **Configure connection pooling** - Tune pool sizes based on your workload

---

*Ready to monitor your FastAPI application? [OneUptime](https://oneuptime.com) provides comprehensive observability with automatic tracing, metrics collection, and error tracking for Python applications.*

**Related Reading:**
- [How to Structure Logs Properly in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
- [How to Implement Health Checks in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
