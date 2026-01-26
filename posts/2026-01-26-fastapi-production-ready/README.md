# How to Build Production-Ready FastAPI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FastAPI, Python, Production, API Development, Web Development

Description: Learn how to build production-ready FastAPI applications with proper project structure, error handling, logging, testing, and deployment best practices.

---

Building a FastAPI application that works in development is one thing. Building one that runs reliably in production is another challenge entirely. This guide walks you through the essential patterns and practices for creating FastAPI applications that can handle real-world traffic, failures, and maintenance requirements.

## Application Architecture Overview

Before diving into code, let's visualize the architecture of a production-ready FastAPI application:

```mermaid
graph TB
    subgraph "Client Layer"
        C[Clients]
    end

    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end

    subgraph "Application Layer"
        A1[FastAPI Instance 1]
        A2[FastAPI Instance 2]
        A3[FastAPI Instance N]
    end

    subgraph "Middleware Stack"
        M1[CORS]
        M2[Authentication]
        M3[Rate Limiting]
        M4[Request Logging]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        CACHE[(Redis Cache)]
        QUEUE[Task Queue]
    end

    subgraph "Observability"
        LOG[Structured Logs]
        METRICS[Prometheus Metrics]
        TRACE[Distributed Tracing]
    end

    C --> LB
    LB --> A1
    LB --> A2
    LB --> A3
    A1 --> M1
    A2 --> M1
    A3 --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> DB
    M4 --> CACHE
    M4 --> QUEUE
    A1 --> LOG
    A2 --> METRICS
    A3 --> TRACE
```

## Project Structure

A well-organized project structure makes your application easier to maintain and scale. Here's a proven structure for production FastAPI applications:

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Dependency injection
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py    # API version router
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── users.py
│   │   │   │   └── items.py
│   │   │   └── schemas/
│   │   │       ├── __init__.py
│   │   │       ├── users.py
│   │   │       └── items.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py      # Authentication and authorization
│   │   ├── exceptions.py    # Custom exceptions
│   │   └── middleware.py    # Custom middleware
│   ├── models/
│   │   ├── __init__.py
│   │   └── domain.py        # SQLAlchemy models
│   ├── services/
│   │   ├── __init__.py
│   │   └── user_service.py  # Business logic
│   └── db/
│       ├── __init__.py
│       ├── session.py       # Database session management
│       └── repositories.py  # Data access layer
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Test fixtures
│   ├── unit/
│   └── integration/
├── alembic/                  # Database migrations
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── pyproject.toml
└── README.md
```

## Configuration Management

Never hardcode configuration values. Use environment variables with Pydantic Settings for type-safe configuration:

```python
# app/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field, PostgresDsn


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Use .env file for local development.
    """

    # Application settings
    app_name: str = Field(default="FastAPI Production App")
    debug: bool = Field(default=False)
    environment: str = Field(default="development")

    # Server settings
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=4)

    # Database settings
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://user:pass@localhost/dbname"
    )
    db_pool_size: int = Field(default=10)
    db_max_overflow: int = Field(default=20)

    # Redis settings
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Security settings
    secret_key: str = Field(default="change-me-in-production")
    access_token_expire_minutes: int = Field(default=30)

    # CORS settings
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000"]
    )

    class Config:
        # Load from .env file if present
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Allow environment variables to override
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached settings instance.
    Using lru_cache ensures settings are loaded once.
    """
    return Settings()
```

## Application Factory Pattern

Use the factory pattern to create your FastAPI application. This makes testing easier and allows for different configurations:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_router
from app.core.middleware import (
    RequestLoggingMiddleware,
    RateLimitMiddleware,
)
from app.core.exceptions import setup_exception_handlers
from app.db.session import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager handles startup and shutdown events.
    This is the modern way to handle application lifecycle in FastAPI.
    """
    # Startup: Initialize resources
    settings = get_settings()
    await init_db(settings.database_url)

    yield  # Application runs here

    # Shutdown: Clean up resources
    await close_db()


def create_application() -> FastAPI:
    """
    Application factory function.
    Creates and configures the FastAPI application instance.
    """
    settings = get_settings()

    # Create FastAPI instance with metadata
    app = FastAPI(
        title=settings.app_name,
        description="Production-ready FastAPI application",
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add custom middleware
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)

    # Setup exception handlers
    setup_exception_handlers(app)

    # Include API routers
    app.include_router(
        api_router,
        prefix="/api/v1",
    )

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    return app


# Create application instance
app = create_application()
```

## Request Processing Flow

Understanding how requests flow through your application helps with debugging and optimization:

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant R as Router
    participant D as Dependencies
    participant E as Endpoint
    participant S as Service
    participant DB as Database

    C->>M: HTTP Request
    M->>M: Log Request
    M->>M: Rate Limit Check
    M->>M: CORS Headers
    M->>R: Forward Request
    R->>D: Resolve Dependencies
    D->>D: Auth Check
    D->>D: DB Session
    D->>E: Inject Dependencies
    E->>S: Business Logic
    S->>DB: Query/Update
    DB-->>S: Result
    S-->>E: Domain Object
    E-->>R: Response Schema
    R-->>M: HTTP Response
    M->>M: Log Response
    M-->>C: Final Response
```

## Custom Exception Handling

Production applications need consistent error responses. Create a custom exception hierarchy:

```python
# app/core/exceptions.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging
import traceback
from typing import Any

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    message: str
    details: dict[str, Any] | None = None
    request_id: str | None = None


class AppException(Exception):
    """
    Base exception for application errors.
    All custom exceptions should inherit from this.
    """

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} with id '{identifier}' not found",
            error_code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier},
        )


class ValidationError(AppException):
    """Raised when request validation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class AuthenticationError(AppException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class AuthorizationError(AppException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_FAILED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Register exception handlers with the FastAPI application.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        """Handle custom application exceptions."""
        # Get request ID from headers if present
        request_id = request.headers.get("X-Request-ID")

        # Log the error
        logger.error(
            f"AppException: {exc.error_code} - {exc.message}",
            extra={
                "request_id": request_id,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.error_code,
                message=exc.message,
                details=exc.details,
                request_id=request_id,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """
        Catch-all handler for unhandled exceptions.
        In production, hide internal details from clients.
        """
        request_id = request.headers.get("X-Request-ID")

        # Log full traceback for debugging
        logger.error(
            f"Unhandled exception: {str(exc)}",
            extra={
                "request_id": request_id,
                "traceback": traceback.format_exc(),
            },
        )

        # Return generic error to client
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error="INTERNAL_ERROR",
                message="An unexpected error occurred",
                request_id=request_id,
            ).model_dump(),
        )
```

## Structured Logging

Production applications need structured logging for easy parsing and analysis:

```python
# app/core/logging.py
import logging
import sys
import json
from datetime import datetime
from typing import Any


class JSONFormatter(logging.Formatter):
    """
    Custom formatter that outputs logs as JSON.
    This format is easily parsed by log aggregation tools.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging(level: str = "INFO") -> None:
    """
    Configure application logging.
    Call this early in application startup.
    """
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create console handler with JSON formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
```

## Database Session Management

Proper database session management prevents connection leaks and ensures clean transactions:

```python
# app/db/session.py
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base

from app.config import get_settings

# SQLAlchemy base class for models
Base = declarative_base()

# Global engine and session factory
_engine = None
_session_factory = None


async def init_db(database_url: str) -> None:
    """
    Initialize database engine and session factory.
    Call this during application startup.
    """
    global _engine, _session_factory

    settings = get_settings()

    # Create async engine with connection pooling
    _engine = create_async_engine(
        str(database_url),
        echo=settings.debug,  # Log SQL in debug mode
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=3600,   # Recycle connections after 1 hour
    )

    # Create session factory
    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


async def close_db() -> None:
    """
    Close database connections.
    Call this during application shutdown.
    """
    global _engine

    if _engine:
        await _engine.dispose()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    Session is automatically closed after the request.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    if _session_factory is None:
        raise RuntimeError("Database not initialized")

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Dependency Injection

Use FastAPI's dependency injection system for clean, testable code:

```python
# app/dependencies.py
from typing import Annotated
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.core.security import verify_token
from app.services.user_service import UserService
from app.models.domain import User


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Dependency that extracts and validates the current user.
    Raises 401 if authentication fails.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    # Extract token from "Bearer <token>" format
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    # Verify token and get user ID
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Fetch user from database
    user_service = UserService(db)
    user = await user_service.get_by_id(payload["sub"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def require_permission(permission: str):
    """
    Factory function that creates a permission-checking dependency.

    Usage:
        @app.post("/admin/users")
        async def create_user(
            user: User = Depends(require_permission("admin:write"))
        ):
            ...
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required",
            )
        return current_user

    return permission_checker


# Type aliases for common dependencies
DbSession = Annotated[AsyncSession, Depends(get_db_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

## API Endpoints

Structure your endpoints with proper validation, documentation, and error handling:

```python
# app/api/v1/endpoints/users.py
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import DbSession, CurrentUser, require_permission
from app.api.v1.schemas.users import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
)
from app.services.user_service import UserService
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List all users",
    description="Retrieve a paginated list of users. Requires read permission.",
)
async def list_users(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1, description="Page number"),
    per_page: int = Query(default=20, ge=1, le=100, description="Items per page"),
):
    """
    List users with pagination.

    - **page**: Page number (starts at 1)
    - **per_page**: Number of items per page (max 100)
    """
    service = UserService(db)
    users, total = await service.list_users(
        page=page,
        per_page=per_page,
    )

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
)
async def get_user(
    user_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Retrieve a specific user by their ID."""
    service = UserService(db)
    user = await service.get_by_id(user_id)

    if not user:
        raise NotFoundError("User", user_id)

    return UserResponse.model_validate(user)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
)
async def create_user(
    user_data: UserCreate,
    db: DbSession,
    admin: CurrentUser = Depends(require_permission("admin:write")),
):
    """
    Create a new user.

    Requires admin:write permission.
    """
    service = UserService(db)
    user = await service.create_user(user_data)

    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user",
)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Update an existing user.

    Users can only update their own profile unless they have admin permissions.
    """
    # Check authorization
    if user_id != current_user.id and "admin:write" not in current_user.permissions:
        raise NotFoundError("User", user_id)  # Hide existence from non-admins

    service = UserService(db)
    user = await service.update_user(user_id, user_data)

    if not user:
        raise NotFoundError("User", user_id)

    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
)
async def delete_user(
    user_id: str,
    db: DbSession,
    admin: CurrentUser = Depends(require_permission("admin:write")),
):
    """
    Delete a user.

    Requires admin:write permission.
    """
    service = UserService(db)
    deleted = await service.delete_user(user_id)

    if not deleted:
        raise NotFoundError("User", user_id)
```

## Testing Strategy

A comprehensive testing strategy includes unit tests, integration tests, and end-to-end tests:

```mermaid
graph LR
    subgraph "Test Pyramid"
        E2E[E2E Tests<br/>Few, Slow]
        INT[Integration Tests<br/>Medium]
        UNIT[Unit Tests<br/>Many, Fast]
    end

    E2E --> INT
    INT --> UNIT

    style UNIT fill:#90EE90
    style INT fill:#FFE4B5
    style E2E fill:#FFB6C1
```

Here's how to set up tests with pytest and test fixtures:

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import create_application
from app.db.session import Base, get_db_session
from app.config import Settings, get_settings


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


def get_test_settings() -> Settings:
    """Override settings for testing."""
    return Settings(
        database_url=TEST_DATABASE_URL,
        debug=True,
        secret_key="test-secret-key",
    )


@pytest.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def test_session(test_engine):
    """Create test database session."""
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session


@pytest.fixture
async def app(test_session):
    """Create test application with overridden dependencies."""
    application = create_application()

    # Override settings
    application.dependency_overrides[get_settings] = get_test_settings

    # Override database session
    async def override_get_db():
        yield test_session

    application.dependency_overrides[get_db_session] = override_get_db

    yield application

    # Clear overrides
    application.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    """Create test HTTP client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    """Create authorization headers for testing."""
    # In real tests, generate a valid test token
    return {"Authorization": "Bearer test-token"}
```

Write tests that cover your endpoints:

```python
# tests/integration/test_users.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test that health endpoint returns healthy status."""
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_list_users_unauthorized(client: AsyncClient):
    """Test that listing users without auth returns 401."""
    response = await client.get("/api/v1/users")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_users_authorized(client: AsyncClient, auth_headers):
    """Test that authorized users can list users."""
    response = await client.get(
        "/api/v1/users",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_user_validation(client: AsyncClient, auth_headers):
    """Test that creating user with invalid data returns 422."""
    response = await client.post(
        "/api/v1/users",
        headers=auth_headers,
        json={
            "email": "not-an-email",  # Invalid email
            "name": "",               # Empty name
        },
    )

    assert response.status_code == 422
```

## Docker Configuration

Package your application for deployment with Docker:

```dockerfile
# docker/Dockerfile
# Build stage
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir build \
    && python -m build --wheel

# Runtime stage
FROM python:3.12-slim as runtime

WORKDIR /app

# Create non-root user for security
RUN groupadd --gid 1000 appgroup \
    && useradd --uid 1000 --gid appgroup --shell /bin/bash appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy wheel from builder and install
COPY --from=builder /app/dist/*.whl ./
RUN pip install --no-cache-dir *.whl && rm *.whl

# Copy application code
COPY app/ ./app/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with Gunicorn and Uvicorn workers
CMD ["gunicorn", "app.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

And the Docker Compose file for local development:

```yaml
# docker/docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db/app
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=true
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Deployment Best Practices

When deploying to production, consider these additional configurations:

```mermaid
graph TB
    subgraph "Deployment Checklist"
        A[Configure HTTPS/TLS]
        B[Set Up Load Balancing]
        C[Enable Health Checks]
        D[Configure Auto-scaling]
        E[Set Up Monitoring]
        F[Configure Backups]
        G[Implement CI/CD]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
```

### Gunicorn Configuration

Create a Gunicorn configuration file for fine-tuned control:

```python
# gunicorn.conf.py
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2

# Process naming
proc_name = "fastapi-app"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Graceful shutdown
graceful_timeout = 30


def on_starting(server):
    """Called just before the master process is initialized."""
    pass


def on_exit(server):
    """Called just before exiting Gunicorn."""
    pass
```

## Summary

Building production-ready FastAPI applications requires attention to several key areas:

1. **Project Structure**: Organize code into logical modules for maintainability
2. **Configuration**: Use environment variables with proper validation
3. **Error Handling**: Implement consistent exception handling across the application
4. **Logging**: Use structured logging for production observability
5. **Database Management**: Handle connections and sessions properly
6. **Testing**: Write comprehensive tests at multiple levels
7. **Containerization**: Package applications for consistent deployment
8. **Deployment**: Configure proper process management and health checks

Following these patterns will help you build FastAPI applications that are reliable, maintainable, and ready for production traffic. Start with a solid foundation and add complexity only when needed. The patterns shown here have been proven in real-world applications serving millions of requests.

Remember that production readiness is an ongoing process. Continuously monitor your application, gather metrics, and iterate on improvements based on real usage patterns.
