# How to Use Async Database Connections in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FastAPI, Python, Async, Database, SQLAlchemy

Description: Learn how to implement async database connections in FastAPI using SQLAlchemy 2.0 and asyncpg. This guide covers connection pooling, session management, transactions, and performance optimization for high-throughput applications.

---

> Asynchronous database connections allow your FastAPI application to handle thousands of concurrent requests without blocking. This guide shows you how to set up async database operations properly, avoid common pitfalls, and optimize for production workloads.

Modern web applications need to handle many concurrent users efficiently. Traditional synchronous database connections block the entire request while waiting for database responses. Async connections free up your application to handle other requests during database I/O, dramatically improving throughput.

---

## Why Use Async Database Connections?

Before diving into implementation, let us understand why async database connections matter.

### Synchronous vs Asynchronous Flow

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant S as Server
    participant DB as Database

    Note over S: Synchronous (Blocking)
    C1->>S: Request
    S->>DB: Query
    Note over S: Server blocked
    DB-->>S: Result
    S-->>C1: Response
    C2->>S: Request (waits)
    S->>DB: Query
    DB-->>S: Result
    S-->>C2: Response
```

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant S as Server
    participant DB as Database

    Note over S: Asynchronous (Non-blocking)
    C1->>S: Request
    S->>DB: Query (async)
    C2->>S: Request
    S->>DB: Query (async)
    DB-->>S: Result for C1
    S-->>C1: Response
    DB-->>S: Result for C2
    S-->>C2: Response
```

### Performance Comparison

| Metric | Sync Connections | Async Connections |
|--------|------------------|-------------------|
| **Concurrent Requests** | Limited by threads | Limited by connections |
| **Memory Usage** | High (thread per request) | Low (single thread) |
| **Latency Under Load** | Increases linearly | Stays consistent |
| **Throughput** | ~100-500 req/s | ~1000-5000 req/s |

---

## Setting Up the Project

Let us start by setting up a FastAPI project with async database support.

### Required Dependencies

First, install the necessary packages for async database operations with PostgreSQL.

```bash
# Install FastAPI with all dependencies
pip install fastapi[all]

# Install SQLAlchemy 2.0+ with async support
pip install sqlalchemy[asyncio]

# Install asyncpg for PostgreSQL async driver
pip install asyncpg

# Install alembic for database migrations
pip install alembic

# Optional: Install aiosqlite for SQLite async support during development
pip install aiosqlite
```

### Project Structure

Organize your project for maintainability and clear separation of concerns.

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection setup
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py          # SQLAlchemy models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── user.py          # Pydantic schemas
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── user.py          # Database operations
│   └── routers/
│       ├── __init__.py
│       └── users.py         # API endpoints
├── alembic/                  # Database migrations
├── tests/
└── requirements.txt
```

---

## Configuring the Async Database Engine

The database engine is the foundation of all database operations. Configure it properly for async support.

### Basic Configuration

This configuration creates an async engine with connection pooling optimized for production use.

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database connection string for async PostgreSQL
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/myapp"

    # Connection pool settings
    db_pool_size: int = 5           # Number of connections to keep open
    db_max_overflow: int = 10       # Extra connections allowed during peak load
    db_pool_timeout: int = 30       # Seconds to wait for available connection
    db_pool_recycle: int = 1800     # Recycle connections after 30 minutes

    # Echo SQL statements for debugging (disable in production)
    db_echo: bool = False

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Cache settings to avoid reading env file on every request."""
    return Settings()
```

### Creating the Async Engine

The async engine manages the connection pool and handles all database communication.

```python
# app/database.py
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()


# Create the async engine with connection pooling
# The engine is created once and reused throughout the application lifecycle
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    # Connection pool configuration
    pool_size=settings.db_pool_size,          # Permanent connections in pool
    max_overflow=settings.db_max_overflow,     # Temporary connections during spikes
    pool_timeout=settings.db_pool_timeout,     # Wait time for connection
    pool_recycle=settings.db_pool_recycle,     # Prevent stale connections
    pool_pre_ping=True,                        # Verify connection before use
    # SQL logging for debugging
    echo=settings.db_echo,
)


# Create async session factory
# expire_on_commit=False prevents attribute access errors after commit
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,        # Keep data accessible after commit
    autocommit=False,              # Require explicit commits
    autoflush=False,               # Manual control over flushing
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass
```

---

## Connection Pool Architecture

Understanding connection pooling is crucial for async database performance.

```mermaid
flowchart TB
    subgraph Application
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
        R4[Request 4]
    end

    subgraph ConnectionPool["Connection Pool (pool_size=3, max_overflow=2)"]
        C1[Connection 1<br/>Permanent]
        C2[Connection 2<br/>Permanent]
        C3[Connection 3<br/>Permanent]
        C4[Connection 4<br/>Overflow]
        C5[Connection 5<br/>Overflow]
    end

    subgraph Database
        DB[(PostgreSQL)]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4

    C1 --> DB
    C2 --> DB
    C3 --> DB
    C4 --> DB
    C5 -.-> DB

    style C4 stroke-dasharray: 5 5
    style C5 stroke-dasharray: 5 5
```

### Pool Configuration Guidelines

Choose pool settings based on your workload and database capacity.

```python
# app/database.py - Extended configuration

def calculate_pool_settings(
    expected_concurrent_requests: int,
    db_max_connections: int = 100,
) -> dict:
    """
    Calculate optimal pool settings based on expected load.

    PostgreSQL default max_connections is usually 100.
    Leave room for admin connections and other services.
    """
    # Reserve 20% of connections for admin and monitoring
    available_connections = int(db_max_connections * 0.8)

    # Base pool size handles average load
    pool_size = min(expected_concurrent_requests // 2, available_connections // 2)
    pool_size = max(pool_size, 5)  # Minimum 5 connections

    # Overflow handles traffic spikes
    max_overflow = min(pool_size, available_connections - pool_size)

    return {
        "pool_size": pool_size,
        "max_overflow": max_overflow,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }


# Example: Configure for 200 concurrent requests with 100 max DB connections
pool_config = calculate_pool_settings(
    expected_concurrent_requests=200,
    db_max_connections=100,
)

# Result: pool_size=40, max_overflow=40
```

---

## Creating Async Database Models

Define your database models using SQLAlchemy 2.0's declarative syntax with type annotations.

### User Model Example

This model demonstrates modern SQLAlchemy 2.0 patterns with proper type hints and relationships.

```python
# app/models/user.py
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    """User model with async-compatible relationships."""

    __tablename__ = "users"

    # Primary key with auto-increment
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Required fields with constraints
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,      # Index for faster lookups
        nullable=False,
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    # Password hash - never store plain text passwords
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional fields with defaults
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps for auditing
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        onupdate=datetime.utcnow,
        nullable=True,
    )

    # Relationship to posts - lazy="selectin" works well with async
    posts: Mapped[List["Post"]] = relationship(
        "Post",
        back_populates="author",
        lazy="selectin",        # Async-compatible eager loading
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Post(Base):
    """Post model demonstrating relationships."""

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=False)

    # Foreign key to user
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationship back to user
    author: Mapped["User"] = relationship("User", back_populates="posts")

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
```

---

## Session Management with Dependency Injection

Proper session management prevents connection leaks and ensures data consistency.

### The Session Dependency

FastAPI dependencies provide clean session lifecycle management.

```python
# app/database.py - Add session dependency

from typing import AsyncGenerator
from contextlib import asynccontextmanager


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for each request.

    The session is automatically closed when the request completes,
    even if an exception occurs. This prevents connection leaks.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            # Rollback on any exception to maintain data integrity
            await session.rollback()
            raise
        finally:
            # Session is automatically closed by the context manager
            pass


@asynccontextmanager
async def get_db_session_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for use outside of FastAPI requests.

    Useful for background tasks, CLI commands, and tests.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### Session Lifecycle Flow

```mermaid
flowchart TD
    A[Request Arrives] --> B[Create Session]
    B --> C[Execute Database Operations]
    C --> D{Success?}
    D -->|Yes| E[Commit Transaction]
    D -->|No| F[Rollback Transaction]
    E --> G[Close Session]
    F --> G
    G --> H[Return Response]

    style D fill:#ffeb3b
    style E fill:#4caf50
    style F fill:#f44336
```

---

## Implementing Async CRUD Operations

Create a repository layer that encapsulates all database operations.

### Base Repository Pattern

A generic repository provides reusable async CRUD operations for any model.

```python
# app/repositories/base.py
from typing import TypeVar, Generic, Type, Optional, List, Any
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import Base

# Type variable for model classes
ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic async repository with CRUD operations.

    Inherit from this class and specify the model type
    to get type-safe database operations.
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def create(self, **kwargs) -> ModelType:
        """
        Create a new record in the database.

        The record is added to the session but not committed.
        Call session.commit() after all operations are complete.
        """
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()      # Get the ID without committing
        await self.session.refresh(instance)  # Reload with DB defaults
        return instance

    async def get_by_id(self, id: int) -> Optional[ModelType]:
        """
        Retrieve a single record by its primary key.

        Returns None if no record is found.
        """
        query = select(self.model).where(self.model.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ModelType]:
        """
        Retrieve multiple records with pagination.

        Always use pagination to prevent loading huge result sets.
        """
        query = (
            select(self.model)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.id)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        id: int,
        **kwargs,
    ) -> Optional[ModelType]:
        """
        Update a record by ID with the provided fields.

        Only non-None values are updated.
        Returns the updated record or None if not found.
        """
        # Filter out None values to allow partial updates
        update_data = {k: v for k, v in kwargs.items() if v is not None}

        if not update_data:
            return await self.get_by_id(id)

        query = (
            update(self.model)
            .where(self.model.id == id)
            .values(**update_data)
            .returning(self.model)
        )
        result = await self.session.execute(query)
        await self.session.flush()
        return result.scalar_one_or_none()

    async def delete(self, id: int) -> bool:
        """
        Delete a record by ID.

        Returns True if a record was deleted, False otherwise.
        """
        query = delete(self.model).where(self.model.id == id)
        result = await self.session.execute(query)
        await self.session.flush()
        return result.rowcount > 0

    async def count(self) -> int:
        """Get total count of records."""
        query = select(func.count()).select_from(self.model)
        result = await self.session.execute(query)
        return result.scalar_one()

    async def exists(self, id: int) -> bool:
        """Check if a record exists by ID."""
        query = select(
            select(self.model.id).where(self.model.id == id).exists()
        )
        result = await self.session.execute(query)
        return result.scalar()
```

### User Repository

Extend the base repository with user-specific operations.

```python
# app/repositories/user.py
from typing import Optional, List
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.user import User, Post
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """
    User-specific repository with additional query methods.
    """

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Find a user by email address.

        Email lookup is indexed for fast performance.
        """
        query = select(User).where(User.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Find a user by username."""
        query = select(User).where(User.username == username)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email_or_username(
        self,
        email: str,
        username: str,
    ) -> Optional[User]:
        """
        Find a user by email OR username.

        Useful for checking uniqueness during registration.
        """
        query = select(User).where(
            or_(User.email == email, User.username == username)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_with_posts(self, user_id: int) -> Optional[User]:
        """
        Get a user with their posts eagerly loaded.

        Uses selectinload for efficient async loading of relationships.
        """
        query = (
            select(User)
            .options(selectinload(User.posts))
            .where(User.id == user_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_active_users(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """Get all active users with pagination."""
        query = (
            select(User)
            .where(User.is_active == True)
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def search_users(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 20,
    ) -> List[User]:
        """
        Search users by email or username.

        Uses ILIKE for case-insensitive partial matching.
        """
        search_pattern = f"%{search_term}%"
        query = (
            select(User)
            .where(
                or_(
                    User.email.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                    User.full_name.ilike(search_pattern),
                )
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
```

---

## Building Async API Endpoints

Connect the repository layer to FastAPI routes with proper async handling.

### Pydantic Schemas

Define request and response schemas for validation and serialization.

```python
# app/schemas/user.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    """Base schema with common user fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user - all fields optional."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user responses - excludes password."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserWithPostsResponse(UserResponse):
    """User response including their posts."""
    posts: List["PostResponse"] = []


class PostResponse(BaseModel):
    """Schema for post responses."""
    id: int
    title: str
    content: str
    published: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Update forward reference
UserWithPostsResponse.model_rebuild()
```

### User Router

Implement async endpoints with proper error handling.

```python
# app/routers/users.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db_session
from app.repositories.user import UserRepository
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserWithPostsResponse,
)
from passlib.context import CryptContext

router = APIRouter(prefix="/users", tags=["users"])

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserRepository:
    """Dependency that provides a UserRepository instance."""
    return UserRepository(session)


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user_data: UserCreate,
    repo: UserRepository = Depends(get_user_repository),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new user account.

    - Validates email and username uniqueness
    - Hashes password before storage
    - Returns created user without password
    """
    # Check for existing user with same email or username
    existing = await repo.get_by_email_or_username(
        user_data.email,
        user_data.username,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    # Hash the password
    hashed_password = pwd_context.hash(user_data.password)

    # Create the user
    user = await repo.create(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
    )

    # Commit the transaction
    await session.commit()

    return user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    active_only: bool = Query(False, description="Filter to active users only"),
    repo: UserRepository = Depends(get_user_repository),
):
    """
    List users with pagination.

    - Supports pagination with skip and limit
    - Optional filter for active users only
    """
    if active_only:
        users = await repo.get_active_users(skip=skip, limit=limit)
    else:
        users = await repo.get_all(skip=skip, limit=limit)

    return users


@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=2, description="Search term"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    repo: UserRepository = Depends(get_user_repository),
):
    """
    Search users by email, username, or full name.

    - Case-insensitive partial matching
    - Minimum 2 characters required
    """
    users = await repo.search_users(q, skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repository),
):
    """Get a user by ID."""
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/{user_id}/with-posts", response_model=UserWithPostsResponse)
async def get_user_with_posts(
    user_id: int,
    repo: UserRepository = Depends(get_user_repository),
):
    """
    Get a user with their posts.

    Uses eager loading to fetch posts in a single query.
    """
    user = await repo.get_with_posts(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    repo: UserRepository = Depends(get_user_repository),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update a user's information.

    - Only provided fields are updated
    - Validates email/username uniqueness if changed
    """
    # Check if user exists
    existing_user = await repo.get_by_id(user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check uniqueness if email or username is being changed
    if user_data.email or user_data.username:
        conflict = await repo.get_by_email_or_username(
            user_data.email or "",
            user_data.username or "",
        )
        if conflict and conflict.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already taken",
            )

    # Perform update
    updated_user = await repo.update(
        user_id,
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        is_active=user_data.is_active,
    )

    await session.commit()

    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repository),
    session: AsyncSession = Depends(get_db_session),
):
    """Delete a user and their associated data."""
    deleted = await repo.delete(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await session.commit()
```

---

## Transaction Management

Proper transaction handling ensures data consistency in async operations.

### Explicit Transaction Control

Use explicit transactions for complex operations that span multiple queries.

```python
# app/services/user_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user import UserRepository
from app.models.user import User, Post


class UserService:
    """
    Service layer for complex user operations.

    Handles transactions that span multiple repository calls.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def create_user_with_welcome_post(
        self,
        email: str,
        username: str,
        hashed_password: str,
    ) -> User:
        """
        Create a user and their welcome post atomically.

        If either operation fails, both are rolled back.
        """
        async with self.session.begin():
            # Create user
            user = await self.user_repo.create(
                email=email,
                username=username,
                hashed_password=hashed_password,
            )

            # Create welcome post
            welcome_post = Post(
                title=f"Welcome {username}!",
                content="This is your first post. Start writing!",
                author_id=user.id,
                published=True,
            )
            self.session.add(welcome_post)

            # Transaction commits automatically on exit
            # or rolls back on exception

        # Refresh to get the complete user with posts
        await self.session.refresh(user, ["posts"])
        return user

    async def transfer_posts(
        self,
        from_user_id: int,
        to_user_id: int,
    ) -> int:
        """
        Transfer all posts from one user to another.

        Uses a single transaction to ensure consistency.
        Returns the number of posts transferred.
        """
        async with self.session.begin():
            # Verify both users exist
            from_user = await self.user_repo.get_by_id(from_user_id)
            to_user = await self.user_repo.get_by_id(to_user_id)

            if not from_user or not to_user:
                raise ValueError("One or both users not found")

            # Get posts with FOR UPDATE to lock rows
            from sqlalchemy import select, update

            # Update all posts in a single query
            result = await self.session.execute(
                update(Post)
                .where(Post.author_id == from_user_id)
                .values(author_id=to_user_id)
            )

            return result.rowcount

    async def bulk_deactivate_users(
        self,
        user_ids: list[int],
    ) -> int:
        """
        Deactivate multiple users in a single transaction.

        More efficient than updating one at a time.
        """
        from sqlalchemy import update

        async with self.session.begin():
            result = await self.session.execute(
                update(User)
                .where(User.id.in_(user_ids))
                .values(is_active=False)
            )
            return result.rowcount
```

### Nested Transaction Support

Use savepoints for partial rollbacks within a transaction.

```python
# Using savepoints for nested transactions
async def process_batch_with_savepoints(
    session: AsyncSession,
    items: list[dict],
) -> tuple[int, list[str]]:
    """
    Process items with individual savepoints.

    Failed items are rolled back individually,
    successful items are preserved.
    """
    success_count = 0
    errors = []

    async with session.begin():
        for item in items:
            # Create a savepoint for each item
            savepoint = await session.begin_nested()
            try:
                # Process item
                await process_single_item(session, item)
                await savepoint.commit()
                success_count += 1
            except Exception as e:
                # Rollback just this item
                await savepoint.rollback()
                errors.append(f"Item {item['id']}: {str(e)}")

        # Main transaction commits all successful items

    return success_count, errors
```

---

## Handling Relationships Efficiently

Loading related data asynchronously requires specific strategies to avoid the N+1 problem.

### Loading Strategies Comparison

```mermaid
flowchart LR
    subgraph LazyLoad["Lazy Loading (N+1 Problem)"]
        Q1[Query Users] --> R1[5 Users]
        R1 --> Q2[Query Posts User 1]
        R1 --> Q3[Query Posts User 2]
        R1 --> Q4[Query Posts User 3]
        R1 --> Q5[Query Posts User 4]
        R1 --> Q6[Query Posts User 5]
    end

    subgraph EagerLoad["Eager Loading (Optimized)"]
        QA[Query Users<br/>+ Posts] --> RA[5 Users<br/>with Posts]
    end

    style LazyLoad fill:#ffcdd2
    style EagerLoad fill:#c8e6c9
```

### Async-Safe Loading Options

Configure relationships and queries for efficient async loading.

```python
# app/repositories/user.py - Extended with relationship loading

from sqlalchemy.orm import selectinload, joinedload, subqueryload


class UserRepository(BaseRepository[User]):
    """Repository with various relationship loading strategies."""

    async def get_users_with_posts_selectin(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """
        Load users with posts using selectinload.

        Best for: Loading collections (one-to-many)
        Executes: 2 queries (users + posts with IN clause)
        """
        query = (
            select(User)
            .options(selectinload(User.posts))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_users_with_posts_joined(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """
        Load users with posts using joinedload.

        Best for: Loading single related objects (many-to-one)
        Executes: 1 query with JOIN
        Warning: Can create large result sets with collections
        """
        query = (
            select(User)
            .options(joinedload(User.posts))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        # unique() is required with joinedload to deduplicate
        return list(result.unique().scalars().all())

    async def get_posts_with_authors(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Post]:
        """
        Load posts with their authors.

        joinedload is efficient for many-to-one relationships.
        """
        query = (
            select(Post)
            .options(joinedload(Post.author))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_user_with_nested_relations(
        self,
        user_id: int,
    ) -> Optional[User]:
        """
        Load user with deeply nested relationships.

        Chains loading strategies for nested relations.
        """
        query = (
            select(User)
            .options(
                selectinload(User.posts).selectinload(Post.comments),
                selectinload(User.followers),
            )
            .where(User.id == user_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
```

---

## Connection Health and Lifecycle Management

Properly manage database connections during application startup and shutdown.

### Application Lifecycle Events

Configure connection management in your FastAPI application.

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import engine, Base
from app.routers import users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle events.

    - Startup: Initialize database tables (dev only)
    - Shutdown: Clean up database connections
    """
    # Startup
    print("Starting up...")

    # Create tables in development (use migrations in production)
    async with engine.begin() as conn:
        # Uncomment to auto-create tables during development
        # await conn.run_sync(Base.metadata.create_all)
        pass

    # Verify database connectivity
    async with engine.connect() as conn:
        await conn.execute("SELECT 1")
        print("Database connection verified")

    yield

    # Shutdown
    print("Shutting down...")

    # Dispose of connection pool
    await engine.dispose()
    print("Database connections closed")


app = FastAPI(
    title="Async Database API",
    version="1.0.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(users.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """
    Health check endpoint for load balancers.

    Verifies database connectivity.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
```

### Connection Pool Monitoring

Monitor pool health for production observability.

```python
# app/monitoring.py
from sqlalchemy import event
from sqlalchemy.pool import Pool
import logging

logger = logging.getLogger(__name__)


def setup_pool_monitoring(engine):
    """
    Set up connection pool event listeners for monitoring.

    Logs pool events and can emit metrics to monitoring systems.
    """

    @event.listens_for(Pool, "connect")
    def on_connect(dbapi_conn, connection_record):
        """Called when a new connection is created."""
        logger.info("New database connection created")

    @event.listens_for(Pool, "checkout")
    def on_checkout(dbapi_conn, connection_record, connection_proxy):
        """Called when a connection is retrieved from the pool."""
        logger.debug("Connection checked out from pool")

    @event.listens_for(Pool, "checkin")
    def on_checkin(dbapi_conn, connection_record):
        """Called when a connection is returned to the pool."""
        logger.debug("Connection returned to pool")

    @event.listens_for(Pool, "reset")
    def on_reset(dbapi_conn, connection_record):
        """Called when a connection is reset before being returned."""
        logger.debug("Connection reset")


async def get_pool_stats(engine) -> dict:
    """
    Get current connection pool statistics.

    Useful for monitoring dashboards and alerts.
    """
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalidatedcount if hasattr(pool, 'invalidatedcount') else 0,
    }
```

---

## Performance Best Practices

Optimize your async database operations for production workloads.

### 1. Use Bulk Operations

Batch inserts and updates are significantly faster than individual operations.

```python
# Bulk insert example
async def bulk_create_users(
    session: AsyncSession,
    users_data: list[dict],
) -> int:
    """
    Insert multiple users in a single statement.

    Much faster than inserting one at a time.
    """
    from sqlalchemy import insert

    result = await session.execute(
        insert(User),
        users_data,
    )
    await session.commit()
    return result.rowcount


# Bulk update example
async def bulk_update_status(
    session: AsyncSession,
    user_ids: list[int],
    is_active: bool,
) -> int:
    """Update multiple users in a single query."""
    from sqlalchemy import update

    result = await session.execute(
        update(User)
        .where(User.id.in_(user_ids))
        .values(is_active=is_active)
    )
    await session.commit()
    return result.rowcount
```

### 2. Use Read Replicas

Separate read and write operations for scalability.

```python
# app/database.py - Multiple engines for read/write splitting

write_engine = create_async_engine(
    settings.database_url,
    pool_size=10,
)

read_engine = create_async_engine(
    settings.read_replica_url,
    pool_size=20,  # More connections for reads
)

write_session_factory = async_sessionmaker(write_engine)
read_session_factory = async_sessionmaker(read_engine)


async def get_write_session() -> AsyncGenerator[AsyncSession, None]:
    """Session for write operations."""
    async with write_session_factory() as session:
        yield session


async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    """Session for read-only operations."""
    async with read_session_factory() as session:
        yield session
```

### 3. Implement Query Timeouts

Prevent long-running queries from blocking connections.

```python
# Query with timeout
from sqlalchemy import text

async def query_with_timeout(
    session: AsyncSession,
    query: str,
    timeout_seconds: int = 30,
):
    """
    Execute a query with a timeout.

    Prevents runaway queries from consuming connections.
    """
    # Set statement timeout (PostgreSQL)
    await session.execute(
        text(f"SET statement_timeout = '{timeout_seconds * 1000}'")
    )

    try:
        result = await session.execute(text(query))
        return result.fetchall()
    finally:
        # Reset timeout
        await session.execute(text("SET statement_timeout = '0'"))
```

### 4. Index Your Queries

Ensure frequently queried columns are indexed.

```python
# app/models/user.py - Proper indexing

from sqlalchemy import Index

class User(Base):
    __tablename__ = "users"

    # ... columns ...

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_users_active_created", "is_active", "created_at"),
        Index("ix_users_email_lower", text("lower(email)")),  # Functional index
    )
```

---

## Testing Async Database Code

Write reliable tests for your async database operations.

### Test Configuration

Set up an isolated test database with automatic cleanup.

```python
# tests/conftest.py
import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from app.database import Base
from app.main import app
from app.database import get_db_session
from httpx import AsyncClient


# Use SQLite for fast tests (or separate PostgreSQL test database)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

test_session_factory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database for each test.

    Tables are created before the test and dropped after.
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Provide session
    async with test_session_factory() as session:
        yield session

    # Drop tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test client with overridden database session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
```

### Writing Async Tests

Test your repository and endpoint code.

```python
# tests/test_users.py
import pytest
from app.repositories.user import UserRepository
from app.models.user import User


class TestUserRepository:
    """Tests for UserRepository."""

    @pytest.mark.asyncio
    async def test_create_user(self, db_session):
        """Test creating a new user."""
        repo = UserRepository(db_session)

        user = await repo.create(
            email="test@example.com",
            username="testuser",
            hashed_password="hashedpassword123",
        )
        await db_session.commit()

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_get_by_email(self, db_session):
        """Test finding user by email."""
        repo = UserRepository(db_session)

        # Create user
        await repo.create(
            email="find@example.com",
            username="findme",
            hashed_password="hashedpassword123",
        )
        await db_session.commit()

        # Find by email
        found = await repo.get_by_email("find@example.com")

        assert found is not None
        assert found.username == "findme"

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, db_session):
        """Test email lookup returns None when not found."""
        repo = UserRepository(db_session)

        found = await repo.get_by_email("nonexistent@example.com")

        assert found is None


class TestUserEndpoints:
    """Tests for user API endpoints."""

    @pytest.mark.asyncio
    async def test_create_user_endpoint(self, client):
        """Test POST /api/v1/users creates a user."""
        response = await client.post(
            "/api/v1/users/",
            json={
                "email": "new@example.com",
                "username": "newuser",
                "password": "securepassword123",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_create_duplicate_email(self, client):
        """Test duplicate email returns 400."""
        user_data = {
            "email": "duplicate@example.com",
            "username": "user1",
            "password": "password123",
        }

        # Create first user
        await client.post("/api/v1/users/", json=user_data)

        # Try duplicate email
        user_data["username"] = "user2"
        response = await client.post("/api/v1/users/", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
```

---

## Common Pitfalls and Solutions

Avoid these common mistakes when working with async database connections.

### Pitfall 1: Synchronous Operations in Async Code

Never use synchronous database operations in async contexts.

```python
# BAD: This blocks the event loop
from sqlalchemy import create_engine
sync_engine = create_engine(DATABASE_URL)

async def bad_endpoint():
    with sync_engine.connect() as conn:  # Blocks!
        result = conn.execute(query)
    return result

# GOOD: Use async engine and session
async def good_endpoint(session: AsyncSession = Depends(get_db_session)):
    result = await session.execute(query)
    return result
```

### Pitfall 2: Lazy Loading in Async Context

Lazy loading does not work with async sessions.

```python
# BAD: Lazy loading fails in async
user = await session.get(User, 1)
posts = user.posts  # Raises error!

# GOOD: Use eager loading
query = select(User).options(selectinload(User.posts)).where(User.id == 1)
result = await session.execute(query)
user = result.scalar_one()
posts = user.posts  # Works!
```

### Pitfall 3: Session Scope Issues

Do not share sessions across requests or tasks.

```python
# BAD: Shared session causes race conditions
global_session = async_session_factory()

async def endpoint1():
    await global_session.execute(query1)

async def endpoint2():
    await global_session.execute(query2)  # Conflicts!

# GOOD: Create session per request
async def endpoint(session: AsyncSession = Depends(get_db_session)):
    await session.execute(query)
```

### Pitfall 4: Missing Commits

Async sessions require explicit commits.

```python
# BAD: Changes are never saved
async def create_user(session: AsyncSession):
    user = User(email="test@example.com")
    session.add(user)
    return user  # Not committed!

# GOOD: Explicit commit
async def create_user(session: AsyncSession):
    user = User(email="test@example.com")
    session.add(user)
    await session.commit()
    return user
```

---

## Conclusion

Async database connections in FastAPI provide significant performance benefits for high-throughput applications. Key takeaways:

- **Use SQLAlchemy 2.0+** with asyncpg for PostgreSQL async support
- **Configure connection pools** based on your workload and database limits
- **Use dependency injection** for clean session lifecycle management
- **Choose the right loading strategy** to avoid N+1 queries
- **Handle transactions explicitly** for data consistency
- **Test thoroughly** with isolated async test fixtures

With proper async database patterns, your FastAPI application can handle thousands of concurrent connections efficiently.

---

*Need to monitor your FastAPI database performance in production? [OneUptime](https://oneuptime.com) provides real-time monitoring for API latency, database query performance, and connection pool health.*

**Related Reading:**
- [How to Build REST APIs with FastAPI and SQLAlchemy](https://oneuptime.com/blog/post/2026-01-27-sqlalchemy-fastapi/view)
- [How to Implement Rate Limiting in FastAPI Without External Services](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
