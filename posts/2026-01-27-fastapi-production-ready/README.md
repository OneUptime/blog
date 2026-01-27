# How to Build Production-Ready FastAPI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Production, API Development, Backend, Async, Testing, DevOps

Description: A comprehensive guide to building production-ready FastAPI applications covering project structure, configuration management, error handling, database integration, testing strategies, and deployment best practices.

---

> Building a FastAPI application is easy. Building one that survives production traffic, handles failures gracefully, and scales reliably is a different challenge entirely. This guide takes you from prototype to production-grade application.

FastAPI has become the go-to framework for building Python APIs. Its speed, type safety, and automatic documentation make development enjoyable. But shipping to production requires more than just working endpoints.

---

## Architecture Overview

Before diving into code, let's understand the architecture of a production-ready FastAPI application:

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Client]
        B[Mobile App]
        C[Third-party Services]
    end

    subgraph "Load Balancer"
        D[Nginx / Traefik]
    end

    subgraph "Application Layer"
        E[FastAPI Worker 1]
        F[FastAPI Worker 2]
        G[FastAPI Worker N]
    end

    subgraph "Data Layer"
        H[(PostgreSQL)]
        I[(Redis Cache)]
        J[(Message Queue)]
    end

    subgraph "Observability"
        K[Logging]
        L[Metrics]
        M[Traces]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    D --> G
    E --> H
    E --> I
    E --> J
    F --> H
    F --> I
    F --> J
    G --> H
    G --> I
    G --> J
    E --> K
    E --> L
    E --> M
```

---

## Project Structure Best Practices

A well-organized project structure makes maintenance easier and onboarding faster. Here's a battle-tested layout:

```
# Production-ready FastAPI project structure
# Organizes code by feature/domain for better maintainability

myapp/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Shared dependencies
│   │
│   ├── api/                 # API routes organized by version
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py    # Main v1 router
│   │   │   ├── users.py     # User endpoints
│   │   │   ├── items.py     # Item endpoints
│   │   │   └── health.py    # Health check endpoints
│   │   └── v2/
│   │       └── ...
│   │
│   ├── core/                # Core business logic
│   │   ├── __init__.py
│   │   ├── security.py      # Authentication/authorization
│   │   ├── exceptions.py    # Custom exceptions
│   │   └── middleware.py    # Custom middleware
│   │
│   ├── models/              # Database models (SQLAlchemy/SQLModel)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   │
│   ├── schemas/             # Pydantic schemas for validation
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   │
│   ├── services/            # Business logic layer
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   └── item_service.py
│   │
│   ├── repositories/        # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── user_repository.py
│   │
│   └── utils/               # Utility functions
│       ├── __init__.py
│       └── helpers.py
│
├── tests/                   # Test suite
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── alembic/                 # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/                 # Deployment and utility scripts
├── docker/                  # Docker configurations
├── .env.example             # Environment variable template
├── pyproject.toml           # Project dependencies (Poetry)
├── Dockerfile
└── docker-compose.yml
```

### Application Entry Point

```python
# app/main.py
# Main application entry point with proper lifecycle management

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.api.v1.router import api_router
from app.core.middleware import (
    RequestIdMiddleware,
    LoggingMiddleware,
    ExceptionHandlerMiddleware,
)
from app.core.exceptions import setup_exception_handlers
from app.db.session import engine, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.
    Handles startup and shutdown events.
    """
    # Startup: Initialize resources
    await init_db()
    print(f"Application started in {settings.ENVIRONMENT} mode")

    yield  # Application runs here

    # Shutdown: Clean up resources
    await engine.dispose()
    print("Application shutdown complete")


def create_application() -> FastAPI:
    """
    Application factory pattern.
    Creates and configures the FastAPI application.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
        if settings.ENVIRONMENT != "production"
        else None,  # Disable OpenAPI in production if needed
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # Add middleware (order matters - first added = last executed)
    app.add_middleware(ExceptionHandlerMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Setup exception handlers
    setup_exception_handlers(app)

    # Include API routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


# Create the application instance
app = create_application()
```

---

## Configuration Management

Configuration is critical for production applications. Use environment variables with validation:

```python
# app/config.py
# Centralized configuration with validation using Pydantic Settings

from functools import lru_cache
from typing import List, Optional
from pydantic import Field, field_validator, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses Pydantic for validation and type coercion.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application settings
    PROJECT_NAME: str = "MyApp API"
    PROJECT_DESCRIPTION: str = "Production-ready FastAPI application"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = False

    # API settings
    API_V1_PREFIX: str = "/api/v1"

    # Security settings
    SECRET_KEY: str = Field(..., min_length=32)  # Required, minimum 32 chars
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Database settings
    DATABASE_URL: PostgresDsn
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 1800  # 30 minutes

    # Redis settings (optional)
    REDIS_URL: Optional[str] = None
    REDIS_POOL_SIZE: int = 10

    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "text"

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    @property
    def database_url_sync(self) -> str:
        """Return synchronous database URL for Alembic."""
        return str(self.DATABASE_URL).replace(
            "postgresql+asyncpg://", "postgresql://"
        )


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Use dependency injection instead of direct import for testability.
    """
    return Settings()


# Global settings instance
settings = get_settings()
```

### Environment File Template

```bash
# .env.example
# Copy to .env and fill in values

# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-super-secret-key-minimum-32-characters

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/myapp

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=text
```

---

## Error Handling and Logging

Proper error handling and structured logging are essential for debugging production issues:

```mermaid
flowchart TD
    A[Request] --> B{Validation Error?}
    B -->|Yes| C[422 Unprocessable Entity]
    B -->|No| D{Business Logic Error?}
    D -->|Yes| E[4xx Client Error]
    D -->|No| F{Database Error?}
    F -->|Yes| G[503 Service Unavailable]
    F -->|No| H{Unexpected Error?}
    H -->|Yes| I[500 Internal Server Error]
    H -->|No| J[200 Success Response]

    C --> K[Log Warning]
    E --> K
    G --> L[Log Error + Alert]
    I --> L
    J --> M[Log Info]
```

### Custom Exceptions

```python
# app/core/exceptions.py
# Custom exception classes with consistent error responses

from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    """
    Base exception for application errors.
    All custom exceptions should inherit from this.
    """

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": str(identifier)},
        )


class ConflictError(AppException):
    """Resource conflict error (e.g., duplicate entry)."""

    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class UnauthorizedError(AppException):
    """Authentication required error."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(AppException):
    """Permission denied error."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ValidationError(AppException):
    """Business logic validation error."""

    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ServiceUnavailableError(AppException):
    """External service unavailable error."""

    def __init__(self, service: str, message: Optional[str] = None):
        super().__init__(
            message=message or f"{service} is currently unavailable",
            code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"service": service},
        )


def create_error_response(
    request_id: str,
    code: str,
    message: str,
    status_code: int,
    details: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Create standardized error response format."""
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": request_id,
        }
    }


def setup_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers with the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handle custom application exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                request_id=request_id,
                code=exc.code,
                message=exc.message,
                status_code=exc.status_code,
                details=exc.details,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        """Handle Pydantic validation errors."""
        request_id = getattr(request.state, "request_id", "unknown")

        # Format validation errors
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=create_error_response(
                request_id=request_id,
                code="VALIDATION_ERROR",
                message="Request validation failed",
                status_code=422,
                details={"errors": errors},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ):
        """Handle Starlette HTTP exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                request_id=request_id,
                code="HTTP_ERROR",
                message=str(exc.detail),
                status_code=exc.status_code,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Handle unhandled exceptions - catch-all handler."""
        request_id = getattr(request.state, "request_id", "unknown")

        # Log the full exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Unhandled exception: {exc}", extra={
            "request_id": request_id,
            "path": request.url.path,
        })

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=create_error_response(
                request_id=request_id,
                code="INTERNAL_ERROR",
                message="An unexpected error occurred",
                status_code=500,
            ),
        )
```

### Structured Logging

```python
# app/core/logging.py
# Structured logging configuration for production

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
from pythonjsonlogger import jsonlogger

from app.config import settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter for structured logging.
    Adds consistent fields to all log entries.
    """

    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)

        # Add standard fields
        log_record["timestamp"] = datetime.utcnow().isoformat() + "Z"
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["service"] = settings.PROJECT_NAME
        log_record["environment"] = settings.ENVIRONMENT

        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)


def setup_logging() -> None:
    """Configure application logging based on environment."""

    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    # Remove existing handlers
    root_logger.handlers = []

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)

    if settings.LOG_FORMAT == "json":
        # JSON format for production (structured logging)
        formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s"
        )
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Set third-party loggers to WARNING
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name."""
    return logging.getLogger(name)


# Usage example in your code:
# logger = get_logger(__name__)
# logger.info("User created", extra={"user_id": user.id, "email": user.email})
```

### Request Logging Middleware

```python
# app/core/middleware.py
# Custom middleware for request tracking and logging

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Adds a unique request ID to each request.
    Enables request tracing across services.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get request ID from header or generate new one
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store in request state for access in handlers
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all requests with timing information.
    Enables request monitoring and debugging.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.perf_counter()

        # Get request ID
        request_id = getattr(request.state, "request_id", "unknown")

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log request details
        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        return response


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    """
    Catches and logs unhandled exceptions.
    Ensures no exception escapes without logging.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")

            logger.exception(
                "Unhandled exception in middleware",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                },
            )

            # Re-raise to let the exception handler deal with it
            raise
```

---

## Database Integration Patterns

Production applications need robust database handling with connection pooling and async support:

```mermaid
graph LR
    subgraph "Application"
        A[Request Handler]
        B[Service Layer]
        C[Repository Layer]
    end

    subgraph "Database Access"
        D[Session Factory]
        E[Connection Pool]
    end

    subgraph "Database"
        F[(PostgreSQL)]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
```

### Async Database Session

```python
# app/db/session.py
# Async database session management with proper connection pooling

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.pool import NullPool, QueuePool

from app.config import settings


# Create async engine with connection pooling
engine = create_async_engine(
    str(settings.DATABASE_URL),
    # Use QueuePool for production, NullPool for testing
    poolclass=QueuePool if settings.ENVIRONMENT != "test" else NullPool,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.DEBUG,  # Log SQL in debug mode
)

# Create session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    Properly handles commit/rollback and session cleanup.
    """
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def init_db() -> None:
    """Initialize database (create tables, etc.)."""
    from app.models import Base

    async with engine.begin() as conn:
        # In production, use Alembic migrations instead
        if settings.ENVIRONMENT == "development":
            await conn.run_sync(Base.metadata.create_all)
```

### Repository Pattern

```python
# app/repositories/base.py
# Generic repository base class for data access

from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository providing common CRUD operations.
    Inherit from this class for specific model repositories.
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        """Get a single record by ID."""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ModelType]:
        """Get all records with pagination."""
        result = await self.session.execute(
            select(self.model)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        """Get total count of records."""
        result = await self.session.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar() or 0

    async def create(self, obj_data: dict) -> ModelType:
        """Create a new record."""
        db_obj = self.model(**obj_data)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(
        self,
        id: Any,
        obj_data: dict,
    ) -> Optional[ModelType]:
        """Update an existing record."""
        await self.session.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**obj_data)
        )
        return await self.get_by_id(id)

    async def delete(self, id: Any) -> bool:
        """Delete a record by ID."""
        result = await self.session.execute(
            delete(self.model).where(self.model.id == id)
        )
        return result.rowcount > 0


# app/repositories/user_repository.py
# User-specific repository with custom queries

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_active_users(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        """Get all active users."""
        result = await self.session.execute(
            select(User)
            .where(User.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        user = await self.get_by_email(email)
        return user is not None
```

### Service Layer

```python
# app/services/user_service.py
# Business logic layer that uses repositories

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.repositories.user_repository import UserRepository
from app.core.exceptions import NotFoundError, ConflictError
from app.core.security import hash_password, verify_password


class UserService:
    """
    User service containing business logic.
    Coordinates between repositories and handles complex operations.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = UserRepository(session)

    async def get_user(self, user_id: int) -> User:
        """Get user by ID or raise NotFoundError."""
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def get_users(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """Get paginated list of users."""
        return await self.repository.get_all(skip=skip, limit=limit)

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with validation."""
        # Check if email already exists
        if await self.repository.email_exists(user_data.email):
            raise ConflictError(
                message="Email already registered",
                details={"email": user_data.email},
            )

        # Hash password before storing
        user_dict = user_data.model_dump()
        user_dict["hashed_password"] = hash_password(user_dict.pop("password"))

        return await self.repository.create(user_dict)

    async def update_user(
        self,
        user_id: int,
        user_data: UserUpdate,
    ) -> User:
        """Update user with validation."""
        # Verify user exists
        existing_user = await self.get_user(user_id)

        # Check email uniqueness if changing
        if user_data.email and user_data.email != existing_user.email:
            if await self.repository.email_exists(user_data.email):
                raise ConflictError(
                    message="Email already registered",
                    details={"email": user_data.email},
                )

        # Only update provided fields
        update_dict = user_data.model_dump(exclude_unset=True)

        # Hash password if provided
        if "password" in update_dict:
            update_dict["hashed_password"] = hash_password(
                update_dict.pop("password")
            )

        return await self.repository.update(user_id, update_dict)

    async def delete_user(self, user_id: int) -> bool:
        """Delete user by ID."""
        # Verify user exists
        await self.get_user(user_id)
        return await self.repository.delete(user_id)

    async def authenticate_user(
        self,
        email: str,
        password: str,
    ) -> Optional[User]:
        """Authenticate user by email and password."""
        user = await self.repository.get_by_email(email)

        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user
```

---

## Testing Strategies

Comprehensive testing is essential for production applications:

```mermaid
graph TB
    subgraph "Test Pyramid"
        A[E2E Tests<br/>Few, Slow, High Confidence]
        B[Integration Tests<br/>Medium, Test Interactions]
        C[Unit Tests<br/>Many, Fast, Low Level]
    end

    A --> B --> C
```

### Test Configuration

```python
# tests/conftest.py
# Pytest fixtures for testing FastAPI applications

import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.pool import NullPool

from app.main import app
from app.config import Settings, get_settings
from app.db.session import get_db_session
from app.models.base import Base


# Test database URL (use separate database for tests)
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_db"


def get_test_settings() -> Settings:
    """Override settings for testing."""
    return Settings(
        ENVIRONMENT="test",
        DATABASE_URL=TEST_DATABASE_URL,
        SECRET_KEY="test-secret-key-minimum-32-characters",
    )


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,  # No pooling for tests
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.
    Rolls back after each test for isolation.
    """
    session_factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session
        # Rollback to ensure test isolation
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create test client with overridden dependencies.
    Each test gets a fresh client with isolated database session.
    """

    # Override dependencies
    app.dependency_overrides[get_settings] = get_test_settings
    app.dependency_overrides[get_db_session] = lambda: db_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture
def user_data() -> dict:
    """Sample user data for tests."""
    return {
        "email": "test@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test User",
    }
```

### Unit Tests

```python
# tests/unit/test_user_service.py
# Unit tests for UserService with mocked dependencies

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.core.exceptions import NotFoundError, ConflictError


class TestUserService:
    """Unit tests for UserService."""

    @pytest.fixture
    def mock_session(self):
        """Create mock database session."""
        return AsyncMock()

    @pytest.fixture
    def user_service(self, mock_session):
        """Create UserService with mocked session."""
        service = UserService(mock_session)
        # Mock the repository
        service.repository = AsyncMock()
        return service

    @pytest.mark.asyncio
    async def test_get_user_success(self, user_service):
        """Test successful user retrieval."""
        # Arrange
        expected_user = MagicMock(id=1, email="test@example.com")
        user_service.repository.get_by_id.return_value = expected_user

        # Act
        result = await user_service.get_user(1)

        # Assert
        assert result == expected_user
        user_service.repository.get_by_id.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, user_service):
        """Test user not found raises NotFoundError."""
        # Arrange
        user_service.repository.get_by_id.return_value = None

        # Act & Assert
        with pytest.raises(NotFoundError) as exc_info:
            await user_service.get_user(999)

        assert "User" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, user_service):
        """Test creating user with duplicate email raises ConflictError."""
        # Arrange
        user_service.repository.email_exists.return_value = True
        user_data = UserCreate(
            email="existing@example.com",
            password="Password123!",
            full_name="Test",
        )

        # Act & Assert
        with pytest.raises(ConflictError) as exc_info:
            await user_service.create_user(user_data)

        assert "Email already registered" in str(exc_info.value.message)
```

### Integration Tests

```python
# tests/integration/test_api_users.py
# Integration tests for user API endpoints

import pytest
from httpx import AsyncClient


class TestUserAPI:
    """Integration tests for user endpoints."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, client: AsyncClient, user_data: dict):
        """Test successful user creation via API."""
        response = await client.post("/api/v1/users", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert "id" in data
        assert "password" not in data  # Password should not be returned

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, client: AsyncClient):
        """Test user creation with invalid email."""
        invalid_data = {
            "email": "not-an-email",
            "password": "Password123!",
            "full_name": "Test User",
        }

        response = await client.post("/api/v1/users", json=invalid_data)

        assert response.status_code == 422
        assert "error" in response.json()

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client: AsyncClient):
        """Test getting non-existent user returns 404."""
        response = await client.get("/api/v1/users/99999")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_create_and_retrieve_user(
        self, client: AsyncClient, user_data: dict
    ):
        """Test creating and then retrieving a user."""
        # Create user
        create_response = await client.post("/api/v1/users", json=user_data)
        assert create_response.status_code == 201
        created_user = create_response.json()

        # Retrieve user
        get_response = await client.get(f"/api/v1/users/{created_user['id']}")
        assert get_response.status_code == 200

        retrieved_user = get_response.json()
        assert retrieved_user["id"] == created_user["id"]
        assert retrieved_user["email"] == user_data["email"]
```

### Running Tests

```bash
# Run all tests with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run only unit tests
pytest tests/unit -v

# Run only integration tests
pytest tests/integration -v

# Run specific test file
pytest tests/unit/test_user_service.py -v

# Run tests in parallel
pytest -n auto

# Run with verbose output and show print statements
pytest -v -s
```

---

## Deployment Considerations

### Health Check Endpoints

```python
# app/api/v1/health.py
# Health check endpoints for Kubernetes probes

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db_session
from app.config import settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    version: str
    environment: str
    database: Optional[str] = None
    redis: Optional[str] = None


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Basic health check",
)
async def health_check():
    """
    Basic health check endpoint.
    Used by load balancers to check if the service is running.
    """
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/health/ready",
    response_model=HealthResponse,
    summary="Readiness check",
)
async def readiness_check(
    db: AsyncSession = Depends(get_db_session),
):
    """
    Readiness check endpoint.
    Verifies all dependencies are available.
    Used by Kubernetes readiness probes.
    """
    # Check database connection
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check Redis if configured
    redis_status = None
    if settings.REDIS_URL:
        try:
            # Add Redis health check here
            redis_status = "connected"
        except Exception as e:
            redis_status = f"error: {str(e)}"

    # Determine overall status
    is_healthy = db_status == "connected"
    if settings.REDIS_URL:
        is_healthy = is_healthy and redis_status == "connected"

    response = HealthResponse(
        status="healthy" if is_healthy else "unhealthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        redis=redis_status,
    )

    if not is_healthy:
        return response  # Return 200 with unhealthy status for debugging

    return response


@router.get(
    "/health/live",
    status_code=status.HTTP_200_OK,
    summary="Liveness check",
)
async def liveness_check():
    """
    Liveness check endpoint.
    Returns 200 if the application is alive.
    Used by Kubernetes liveness probes.
    """
    return {"status": "alive"}
```

### Production Dockerfile

```dockerfile
# Dockerfile
# Multi-stage build for production FastAPI application

# Stage 1: Builder
FROM python:3.12-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# Stage 2: Production
FROM python:3.12-slim as production

# Security: Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appgroup ./app ./app
COPY --chown=appuser:appgroup ./alembic ./alembic
COPY --chown=appuser:appgroup alembic.ini .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/live || exit 1

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Kubernetes Deployment

```yaml
# kubernetes/deployment.yaml
# Production Kubernetes deployment for FastAPI

apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
  labels:
    app: fastapi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi-app
  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      containers:
        - name: fastapi-app
          image: your-registry/fastapi-app:latest
          ports:
            - containerPort: 8000

          # Environment variables from ConfigMap and Secret
          envFrom:
            - configMapRef:
                name: fastapi-config
            - secretRef:
                name: fastapi-secrets

          # Resource limits
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"

          # Liveness probe - is the container alive?
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness probe - is the container ready for traffic?
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          # Startup probe - for slow-starting containers
          startupProbe:
            httpGet:
              path: /api/v1/health/live
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30

---
apiVersion: v1
kind: Service
metadata:
  name: fastapi-app
spec:
  selector:
    app: fastapi-app
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

---

## Best Practices Summary

| Category | Practice | Why It Matters |
|----------|----------|----------------|
| **Structure** | Use layered architecture (API, Service, Repository) | Separation of concerns, testability |
| **Configuration** | Use Pydantic Settings with validation | Type safety, fail-fast on misconfig |
| **Errors** | Implement global exception handlers | Consistent error responses |
| **Logging** | Use structured JSON logging | Searchable, parseable logs |
| **Database** | Use connection pooling | Performance, resource management |
| **Testing** | Follow the test pyramid | Coverage with fast feedback |
| **Security** | Never log sensitive data | Compliance, security |
| **Deployment** | Use multi-stage Docker builds | Smaller, more secure images |
| **Health** | Implement readiness and liveness probes | Kubernetes compatibility |
| **Observability** | Add request IDs to all logs | Distributed tracing |

---

## Conclusion

Building production-ready FastAPI applications requires attention to many details beyond just writing endpoints. Key takeaways:

1. **Structure your project** for maintainability and testability
2. **Validate configuration** early with Pydantic Settings
3. **Handle errors consistently** across your application
4. **Log everything** with structured, searchable formats
5. **Test at multiple levels** with proper isolation
6. **Deploy with health checks** for reliable orchestration

With these patterns in place, your FastAPI application will be ready to handle production traffic reliably.

---

*Need comprehensive monitoring for your FastAPI applications? [OneUptime](https://oneuptime.com) provides application performance monitoring, error tracking, and alerting to keep your APIs running smoothly in production.*
