# How to Build Production-Ready FastAPI Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Production, API Development, Gunicorn, Uvicorn, CORS, Rate Limiting, Health Checks

Description: Learn how to build production-ready FastAPI applications with proper project structure, dependency injection, error handling, middleware, and deployment configurations.

---

> Building a FastAPI application is straightforward, but preparing it for production requires careful attention to project structure, error handling, security, and deployment configuration. This guide covers the essential patterns and configurations you need to ship reliable, scalable FastAPI services.

FastAPI has become the go-to framework for building high-performance Python APIs. Its automatic OpenAPI documentation, type hints, and async support make development fast. However, going from a working prototype to a production-ready service requires additional considerations.

---

## Project Structure

A well-organized project structure makes your codebase maintainable and scalable. Here is a recommended structure for production FastAPI applications:

```
myapp/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration management
│   ├── dependencies.py         # Dependency injection
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # API version router
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── users.py
│   │   │   │   ├── items.py
│   │   │   │   └── health.py
│   │   │   └── schemas/
│   │   │       ├── __init__.py
│   │   │       ├── users.py
│   │   │       └── items.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py         # Authentication and authorization
│   │   ├── exceptions.py       # Custom exception handlers
│   │   └── middleware.py       # Custom middleware
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py         # Database models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   └── item_service.py
│   └── repositories/
│       ├── __init__.py
│       ├── user_repository.py
│       └── item_repository.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_api/
├── alembic/                     # Database migrations
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── gunicorn.conf.py
```

### Main Application Entry Point

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.v1.router import api_router
from app.core.exceptions import register_exception_handlers
from app.core.middleware import RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle events.
    Setup resources on startup, cleanup on shutdown.
    """
    # Startup: Initialize database connections, caches, etc.
    print("Starting up application...")
    yield
    # Shutdown: Close connections, flush buffers, etc.
    print("Shutting down application...")


def create_app() -> FastAPI:
    """
    Application factory pattern for creating the FastAPI app.
    This allows for easier testing and configuration.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Register middleware
    setup_middleware(app)

    # Register exception handlers
    register_exception_handlers(app)

    # Include API routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the application."""
    # CORS middleware must be added before other middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom request logging middleware
    app.add_middleware(RequestLoggingMiddleware)


# Create the application instance
app = create_app()
```

---

## Configuration Management

Proper configuration management is essential for production deployments. Use Pydantic settings for type-safe configuration:

```python
# app/config.py
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses pydantic-settings for validation and type coercion.
    """

    # Application settings
    PROJECT_NAME: str = "MyApp API"
    PROJECT_DESCRIPTION: str = "Production-ready FastAPI application"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # API settings
    API_V1_PREFIX: str = "/api/v1"

    # Security settings
    SECRET_KEY: str = Field(..., description="Secret key for JWT encoding")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    # Database settings
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # CORS settings
    CORS_ORIGINS: List[str] = ["https://example.com"]

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # External services
    REDIS_URL: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance.
    Use lru_cache to avoid reading env vars on every request.
    """
    return Settings()


# Global settings instance
settings = get_settings()
```

---

## Dependency Injection

FastAPI's dependency injection system allows for clean, testable code. Here is how to set up common dependencies:

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Generator, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.database import SessionLocal
from app.core.security import decode_access_token
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository


# Security scheme for JWT authentication
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency.
    Yields a database session and ensures cleanup after request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """
    Validate JWT token and return current user.
    Raises HTTPException if token is invalid or user not found.
    """
    token = credentials.credentials

    # Decode and validate the token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user_id = payload.get("sub")
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Ensure the current user is active.
    Use this dependency for endpoints requiring active users.
    """
    if not current_user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """
    User service dependency with repository injection.
    Follows the repository pattern for data access.
    """
    repository = UserRepository(db)
    return UserService(repository)
```

---

## Error Handling

Proper error handling ensures your API returns consistent, meaningful error responses:

```python
# app/core/exceptions.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
import logging
import traceback

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    message: str
    details: Optional[List[Any]] = None
    request_id: Optional[str] = None


class AppException(Exception):
    """
    Base exception for application-specific errors.
    Provides consistent error formatting across the application.
    """

    def __init__(
        self,
        status_code: int,
        error: str,
        message: str,
        details: Optional[List[Any]] = None,
    ):
        self.status_code = status_code
        self.error = error
        self.message = message
        self.details = details
        super().__init__(message)


class NotFoundException(AppException):
    """Resource not found exception."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error="not_found",
            message=f"{resource} with id '{identifier}' not found",
        )


class ValidationException(AppException):
    """Business logic validation exception."""

    def __init__(self, message: str, details: Optional[List[Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error="validation_error",
            message=message,
            details=details,
        )


class UnauthorizedException(AppException):
    """Authentication required exception."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error="unauthorized",
            message=message,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers for the application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        """Handle application-specific exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.error,
                message=exc.message,
                details=exc.details,
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle standard HTTP exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error="http_error",
                message=str(exc.detail),
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors with detailed messages."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                error="validation_error",
                message="Request validation failed",
                details=errors,
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """
        Handle unhandled exceptions.
        Log the full traceback for debugging but return a generic message.
        """
        logger.error(
            f"Unhandled exception: {exc}",
            extra={
                "request_id": getattr(request.state, "request_id", None),
                "path": request.url.path,
                "traceback": traceback.format_exc(),
            },
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error="internal_error",
                message="An unexpected error occurred",
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )
```

---

## Custom Middleware

Middleware allows you to process requests before they reach your endpoints and responses before they are sent:

```python
# app/core/middleware.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import uuid
import logging

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging requests and adding request IDs.
    Provides traceability for debugging and monitoring.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Process the request
        response = await call_next(request)

        # Calculate request duration
        duration = time.time() - start_time

        # Log request details
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "client_ip": request.client.host if request.client else None,
            },
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{round(duration * 1000, 2)}ms"

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    Helps protect against common web vulnerabilities.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Enable XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy (adjust based on your needs)
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Middleware placeholder for compression.
    In production, use GZipMiddleware from starlette.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        # Compression is typically handled by reverse proxy (nginx)
        # or Starlette's GZipMiddleware
        return response
```

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) must be properly configured for browser-based clients:

```python
# app/core/cors.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from app.config import settings


def setup_cors(app: FastAPI) -> None:
    """
    Configure CORS for the application.
    Settings should be restrictive in production.
    """

    # Define allowed origins based on environment
    if settings.ENVIRONMENT == "development":
        # Allow all origins in development
        origins = ["*"]
    else:
        # Restrict to specific origins in production
        origins = settings.CORS_ORIGINS

    app.add_middleware(
        CORSMiddleware,
        # Origins that are allowed to make requests
        allow_origins=origins,
        # Allow credentials (cookies, authorization headers)
        allow_credentials=True,
        # HTTP methods allowed
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        # Headers that can be included in requests
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "Accept",
            "Origin",
        ],
        # Headers exposed to the browser
        expose_headers=[
            "X-Request-ID",
            "X-Response-Time",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ],
        # Cache preflight requests for 10 minutes
        max_age=600,
    )
```

---

## Rate Limiting

Protect your API from abuse with rate limiting:

```python
# app/core/rate_limit.py
from fastapi import Request, HTTPException, status
from collections import defaultdict
import time
from typing import Callable
from functools import wraps

from app.config import settings


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter.
    More accurate than fixed window, prevents boundary bursts.
    """

    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window = window_seconds
        self.request_logs: dict = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed and record it."""
        now = time.time()
        window_start = now - self.window

        # Get request log for this key
        log = self.request_logs[key]

        # Remove old entries outside the window
        self.request_logs[key] = [t for t in log if t > window_start]

        # Check if limit exceeded
        if len(self.request_logs[key]) >= self.requests:
            return False

        # Record current request
        self.request_logs[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        """Get remaining requests in current window."""
        now = time.time()
        window_start = now - self.window

        log = self.request_logs[key]
        current_count = len([t for t in log if t > window_start])

        return max(0, self.requests - current_count)

    def get_reset_time(self, key: str) -> int:
        """Get seconds until the oldest request expires."""
        log = self.request_logs.get(key, [])
        if not log:
            return 0

        oldest = min(log)
        return max(0, int(oldest + self.window - time.time()))


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter(
    requests=settings.RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)


async def rate_limit_dependency(request: Request) -> None:
    """
    Dependency for rate limiting.
    Add to routes that need rate limiting.
    """
    # Use client IP as the rate limit key
    client_ip = request.client.host if request.client else "unknown"
    key = f"ip:{client_ip}"

    if not rate_limiter.is_allowed(key):
        remaining = rate_limiter.get_remaining(key)
        reset_time = rate_limiter.get_reset_time(key)

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={
                "X-RateLimit-Limit": str(rate_limiter.requests),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_time),
                "Retry-After": str(reset_time),
            },
        )


def rate_limit(requests: int = 100, window: int = 60):
    """
    Decorator for per-endpoint rate limiting.
    Allows different limits for different endpoints.
    """
    limiter = SlidingWindowRateLimiter(requests=requests, window_seconds=window)

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = request.client.host if request.client else "unknown"
            key = f"{request.url.path}:{client_ip}"

            if not limiter.is_allowed(key):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded for this endpoint",
                    headers={
                        "X-RateLimit-Limit": str(requests),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(window),
                    },
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
```

---

## Health Checks

Health check endpoints are essential for container orchestration and load balancers:

```python
# app/api/v1/endpoints/health.py
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
import asyncio

from app.dependencies import get_db
from app.config import settings

router = APIRouter(tags=["Health"])


class HealthStatus(BaseModel):
    """Health check response schema."""
    status: str
    timestamp: str
    version: str
    environment: str
    checks: Dict[str, Any]


async def check_database(db) -> Dict[str, Any]:
    """
    Verify database connectivity.
    Returns status and response time.
    """
    try:
        start = datetime.now()
        # Execute simple query to verify connection
        db.execute("SELECT 1")
        duration = (datetime.now() - start).total_seconds() * 1000

        return {
            "status": "healthy",
            "response_time_ms": round(duration, 2),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


async def check_redis() -> Dict[str, Any]:
    """
    Verify Redis connectivity.
    Returns status and response time.
    """
    try:
        import redis

        start = datetime.now()
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        duration = (datetime.now() - start).total_seconds() * 1000

        return {
            "status": "healthy",
            "response_time_ms": round(duration, 2),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="Health check endpoint",
    description="Returns the health status of the application and its dependencies.",
)
async def health_check(db=Depends(get_db)) -> HealthStatus:
    """
    Comprehensive health check endpoint.
    Checks all critical dependencies and returns their status.
    """
    # Run all health checks concurrently
    db_check, redis_check = await asyncio.gather(
        check_database(db),
        check_redis(),
        return_exceptions=True,
    )

    # Handle any exceptions from concurrent checks
    if isinstance(db_check, Exception):
        db_check = {"status": "unhealthy", "error": str(db_check)}
    if isinstance(redis_check, Exception):
        redis_check = {"status": "unhealthy", "error": str(redis_check)}

    checks = {
        "database": db_check,
        "redis": redis_check,
    }

    # Determine overall status
    all_healthy = all(
        check.get("status") == "healthy" for check in checks.values()
    )
    overall_status = "healthy" if all_healthy else "degraded"

    return HealthStatus(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        checks=checks,
    )


@router.get(
    "/health/live",
    summary="Liveness probe",
    description="Simple liveness check for Kubernetes.",
)
async def liveness_probe() -> JSONResponse:
    """
    Kubernetes liveness probe.
    Returns 200 if the application is running.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "alive"},
    )


@router.get(
    "/health/ready",
    summary="Readiness probe",
    description="Readiness check for Kubernetes.",
)
async def readiness_probe(db=Depends(get_db)) -> JSONResponse:
    """
    Kubernetes readiness probe.
    Returns 200 only if all dependencies are available.
    """
    db_check = await check_database(db)

    if db_check.get("status") != "healthy":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "reason": "database_unavailable"},
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ready"},
    )
```

---

## Gunicorn and Uvicorn Configuration

For production deployments, use Gunicorn with Uvicorn workers:

```python
# gunicorn.conf.py
import multiprocessing
import os

# Server socket
bind = os.getenv("BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
# Rule of thumb: 2-4 workers per CPU core
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
threads = 1

# Timeout configuration
timeout = 120  # Worker timeout in seconds
keepalive = 5  # Keepalive timeout for connections
graceful_timeout = 30  # Timeout for graceful worker restart

# Process naming
proc_name = "myapp"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
errorlog = "-"  # Log to stderr
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"  # Log to stdout
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process lifecycle hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    pass


def on_reload(server):
    """Called when receiving SIGHUP signal."""
    pass


def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass


def worker_abort(worker):
    """Called when a worker receives SIGABRT."""
    pass


def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass


def post_fork(server, worker):
    """Called just after a worker has been forked."""
    pass


def post_worker_init(worker):
    """Called just after a worker has initialized."""
    pass


def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    pass


def nworkers_changed(server, new_value, old_value):
    """Called when the number of workers is changed."""
    pass


def on_exit(server):
    """Called just before exiting Gunicorn."""
    pass


# Limit request sizes to prevent DoS attacks
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Preload application for faster worker spawning
preload_app = True

# Maximum number of requests a worker will process before restarting
max_requests = 1000
max_requests_jitter = 50  # Add randomness to prevent thundering herd
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt


# Production stage
FROM python:3.11-slim

# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid 1000 --shell /bin/bash appuser

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    APP_HOME=/app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set working directory
WORKDIR $APP_HOME

# Copy application code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health/live')"

# Run the application
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.main:app"]
```

### Running in Production

```bash
# Start with Gunicorn (recommended for production)
gunicorn -c gunicorn.conf.py app.main:app

# Or with Uvicorn directly (for development or single-process deployments)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Environment variables for production
export SECRET_KEY="your-secret-key-here"
export DATABASE_URL="postgresql://user:pass@localhost:5432/myapp"
export REDIS_URL="redis://localhost:6379"
export ENVIRONMENT="production"
export DEBUG="false"
```

---

## Best Practices Summary

| Category | Practice |
|----------|----------|
| **Project Structure** | Use application factory pattern, separate concerns into modules |
| **Configuration** | Use Pydantic settings, never hardcode secrets |
| **Dependencies** | Use FastAPI's Depends for testable, reusable components |
| **Error Handling** | Create custom exceptions, register global handlers |
| **Middleware** | Add request logging, security headers, request IDs |
| **CORS** | Be restrictive in production, allow all only in development |
| **Rate Limiting** | Protect all public endpoints, use sliding window algorithm |
| **Health Checks** | Implement liveness and readiness probes for Kubernetes |
| **Deployment** | Use Gunicorn with Uvicorn workers, run as non-root user |
| **Security** | Validate all inputs, use HTTPS, set security headers |
| **Logging** | Structured logging with request IDs for traceability |
| **Testing** | Use application factory for test isolation |

---

## Conclusion

Building production-ready FastAPI applications requires attention to many details beyond the core functionality. Proper project structure, configuration management, error handling, and deployment configuration are essential for reliability and maintainability.

The patterns and configurations shown in this guide provide a solid foundation for FastAPI applications that can scale and perform under real-world conditions. Start with these patterns and adapt them to your specific requirements.

---

*Need to monitor your FastAPI applications in production? [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with health checks, uptime tracking, and alerting to ensure your services stay reliable.*
