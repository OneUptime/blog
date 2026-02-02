# How to Build Production-Ready APIs with FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, API, Production, Best Practices

Description: A comprehensive guide to building production-ready APIs with FastAPI, covering project structure, error handling, testing, security, and deployment patterns.

---

> Moving from a working prototype to a production-ready API requires more than just adding endpoints. You need proper structure, error handling, security, and operational patterns. This guide walks through what it takes to ship FastAPI to production.

A production-ready API is one that handles failures gracefully, scales under load, and provides clear error messages. It is secure by default, easy to monitor, and simple to maintain.

---

## Project Structure

A well-organized project makes maintenance easier. Here is a structure that scales well:

```
myapi/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Configuration management
│   ├── dependencies.py      # Shared dependencies
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── items.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   └── user_service.py  # Business logic
│   └── middleware/
│       ├── __init__.py
│       └── security.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_users.py
├── requirements.txt
└── Dockerfile
```

---

## Configuration Management

Never hardcode configuration. Use environment variables with proper validation:

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Application settings
    app_name: str = "MyAPI"
    debug: bool = False

    # Database settings
    database_url: str

    # Security settings
    secret_key: str
    access_token_expire_minutes: int = 30

    # CORS settings
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

# Use lru_cache to avoid reading env file on every request
@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## Dependency Injection

FastAPI's dependency injection system keeps your code clean and testable:

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings, Settings

# Security scheme for JWT tokens
security = HTTPBearer()

async def get_db():
    """
    Database session dependency.
    Creates a new session for each request and closes it after.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
    db = Depends(get_db)
):
    """
    Validates the JWT token and returns the current user.
    Raises 401 if token is invalid or expired.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

---

## Error Handling

Good error handling is critical for production APIs. Use structured error responses:

```python
# app/exceptions.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    detail: str
    code: str

class AppException(Exception):
    """Base exception for application errors"""
    def __init__(self, status_code: int, error: str, detail: str, code: str):
        self.status_code = status_code
        self.error = error
        self.detail = detail
        self.code = code

# Common exception classes
class NotFoundError(AppException):
    def __init__(self, resource: str, id: str):
        super().__init__(
            status_code=404,
            error="Not Found",
            detail=f"{resource} with id {id} not found",
            code="RESOURCE_NOT_FOUND"
        )

class ValidationError(AppException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=422,
            error="Validation Error",
            detail=detail,
            code="VALIDATION_ERROR"
        )

# Register exception handlers in main.py
def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error,
                "detail": exc.detail,
                "code": exc.code
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # Log the error for debugging
        logger.error(f"Unhandled exception: {exc}", exc_info=True)

        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred",
                "code": "INTERNAL_ERROR"
            }
        )
```

### HTTP Status Codes Reference

| Status Code | Meaning | When to Use |
|-------------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that creates resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request syntax |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource state conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error - log and investigate |

---

## Input Validation

Pydantic handles validation, but you need to design your schemas carefully:

```python
# app/models/schemas.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain digit")
        return v

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    # Never expose sensitive fields like password_hash
    class Config:
        from_attributes = True
```

---

## Security Headers and CORS

Add security middleware to protect against common attacks:

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses.
    These headers protect against XSS, clickjacking, and other attacks.
    """
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Prevent XSS attacks
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Enable browser XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

## Testing

Write tests that cover your API endpoints and edge cases:

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.dependencies import get_db
from app.models.database import Base

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="function")
def db():
    """Creates a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """Test client with database override"""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# tests/test_users.py
def test_create_user(client):
    response = client.post(
        "/users/",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "SecurePass123"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "password" not in data  # Never expose password

def test_create_user_invalid_email(client):
    response = client.post(
        "/users/",
        json={
            "email": "invalid-email",
            "username": "testuser",
            "password": "SecurePass123"
        }
    )
    assert response.status_code == 422

def test_create_user_weak_password(client):
    response = client.post(
        "/users/",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "weak"  # Too short, no uppercase, no digit
        }
    )
    assert response.status_code == 422
```

---

## Health Checks

Every production API needs health check endpoints for load balancers and monitoring:

```python
# app/routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy import text

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Basic health check - returns 200 if app is running"""
    return {"status": "healthy"}

@router.get("/ready")
async def readiness_check(db = Depends(get_db)):
    """
    Readiness check - verifies all dependencies are available.
    Used by Kubernetes to determine if pod can receive traffic.
    """
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    is_ready = db_status == "healthy"

    return {
        "status": "ready" if is_ready else "not_ready",
        "checks": {
            "database": db_status
        }
    }
```

---

## Running in Production

Use Gunicorn with Uvicorn workers for production:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Create non-root user
RUN useradd -m appuser
USER appuser

# Run with Gunicorn
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

---

## Conclusion

Building production-ready APIs requires attention to details beyond just writing endpoints:

- **Structure your project** so it scales with your team
- **Validate inputs** thoroughly with Pydantic
- **Handle errors** with structured responses and proper status codes
- **Add security headers** to protect against common attacks
- **Write tests** that cover happy paths and edge cases
- **Include health checks** for operational visibility

FastAPI makes it easy to build fast APIs, but production readiness comes from the patterns you apply around it.

---

*Need to monitor your FastAPI applications in production? [OneUptime](https://oneuptime.com) provides API monitoring, uptime tracking, and incident management.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
