# How to Build Dependency Injection in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Dependency Injection, Clean Architecture, Testing, Design Patterns

Description: Learn how to use dependency injection in FastAPI to build maintainable, testable applications. This guide covers the Depends system, creating injectable services, and patterns for real-world applications.

---

> Dependency injection is one of FastAPI's most powerful features. It lets you write code that is easy to test, maintain, and extend without resorting to globals or tightly coupled components. This guide walks through practical dependency injection patterns you can use in production.

Dependency injection (DI) separates the creation of an object from its use. Instead of instantiating dependencies inside your functions, you declare what you need and let the framework provide it. FastAPI's `Depends` function makes this pattern first-class, giving you automatic dependency resolution with full type safety.

---

## Understanding FastAPI's Depends System

At its core, `Depends` is a callable that FastAPI evaluates before your endpoint runs. The result gets passed as a parameter to your function.

```python
# basic_depends.py
# Simple dependency that returns a value
from fastapi import FastAPI, Depends

app = FastAPI()

def get_query_params(skip: int = 0, limit: int = 10):
    """
    A simple dependency that packages query parameters.
    FastAPI calls this function and passes the result to the endpoint.
    """
    return {"skip": skip, "limit": limit}

@app.get("/items/")
async def read_items(params: dict = Depends(get_query_params)):
    # params is automatically populated by calling get_query_params
    return {"skip": params["skip"], "limit": params["limit"]}
```

The `Depends` system handles:
- Calling the dependency function with the right arguments
- Caching results within a single request (by default)
- Resolving nested dependencies recursively

---

## Building Injectable Services

Real applications need services for database access, authentication, and business logic. Here's how to structure injectable services.

### Database Session Dependency

```python
# database.py
# Database session management with dependency injection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi import Depends
from typing import Generator

# Create engine and session factory once at module level
DATABASE_URL = "postgresql://user:pass@localhost/db"
engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Uses a generator to ensure the session is closed after the request.
    """
    db = SessionLocal()
    try:
        yield db  # Provide the session to the endpoint
    finally:
        db.close()  # Always close, even if an exception occurred
```

### Using the Database Dependency

```python
# users.py
# User endpoints with database dependency
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get a user by ID.
    The db session is automatically injected by FastAPI.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    Transaction commits on success, rolls back on exception.
    """
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)  # Load generated fields like id
    return user
```

---

## Class-Based Dependencies

For complex services with configuration or state, class-based dependencies provide better organization.

```python
# services.py
# Class-based dependency for user service
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from database import get_db
from models import User
from typing import Optional

class UserService:
    """
    Service class for user-related operations.
    Encapsulates business logic and database access.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch a user by their ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their email address"""
        return self.db.query(User).filter(User.email == email).first()

    def create(self, email: str, hashed_password: str) -> User:
        """Create a new user and return the created instance"""
        user = User(email=email, hashed_password=hashed_password)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_last_login(self, user: User) -> None:
        """Update the last login timestamp for a user"""
        from datetime import datetime
        user.last_login = datetime.utcnow()
        self.db.commit()

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """
    Dependency that provides a UserService instance.
    The database session is injected automatically.
    """
    return UserService(db)
```

### Using Class-Based Dependencies

```python
# user_routes.py
# Routes using the UserService dependency
from fastapi import APIRouter, Depends, HTTPException
from services import UserService, get_user_service
from schemas import UserResponse

router = APIRouter()

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, user_service: UserService = Depends(get_user_service)):
    """
    Get user by ID using the service layer.
    Business logic is encapsulated in UserService.
    """
    user = user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## Authentication Dependencies

Authentication is a perfect use case for dependency injection. You can create reusable auth dependencies that validate tokens and return the current user.

```python
# auth.py
# Authentication dependencies
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime
from typing import Optional
from services import UserService, get_user_service
from models import User

# Bearer token security scheme
security = HTTPBearer()

# JWT configuration
SECRET_KEY = "your-secret-key-here"  # Load from environment in production
ALGORITHM = "HS256"

def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload if valid, None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Check if token has expired
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            return None
        return payload
    except jwt.PyJWTError:
        return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_service: UserService = Depends(get_user_service)
) -> User:
    """
    Dependency that extracts and validates the current user from the JWT token.
    Raises 401 if the token is invalid or the user doesn't exist.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID"
        )

    user = user_service.get_by_id(int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the current user is active.
    Builds on get_current_user by adding an active check.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user
```

### Protected Routes

```python
# protected_routes.py
# Routes that require authentication
from fastapi import APIRouter, Depends
from auth import get_current_active_user
from models import User

router = APIRouter()

@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get the current user's information.
    This endpoint requires a valid, active user token.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active
    }

@router.get("/protected-resource")
def protected_resource(current_user: User = Depends(get_current_active_user)):
    """
    Example protected endpoint.
    Only accessible with a valid authentication token.
    """
    return {"message": f"Hello, {current_user.email}!"}
```

---

## Dependency Injection for Testing

One of the biggest benefits of dependency injection is testability. You can swap out real dependencies for mocks without changing your application code.

```python
# test_users.py
# Testing with dependency overrides
from fastapi.testclient import TestClient
from fastapi import FastAPI
from unittest.mock import MagicMock
from database import get_db
from services import get_user_service, UserService
from main import app

# Create a test client
client = TestClient(app)

def test_get_user_found():
    """Test getting a user that exists"""
    # Create a mock user
    mock_user = MagicMock()
    mock_user.id = 1
    mock_user.email = "test@example.com"
    mock_user.is_active = True

    # Create a mock service that returns our mock user
    mock_service = MagicMock(spec=UserService)
    mock_service.get_by_id.return_value = mock_user

    # Override the dependency
    app.dependency_overrides[get_user_service] = lambda: mock_service

    # Make the request
    response = client.get("/users/1")

    # Verify the response
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

    # Clean up
    app.dependency_overrides.clear()

def test_get_user_not_found():
    """Test getting a user that doesn't exist"""
    # Create a mock service that returns None
    mock_service = MagicMock(spec=UserService)
    mock_service.get_by_id.return_value = None

    app.dependency_overrides[get_user_service] = lambda: mock_service

    response = client.get("/users/999")

    assert response.status_code == 404

    app.dependency_overrides.clear()
```

---

## Scoped Dependencies with Generators

Generator dependencies are automatically cleaned up after the request completes. This pattern is essential for resource management.

```python
# scoped_dependencies.py
# Scoped dependencies with automatic cleanup
from fastapi import Depends
from typing import Generator
import httpx

def get_http_client() -> Generator[httpx.Client, None, None]:
    """
    Dependency that provides an HTTP client.
    The client is automatically closed after the request.
    """
    client = httpx.Client(timeout=30.0)
    try:
        yield client
    finally:
        client.close()

async def get_async_http_client() -> Generator[httpx.AsyncClient, None, None]:
    """
    Async dependency that provides an async HTTP client.
    Perfect for making external API calls.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client
```

---

## Dependency Hierarchy

Dependencies can depend on other dependencies, creating a hierarchy that FastAPI resolves automatically.

```mermaid
graph TD
    A[Endpoint] --> B[get_current_user]
    B --> C[get_user_service]
    B --> D[security Bearer]
    C --> E[get_db]
    E --> F[SessionLocal]
```

```python
# hierarchy.py
# Layered dependencies example
from fastapi import Depends
from settings import Settings, get_settings
from database import get_db
from sqlalchemy.orm import Session

class CacheService:
    """Service for caching with configuration"""
    def __init__(self, settings: Settings):
        self.ttl = settings.cache_ttl
        self.prefix = settings.cache_prefix

def get_cache_service(settings: Settings = Depends(get_settings)) -> CacheService:
    """Cache service depends on settings"""
    return CacheService(settings)

class ProductService:
    """Service that uses both database and cache"""
    def __init__(self, db: Session, cache: CacheService):
        self.db = db
        self.cache = cache

def get_product_service(
    db: Session = Depends(get_db),
    cache: CacheService = Depends(get_cache_service)
) -> ProductService:
    """
    Product service depends on database and cache.
    FastAPI resolves the entire dependency tree automatically.
    """
    return ProductService(db, cache)
```

---

## Best Practices

### 1. Keep Dependencies Focused

Each dependency should do one thing. Split complex dependencies into smaller, composable pieces.

### 2. Use Type Hints

Always use type hints for dependency parameters and return values. This enables IDE support and automatic documentation.

### 3. Handle Cleanup with Generators

For resources that need cleanup (connections, file handles), use generator dependencies with `yield`.

### 4. Avoid Global State

Instead of global variables, inject configuration and state through dependencies. This makes testing straightforward.

### 5. Cache When Appropriate

FastAPI caches dependency results within a request by default. For expensive computations, this is usually what you want. Use `use_cache=False` when you need fresh instances.

---

## Conclusion

Dependency injection in FastAPI transforms how you structure Python web applications. By declaring dependencies explicitly:

- Code becomes easier to test with mocks
- Services remain loosely coupled
- Resource management happens automatically
- The dependency graph is visible and understandable

Start with simple function dependencies, then progress to class-based services as your application grows. The patterns shown here scale from small APIs to large production systems.

---

*Building microservices with FastAPI? [OneUptime](https://oneuptime.com) provides monitoring, alerting, and incident management to keep your services running smoothly.*

**Related Reading:**
- [How to Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Implement Rate Limiting in Python FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
