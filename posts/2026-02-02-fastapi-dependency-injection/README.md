# How to Use Dependency Injection in FastAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, Dependency Injection, Design Patterns, Testing

Description: Master FastAPI's dependency injection system for cleaner code, better testing, and proper separation of concerns in your API applications.

---

If you've worked with FastAPI for any length of time, you've probably noticed the `Depends()` function popping up everywhere. That's FastAPI's dependency injection system at work, and it's one of the framework's killer features. Let me walk you through how it works and why you should be using it.

## What Is Dependency Injection in FastAPI?

Dependency injection (DI) is a design pattern where objects receive their dependencies from external sources rather than creating them internally. FastAPI has this baked right into the framework, and it makes your code significantly cleaner and easier to test.

Here's the basic idea: instead of your endpoint functions creating database connections, authentication objects, or service instances directly, you declare what you need and FastAPI hands it to you.

## Basic Function Dependencies

The simplest form of dependency is just a function. FastAPI will call this function and inject the result into your endpoint.

```python
from fastapi import FastAPI, Depends, Query

app = FastAPI()

# A simple dependency that extracts and validates pagination params
def get_pagination(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Max items to return")
) -> dict:
    return {"skip": skip, "limit": limit}

@app.get("/items/")
def list_items(pagination: dict = Depends(get_pagination)):
    # pagination is automatically populated with skip and limit
    return {
        "skip": pagination["skip"],
        "limit": pagination["limit"],
        "items": ["item1", "item2", "item3"]
    }
```

This might seem like extra work for simple pagination, but the dependency is now reusable across all your endpoints. Change it once, and every endpoint using it gets updated.

## Class-Based Dependencies

When your dependencies need to hold state or have more complex initialization, classes work great. FastAPI supports using classes as dependencies directly.

```python
from fastapi import FastAPI, Depends, Header, HTTPException

app = FastAPI()

class AuthenticatedUser:
    """Dependency that validates API key and provides user context."""

    def __init__(self, x_api_key: str = Header(...)):
        # In production, you'd validate against a database
        valid_keys = {
            "secret-key-123": {"user_id": 1, "role": "admin"},
            "secret-key-456": {"user_id": 2, "role": "user"}
        }

        if x_api_key not in valid_keys:
            raise HTTPException(status_code=401, detail="Invalid API key")

        user_data = valid_keys[x_api_key]
        self.user_id = user_data["user_id"]
        self.role = user_data["role"]

@app.get("/profile")
def get_profile(user: AuthenticatedUser = Depends()):
    # Note: Depends() with no argument uses the type hint
    return {"user_id": user.user_id, "role": user.role}

@app.get("/admin")
def admin_only(user: AuthenticatedUser = Depends()):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"message": "Welcome, admin!"}
```

## Dependency Trees (Dependencies with Dependencies)

Here's where things get interesting. Dependencies can have their own dependencies, and FastAPI handles the entire chain for you.

```python
from fastapi import FastAPI, Depends, HTTPException
from typing import Optional

app = FastAPI()

# Level 1: Database connection
def get_database():
    # Simulating a database connection
    db = {"connected": True, "name": "production_db"}
    try:
        yield db
    finally:
        # Cleanup happens here after request completes
        print("Closing database connection")

# Level 2: User repository depends on database
class UserRepository:
    def __init__(self, db: dict = Depends(get_database)):
        self.db = db

    def get_user(self, user_id: int) -> Optional[dict]:
        # Simulated database lookup
        users = {1: {"id": 1, "name": "Alice"}, 2: {"id": 2, "name": "Bob"}}
        return users.get(user_id)

# Level 3: User service depends on repository
class UserService:
    def __init__(self, repo: UserRepository = Depends()):
        self.repo = repo

    def get_user_with_greeting(self, user_id: int) -> dict:
        user = self.repo.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"greeting": f"Hello, {user['name']}!", "user": user}

@app.get("/users/{user_id}")
def get_user(user_id: int, service: UserService = Depends()):
    # FastAPI resolves the entire dependency tree automatically
    return service.get_user_with_greeting(user_id)
```

The dependency resolution order is: `get_database` -> `UserRepository` -> `UserService` -> endpoint. FastAPI figures this out and executes everything in the right order.

## Common Dependency Patterns

Here's a quick reference for patterns you'll use frequently:

| Pattern | Use Case | Example |
|---------|----------|---------|
| Function dependency | Simple transformations, validation | Pagination, query parsing |
| Class dependency | Stateful services, complex logic | Auth handlers, repositories |
| Generator dependency | Resource management with cleanup | DB connections, file handles |
| Cached dependency | Expensive computations | Config loading, ML models |
| Path-specific dependency | Route-level requirements | Admin routes, versioned APIs |

## Scoped Dependencies with yield

When you need cleanup logic (closing connections, releasing locks), use `yield` in your dependency:

```python
from fastapi import FastAPI, Depends
from contextlib import contextmanager

app = FastAPI()

class DatabaseSession:
    """Simulated database session with transaction support."""

    def __init__(self):
        self.committed = False
        self.rolled_back = False

    def commit(self):
        self.committed = True
        print("Transaction committed")

    def rollback(self):
        self.rolled_back = True
        print("Transaction rolled back")

    def close(self):
        print("Session closed")

def get_db_session():
    """Dependency that provides a database session with automatic cleanup."""
    session = DatabaseSession()
    try:
        yield session
        # If we get here without an exception, commit
        session.commit()
    except Exception:
        # On any exception, rollback
        session.rollback()
        raise
    finally:
        # Always close the session
        session.close()

@app.post("/orders")
def create_order(session: DatabaseSession = Depends(get_db_session)):
    # Work with the session - cleanup is automatic
    return {"status": "Order created", "session_active": True}
```

## Testing with Dependency Overrides

This is honestly where dependency injection shines brightest. You can swap out any dependency during testing without touching your application code.

```python
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

app = FastAPI()

# Production dependency - talks to real external service
def get_payment_processor():
    return {"type": "stripe", "live": True}

@app.post("/charge")
def charge_card(processor: dict = Depends(get_payment_processor)):
    return {"processor": processor["type"], "charged": True}

# --- Testing code ---

# Mock dependency for testing - no external calls
def mock_payment_processor():
    return {"type": "mock", "live": False}

def test_charge_endpoint():
    # Override the dependency just for this test
    app.dependency_overrides[get_payment_processor] = mock_payment_processor

    client = TestClient(app)
    response = client.post("/charge")

    assert response.status_code == 200
    assert response.json()["processor"] == "mock"

    # Clean up - remove the override
    app.dependency_overrides.clear()
```

You can override any dependency in the tree, not just top-level ones. This makes it trivial to test components in isolation.

## Global Dependencies

Sometimes you want a dependency to run on every request in a group of routes:

```python
from fastapi import FastAPI, Depends, HTTPException, Header

def verify_internal_token(x_internal_token: str = Header(...)):
    """Dependency that verifies requests come from internal services."""
    if x_internal_token != "internal-secret":
        raise HTTPException(status_code=403, detail="Internal access only")
    return True

# Apply to entire app
app = FastAPI(dependencies=[Depends(verify_internal_token)])

# Or apply to specific router
from fastapi import APIRouter

internal_router = APIRouter(
    prefix="/internal",
    dependencies=[Depends(verify_internal_token)]
)

@internal_router.get("/metrics")
def get_metrics():
    return {"cpu": 45, "memory": 62}
```

## Wrapping Up

FastAPI's dependency injection system is one of those features that feels simple on the surface but enables really clean architecture. The key takeaways:

- Use function dependencies for simple cases, classes when you need state
- Dependencies can depend on other dependencies - FastAPI handles the tree
- Use `yield` when you need cleanup logic
- Override dependencies in tests to avoid hitting external services
- Apply global dependencies for cross-cutting concerns like auth

Once you start structuring your FastAPI apps around dependency injection, you'll find your code becomes more modular, easier to test, and simpler to maintain. It takes a bit of getting used to, but it's worth the investment.
