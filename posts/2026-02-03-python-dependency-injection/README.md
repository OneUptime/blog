# How to Implement Dependency Injection in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Dependency Injection, Design Patterns, Testing, FastAPI, Clean Architecture, SOLID Principles

Description: Learn how to implement dependency injection in Python using manual techniques, the dependency-injector library, protocols, and FastAPI's Depends system for cleaner, more testable code.

---

> Dependency injection sounds fancy, but it boils down to one simple idea: instead of creating dependencies inside your class, you pass them in from outside. This single change makes your code dramatically easier to test and maintain.

When I first learned about dependency injection, I thought it was overengineered Java nonsense. Then I spent three days debugging a function that created its own database connection inside a nested loop. That was the last time I wrote code without thinking about how dependencies flow through my application.

---

## What Is Dependency Injection?

Dependency injection is a pattern where objects receive their dependencies from external sources rather than creating them internally. This inverts the control - your class no longer decides which implementations to use.

Here is how the control flow changes with dependency injection:

```mermaid
graph LR
    subgraph Without DI
        A[UserService] --> B[Creates DatabaseConnection]
        A --> C[Creates EmailClient]
    end

    subgraph With DI
        D[Container/Framework] --> E[DatabaseConnection]
        D --> F[EmailClient]
        E --> G[UserService]
        F --> G
    end
```

The difference matters most when testing. Without DI, your tests must deal with real databases and email servers. With DI, you swap in mocks and test your logic in isolation.

---

## The Problem with Hard-Coded Dependencies

Consider this common pattern where a service creates its own dependencies internally. This creates tight coupling that makes testing and maintenance difficult.

```python
# bad_example.py
# This class creates its own dependencies - hard to test and maintain
import smtplib
import psycopg2

class UserService:
    def __init__(self):
        # Hard-coded dependency creation - this is the problem
        self.db = psycopg2.connect(
            host="localhost",
            database="myapp",
            user="admin",
            password="secret"
        )
        self.email_client = smtplib.SMTP("smtp.gmail.com", 587)

    def create_user(self, email: str, name: str) -> dict:
        # This method is impossible to test without a real database
        cursor = self.db.cursor()
        cursor.execute(
            "INSERT INTO users (email, name) VALUES (%s, %s) RETURNING id",
            (email, name)
        )
        user_id = cursor.fetchone()[0]
        self.db.commit()

        # And it sends real emails during tests
        self.email_client.send_message(f"Welcome {name}!")

        return {"id": user_id, "email": email, "name": name}
```

This code has several problems:

- Cannot test without a real PostgreSQL database
- Sends actual emails during test runs
- Connection parameters are buried in business logic
- Cannot reuse with different databases or email providers

---

## Manual Dependency Injection

The simplest form of DI passes dependencies through the constructor. No frameworks required - just thoughtful design.

This refactored version accepts its dependencies through the constructor, making them explicit and replaceable.

```python
# manual_di.py
# Dependencies are passed in through the constructor
from typing import Protocol
from dataclasses import dataclass

class Database(Protocol):
    """Protocol defining what a database connection must provide"""
    def execute(self, query: str, params: tuple) -> None: ...
    def fetchone(self) -> tuple: ...
    def commit(self) -> None: ...

class EmailClient(Protocol):
    """Protocol defining what an email client must provide"""
    def send(self, to: str, subject: str, body: str) -> None: ...

@dataclass
class User:
    """Simple data class representing a user"""
    id: int
    email: str
    name: str

class UserService:
    """User service that receives dependencies through constructor"""

    def __init__(self, db: Database, email_client: EmailClient):
        # Dependencies are injected - not created internally
        self.db = db
        self.email_client = email_client

    def create_user(self, email: str, name: str) -> User:
        # Business logic stays the same
        self.db.execute(
            "INSERT INTO users (email, name) VALUES (%s, %s) RETURNING id",
            (email, name)
        )
        result = self.db.fetchone()
        self.db.commit()

        user = User(id=result[0], email=email, name=name)

        # Send welcome email
        self.email_client.send(
            to=email,
            subject="Welcome!",
            body=f"Hello {name}, welcome to our platform!"
        )

        return user
```

Now you can wire up the real implementations in your application's entry point.

```python
# main.py
# Wire up real implementations at the application boundary
import psycopg2
import smtplib
from email.message import EmailMessage

class PostgresDatabase:
    """Real PostgreSQL implementation"""

    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)
        self.cursor = self.conn.cursor()

    def execute(self, query: str, params: tuple) -> None:
        self.cursor.execute(query, params)

    def fetchone(self) -> tuple:
        return self.cursor.fetchone()

    def commit(self) -> None:
        self.conn.commit()

class SmtpEmailClient:
    """Real SMTP email implementation"""

    def __init__(self, host: str, port: int, username: str, password: str):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

    def send(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["To"] = to
        msg.set_content(body)

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)

# Application entry point - this is where you wire everything together
def create_app():
    # Create real implementations
    db = PostgresDatabase("postgresql://admin:secret@localhost/myapp")
    email = SmtpEmailClient(
        host="smtp.gmail.com",
        port=587,
        username="app@example.com",
        password="app-password"
    )

    # Inject into service
    user_service = UserService(db=db, email_client=email)

    return user_service
```

---

## Using Protocols for Type Safety

Python's Protocol class (from typing module) lets you define interfaces without inheritance. This is structural subtyping - if an object has the right methods, it satisfies the protocol.

Protocols define the contract that implementations must follow, enabling both type checking and flexibility.

```python
# protocols.py
# Define protocols for all your dependencies
from typing import Protocol, Optional, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class User:
    id: int
    email: str
    name: str
    created_at: datetime

class UserRepository(Protocol):
    """Protocol for user data access"""

    def create(self, email: str, name: str) -> User:
        """Create a new user and return it"""
        ...

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Find user by ID, return None if not found"""
        ...

    def get_by_email(self, email: str) -> Optional[User]:
        """Find user by email, return None if not found"""
        ...

    def list_all(self, limit: int = 100, offset: int = 0) -> List[User]:
        """List users with pagination"""
        ...

    def delete(self, user_id: int) -> bool:
        """Delete user, return True if deleted"""
        ...

class PasswordHasher(Protocol):
    """Protocol for password hashing"""

    def hash(self, password: str) -> str:
        """Hash a plain text password"""
        ...

    def verify(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        ...

class EventPublisher(Protocol):
    """Protocol for publishing domain events"""

    def publish(self, event_type: str, payload: dict) -> None:
        """Publish an event to the message bus"""
        ...

class Logger(Protocol):
    """Protocol for logging - matches standard library interface"""

    def debug(self, msg: str, *args, **kwargs) -> None: ...
    def info(self, msg: str, *args, **kwargs) -> None: ...
    def warning(self, msg: str, *args, **kwargs) -> None: ...
    def error(self, msg: str, *args, **kwargs) -> None: ...
```

Now your service can depend on these protocols instead of concrete implementations.

```python
# user_service.py
# Service depends on protocols, not concrete implementations
from typing import Optional

class UserService:
    """Service layer with injected dependencies following protocols"""

    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
        event_publisher: EventPublisher,
        logger: Logger
    ):
        self.user_repo = user_repo
        self.password_hasher = password_hasher
        self.events = event_publisher
        self.logger = logger

    def register_user(self, email: str, name: str, password: str) -> User:
        """Register a new user with hashed password"""
        self.logger.info(f"Registering user: {email}")

        # Check if user already exists
        existing = self.user_repo.get_by_email(email)
        if existing:
            self.logger.warning(f"Registration failed - email exists: {email}")
            raise ValueError(f"User with email {email} already exists")

        # Hash the password before storing
        hashed_password = self.password_hasher.hash(password)

        # Create user in repository
        user = self.user_repo.create(email=email, name=name)

        # Publish event for other services
        self.events.publish("user.registered", {
            "user_id": user.id,
            "email": user.email,
            "name": user.name
        })

        self.logger.info(f"User registered successfully: {user.id}")
        return user

    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password"""
        user = self.user_repo.get_by_email(email)

        if not user:
            self.logger.debug(f"Auth failed - user not found: {email}")
            return None

        # In real code, you would store the hash with the user
        # This is simplified for the example
        if not self.password_hasher.verify(password, "stored_hash"):
            self.logger.debug(f"Auth failed - wrong password: {email}")
            return None

        self.logger.info(f"User authenticated: {user.id}")
        return user
```

---

## Using Abstract Base Classes

When you want to enforce that subclasses implement certain methods, use abstract base classes. Unlike protocols, ABCs require explicit inheritance.

Abstract base classes provide a stronger contract by raising errors if implementations are incomplete.

```python
# abstract_base.py
# Use ABC when you want to enforce inheritance
from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class Order:
    id: str
    customer_id: str
    total: float
    status: str

class OrderRepository(ABC):
    """Abstract base class for order storage"""

    @abstractmethod
    def save(self, order: Order) -> None:
        """Save or update an order"""
        pass

    @abstractmethod
    def get(self, order_id: str) -> Optional[Order]:
        """Retrieve order by ID"""
        pass

    @abstractmethod
    def list_by_customer(self, customer_id: str) -> List[Order]:
        """Get all orders for a customer"""
        pass

    # Concrete method that uses abstract methods
    def exists(self, order_id: str) -> bool:
        """Check if order exists - implemented using abstract get()"""
        return self.get(order_id) is not None


class PaymentGateway(ABC):
    """Abstract base class for payment processing"""

    @abstractmethod
    def charge(self, amount: float, token: str) -> str:
        """Charge a payment method, return transaction ID"""
        pass

    @abstractmethod
    def refund(self, transaction_id: str, amount: Optional[float] = None) -> str:
        """Refund a transaction, return refund ID"""
        pass

    @abstractmethod
    def get_status(self, transaction_id: str) -> str:
        """Get transaction status"""
        pass
```

Here is a concrete implementation of the abstract repository.

```python
# postgres_order_repo.py
# Concrete implementation of the abstract repository
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor

class PostgresOrderRepository(OrderRepository):
    """PostgreSQL implementation of OrderRepository"""

    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)

    def save(self, order: Order) -> None:
        """Insert or update order in PostgreSQL"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO orders (id, customer_id, total, status)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    total = EXCLUDED.total,
                    status = EXCLUDED.status
            """, (order.id, order.customer_id, order.total, order.status))
        self.conn.commit()

    def get(self, order_id: str) -> Optional[Order]:
        """Fetch order by ID from PostgreSQL"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
            row = cur.fetchone()

            if not row:
                return None

            return Order(
                id=row["id"],
                customer_id=row["customer_id"],
                total=float(row["total"]),
                status=row["status"]
            )

    def list_by_customer(self, customer_id: str) -> List[Order]:
        """List all orders for a customer"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM orders WHERE customer_id = %s ORDER BY id",
                (customer_id,)
            )
            rows = cur.fetchall()

            return [
                Order(
                    id=row["id"],
                    customer_id=row["customer_id"],
                    total=float(row["total"]),
                    status=row["status"]
                )
                for row in rows
            ]
```

---

## The dependency-injector Library

For larger applications, the dependency-injector library provides a container that manages object creation and lifecycle. It handles singletons, factories, and complex wiring automatically.

First, install the library.

```bash
pip install dependency-injector
```

Define a container that declares all your dependencies and how they should be created.

```python
# containers.py
# Centralized dependency container using dependency-injector
from dependency_injector import containers, providers
from dependency_injector.wiring import inject, Provide
import logging

# Import your implementations
from repositories import PostgresUserRepository, PostgresOrderRepository
from services import UserService, OrderService, PaymentService
from clients import StripePaymentGateway, SendGridEmailClient
from config import Settings

class Container(containers.DeclarativeContainer):
    """Application dependency container"""

    # Configuration provider - loads from environment/files
    config = providers.Configuration()

    # Logging provider - singleton logger
    logger = providers.Singleton(
        logging.getLogger,
        name="app"
    )

    # Database connection - singleton to reuse connection
    db_connection = providers.Singleton(
        PostgresUserRepository,
        connection_string=config.database.url
    )

    # Repositories - singletons that share the db connection
    user_repository = providers.Singleton(
        PostgresUserRepository,
        connection_string=config.database.url
    )

    order_repository = providers.Singleton(
        PostgresOrderRepository,
        connection_string=config.database.url
    )

    # External service clients
    payment_gateway = providers.Singleton(
        StripePaymentGateway,
        api_key=config.stripe.api_key,
        webhook_secret=config.stripe.webhook_secret
    )

    email_client = providers.Singleton(
        SendGridEmailClient,
        api_key=config.sendgrid.api_key,
        from_email=config.sendgrid.from_email
    )

    # Services - depend on repositories and clients
    user_service = providers.Factory(
        UserService,
        user_repo=user_repository,
        email_client=email_client,
        logger=logger
    )

    order_service = providers.Factory(
        OrderService,
        order_repo=order_repository,
        user_repo=user_repository,
        payment_gateway=payment_gateway,
        logger=logger
    )

    payment_service = providers.Factory(
        PaymentService,
        payment_gateway=payment_gateway,
        order_repo=order_repository,
        logger=logger
    )
```

Now you can use the container to wire dependencies into your functions.

```python
# app.py
# Using the container to wire dependencies
from dependency_injector.wiring import inject, Provide
from containers import Container

# The @inject decorator tells dependency-injector to fill in Provide() defaults
@inject
def create_user_handler(
    email: str,
    name: str,
    password: str,
    user_service: UserService = Provide[Container.user_service]
) -> dict:
    """Handler that receives user_service automatically"""
    user = user_service.register_user(email, name, password)
    return {"id": user.id, "email": user.email}

@inject
def process_order_handler(
    order_id: str,
    order_service: OrderService = Provide[Container.order_service],
    payment_service: PaymentService = Provide[Container.payment_service]
) -> dict:
    """Handler with multiple injected services"""
    order = order_service.get_order(order_id)
    payment = payment_service.process(order)
    return {"order_id": order.id, "payment_status": payment.status}

# Application startup
def main():
    # Create and configure container
    container = Container()
    container.config.from_yaml("config.yaml")

    # Wire the container to modules that use @inject
    container.wire(modules=[__name__])

    # Now you can call handlers without passing dependencies
    result = create_user_handler(
        email="user@example.com",
        name="John",
        password="secure123"
    )
    print(result)

if __name__ == "__main__":
    main()
```

Here is how the container manages the dependency graph:

```mermaid
graph TD
    A[Container] --> B[config]
    A --> C[logger]
    A --> D[user_repository]
    A --> E[order_repository]
    A --> F[payment_gateway]
    A --> G[email_client]

    D --> H[UserService]
    G --> H
    C --> H

    E --> I[OrderService]
    D --> I
    F --> I
    C --> I

    F --> J[PaymentService]
    E --> J
    C --> J

    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
```

---

## FastAPI and Depends

FastAPI has built-in dependency injection through its Depends system. It is simpler than a full DI container but works well for web applications.

FastAPI's Depends function allows you to declare dependencies that are resolved automatically for each request.

```python
# fastapi_di.py
# Dependency injection with FastAPI's Depends
from fastapi import FastAPI, Depends, HTTPException
from typing import Annotated
from functools import lru_cache
import os

# Pydantic settings for configuration
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment"""
    database_url: str = "postgresql://localhost/myapp"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "change-me-in-production"

    class Config:
        env_file = ".env"

# Cache settings so we do not reload from env on every request
@lru_cache
def get_settings() -> Settings:
    """Cached settings loader"""
    return Settings()

# Type alias for cleaner dependency declarations
SettingsDep = Annotated[Settings, Depends(get_settings)]

app = FastAPI()

# Database session dependency
async def get_db(settings: SettingsDep):
    """Create database session for request"""
    from databases import Database

    db = Database(settings.database_url)
    await db.connect()
    try:
        yield db  # Provide to route handler
    finally:
        await db.disconnect()  # Cleanup after request

# Type alias for database dependency
DatabaseDep = Annotated[Database, Depends(get_db)]

# Repository dependencies that use the database
class UserRepository:
    """User repository with injected database"""

    def __init__(self, db: Database):
        self.db = db

    async def get_by_id(self, user_id: int) -> dict:
        query = "SELECT * FROM users WHERE id = :id"
        return await self.db.fetch_one(query, {"id": user_id})

    async def create(self, email: str, name: str) -> dict:
        query = """
            INSERT INTO users (email, name)
            VALUES (:email, :name)
            RETURNING id, email, name
        """
        return await self.db.fetch_one(query, {"email": email, "name": name})

async def get_user_repository(db: DatabaseDep) -> UserRepository:
    """Factory function for UserRepository"""
    return UserRepository(db)

UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]

# Service layer with multiple dependencies
class UserService:
    """User service with injected repository"""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, email: str, name: str) -> dict:
        # Check for existing user
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        return await self.user_repo.create(email, name)

async def get_user_service(user_repo: UserRepoDep) -> UserService:
    """Factory function for UserService"""
    return UserService(user_repo)

UserServiceDep = Annotated[UserService, Depends(get_user_service)]
```

Use these dependencies in your route handlers.

```python
# routes.py
# Route handlers using FastAPI dependency injection
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

app = FastAPI()

class UserCreate(BaseModel):
    email: EmailStr
    name: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str

@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    user_service: UserServiceDep  # Automatically injected
):
    """Create a new user - service is injected automatically"""
    try:
        user = await user_service.register(
            email=user_data.email,
            name=user_data.name
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_repo: UserRepoDep  # Can inject repository directly too
):
    """Get user by ID - repository injected directly"""
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Authentication dependency example
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepoDep = None
) -> dict:
    """Validate token and return current user"""
    user_id = decode_token(token)  # Your token decoding logic
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

CurrentUserDep = Annotated[dict, Depends(get_current_user)]

@app.get("/me")
async def get_current_user_info(current_user: CurrentUserDep):
    """Protected endpoint - requires authentication"""
    return current_user
```

Here is how the FastAPI dependency chain works:

```mermaid
graph TD
    A[Route Handler] --> B[UserService]
    B --> C[UserRepository]
    C --> D[Database Session]
    D --> E[Settings]

    F[get_settings] --> E
    G[get_db] --> D
    H[get_user_repository] --> C
    I[get_user_service] --> B

    style A fill:#f9f,stroke:#333
    style E fill:#bbf,stroke:#333
```

---

## Testing with Dependency Injection

The real payoff of DI comes when testing. You can swap real implementations for mocks without changing your business logic.

Create test doubles that implement your protocols.

```python
# test_doubles.py
# Test doubles for unit testing
from typing import Optional, List, Dict
from datetime import datetime

class FakeUserRepository:
    """In-memory fake repository for testing"""

    def __init__(self):
        self.users: Dict[int, User] = {}
        self.next_id = 1

    def create(self, email: str, name: str) -> User:
        """Create user in memory"""
        user = User(
            id=self.next_id,
            email=email,
            name=name,
            created_at=datetime.utcnow()
        )
        self.users[user.id] = user
        self.next_id += 1
        return user

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Look up user by ID"""
        return self.users.get(user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        """Look up user by email"""
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    def list_all(self, limit: int = 100, offset: int = 0) -> List[User]:
        """List all users with pagination"""
        all_users = list(self.users.values())
        return all_users[offset:offset + limit]

    def delete(self, user_id: int) -> bool:
        """Delete user if exists"""
        if user_id in self.users:
            del self.users[user_id]
            return True
        return False

    # Test helper methods
    def add_user(self, user: User) -> None:
        """Directly add a user for test setup"""
        self.users[user.id] = user
        if user.id >= self.next_id:
            self.next_id = user.id + 1

    def clear(self) -> None:
        """Clear all users"""
        self.users.clear()
        self.next_id = 1


class FakePasswordHasher:
    """Fake password hasher that uses predictable hashing for tests"""

    def hash(self, password: str) -> str:
        """Return predictable hash for testing"""
        return f"hashed:{password}"

    def verify(self, password: str, hashed: str) -> bool:
        """Verify against predictable hash"""
        return hashed == f"hashed:{password}"


class FakeEventPublisher:
    """Fake event publisher that captures events for verification"""

    def __init__(self):
        self.events: List[tuple] = []

    def publish(self, event_type: str, payload: dict) -> None:
        """Capture event for later verification"""
        self.events.append((event_type, payload))

    # Test helper methods
    def get_events(self, event_type: str = None) -> List[tuple]:
        """Get captured events, optionally filtered by type"""
        if event_type:
            return [(t, p) for t, p in self.events if t == event_type]
        return self.events.copy()

    def clear(self) -> None:
        """Clear captured events"""
        self.events.clear()

    def assert_published(self, event_type: str, payload_contains: dict = None):
        """Assert that an event was published"""
        matching = self.get_events(event_type)
        assert matching, f"Expected event {event_type} was not published"

        if payload_contains:
            for _, payload in matching:
                if all(payload.get(k) == v for k, v in payload_contains.items()):
                    return
            assert False, f"No {event_type} event matched {payload_contains}"


class FakeLogger:
    """Fake logger that captures log messages"""

    def __init__(self):
        self.messages: List[tuple] = []

    def debug(self, msg: str, *args, **kwargs) -> None:
        self.messages.append(("debug", msg))

    def info(self, msg: str, *args, **kwargs) -> None:
        self.messages.append(("info", msg))

    def warning(self, msg: str, *args, **kwargs) -> None:
        self.messages.append(("warning", msg))

    def error(self, msg: str, *args, **kwargs) -> None:
        self.messages.append(("error", msg))
```

Now write tests using these fakes.

```python
# test_user_service.py
# Unit tests using fake dependencies
import pytest
from datetime import datetime
from user_service import UserService
from test_doubles import (
    FakeUserRepository,
    FakePasswordHasher,
    FakeEventPublisher,
    FakeLogger
)

class TestUserService:
    """Test suite for UserService"""

    def setup_method(self):
        """Set up fresh fakes for each test"""
        self.user_repo = FakeUserRepository()
        self.password_hasher = FakePasswordHasher()
        self.event_publisher = FakeEventPublisher()
        self.logger = FakeLogger()

        # Create service with injected fakes
        self.service = UserService(
            user_repo=self.user_repo,
            password_hasher=self.password_hasher,
            event_publisher=self.event_publisher,
            logger=self.logger
        )

    def test_register_user_creates_user(self):
        """Should create user with provided details"""
        user = self.service.register_user(
            email="test@example.com",
            name="Test User",
            password="secret123"
        )

        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.id is not None

    def test_register_user_publishes_event(self):
        """Should publish user.registered event"""
        user = self.service.register_user(
            email="test@example.com",
            name="Test User",
            password="secret123"
        )

        # Verify event was published with correct data
        self.event_publisher.assert_published(
            "user.registered",
            payload_contains={"email": "test@example.com"}
        )

    def test_register_duplicate_email_raises_error(self):
        """Should reject registration with existing email"""
        # First registration succeeds
        self.service.register_user(
            email="test@example.com",
            name="First User",
            password="secret123"
        )

        # Second registration with same email fails
        with pytest.raises(ValueError) as exc_info:
            self.service.register_user(
                email="test@example.com",
                name="Second User",
                password="different123"
            )

        assert "already exists" in str(exc_info.value)

    def test_register_logs_registration(self):
        """Should log successful registration"""
        self.service.register_user(
            email="test@example.com",
            name="Test User",
            password="secret123"
        )

        # Verify info log was recorded
        info_logs = [msg for level, msg in self.logger.messages if level == "info"]
        assert any("test@example.com" in msg for msg in info_logs)
```

---

## Testing FastAPI with Dependency Overrides

FastAPI allows you to override dependencies for testing using the dependency_overrides dictionary.

```python
# test_fastapi.py
# Testing FastAPI endpoints with dependency overrides
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

from main import app, get_db, get_user_repository
from test_doubles import FakeUserRepository

# Create a test client
client = TestClient(app)

class TestUserEndpoints:
    """Test suite for user API endpoints"""

    def setup_method(self):
        """Set up fake repository for each test"""
        self.fake_repo = FakeUserRepository()

        # Override the dependency
        app.dependency_overrides[get_user_repository] = lambda: self.fake_repo

    def teardown_method(self):
        """Clear overrides after each test"""
        app.dependency_overrides.clear()

    def test_create_user_returns_201(self):
        """POST /users should return 201 on success"""
        response = client.post(
            "/users",
            json={"email": "test@example.com", "name": "Test User"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert "id" in data

    def test_create_duplicate_user_returns_400(self):
        """POST /users should return 400 for duplicate email"""
        # Create first user
        client.post(
            "/users",
            json={"email": "test@example.com", "name": "First"}
        )

        # Try to create duplicate
        response = client.post(
            "/users",
            json={"email": "test@example.com", "name": "Second"}
        )

        assert response.status_code == 400

    def test_get_user_returns_404_for_nonexistent(self):
        """GET /users/{id} should return 404 if not found"""
        response = client.get("/users/999")

        assert response.status_code == 404

    def test_get_user_returns_user(self):
        """GET /users/{id} should return user if found"""
        # Create user first
        create_response = client.post(
            "/users",
            json={"email": "test@example.com", "name": "Test"}
        )
        user_id = create_response.json()["id"]

        # Fetch the user
        response = client.get(f"/users/{user_id}")

        assert response.status_code == 200
        assert response.json()["email"] == "test@example.com"


# For async testing with database
@pytest.fixture
async def async_client():
    """Create async test client"""
    from httpx import AsyncClient

    # Override database dependency with test database
    async def get_test_db():
        from databases import Database
        db = Database("postgresql://localhost/test_db")
        await db.connect()
        try:
            yield db
        finally:
            await db.disconnect()

    app.dependency_overrides[get_db] = get_test_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_user_integration(async_client):
    """Integration test with real async client"""
    response = await async_client.post(
        "/users",
        json={"email": "test@example.com", "name": "Test"}
    )

    assert response.status_code == 201
```

---

## Container Configuration for Different Environments

Configure your DI container differently based on the environment (development, testing, production).

```python
# container_config.py
# Environment-specific container configuration
from dependency_injector import containers, providers
import os

class Container(containers.DeclarativeContainer):
    """Container with environment-aware configuration"""

    # Configuration loaded from environment
    config = providers.Configuration()

    # Environment detection
    environment = providers.Object(os.getenv("ENVIRONMENT", "development"))

    # Database - different implementations per environment
    database = providers.Selector(
        environment,
        development=providers.Singleton(
            SqliteDatabase,
            path="./dev.db"
        ),
        testing=providers.Singleton(
            InMemoryDatabase
        ),
        production=providers.Singleton(
            PostgresDatabase,
            connection_string=config.database.url
        ),
    )

    # Cache - Redis in production, in-memory otherwise
    cache = providers.Selector(
        environment,
        development=providers.Singleton(InMemoryCache),
        testing=providers.Singleton(InMemoryCache),
        production=providers.Singleton(
            RedisCache,
            url=config.redis.url
        ),
    )

    # Email - fake in dev/test, real in production
    email_client = providers.Selector(
        environment,
        development=providers.Singleton(ConsoleEmailClient),  # Prints to console
        testing=providers.Singleton(FakeEmailClient),  # Captures for assertions
        production=providers.Singleton(
            SendGridClient,
            api_key=config.sendgrid.api_key
        ),
    )


def create_container(environment: str = None) -> Container:
    """Factory function to create configured container"""
    container = Container()

    # Override environment if specified
    if environment:
        container.environment.override(environment)

    # Load config file based on environment
    env = environment or os.getenv("ENVIRONMENT", "development")
    config_file = f"config.{env}.yaml"

    if os.path.exists(config_file):
        container.config.from_yaml(config_file)

    # Also load from environment variables
    container.config.from_env("APP")

    return container


# Usage in different contexts
def create_production_app():
    """Create production application"""
    container = create_container("production")
    container.wire(modules=["routes", "handlers"])
    return container


def create_test_container():
    """Create container for testing"""
    container = create_container("testing")
    return container
```

---

## Best Practices Summary

1. **Depend on abstractions** - Use protocols or ABCs instead of concrete classes
2. **Inject at the boundary** - Create dependencies at application entry points
3. **Keep constructors simple** - Only assign dependencies, do not perform logic
4. **Use factory functions** - For complex object creation
5. **Prefer composition** - Build complex objects from simple, injected parts
6. **Make dependencies explicit** - If a class needs something, it should be a parameter
7. **Use type hints** - They serve as documentation and enable IDE support
8. **Test with fakes, not mocks** - Fakes are simpler and more maintainable

---

## When Not to Use DI

Dependency injection is not always the right choice:

- **Simple scripts** - A 50-line script does not need a DI container
- **Static utilities** - Pure functions without state do not need injection
- **Framework internals** - Let the framework manage its own dependencies
- **Performance-critical paths** - The indirection can add overhead

Start simple. Add DI when you feel the pain of hard-coded dependencies - usually when testing becomes difficult.

---

*Building Python applications with clean architecture? [OneUptime](https://oneuptime.com) helps you monitor your services with built-in support for health checks, logging, and distributed tracing.*

**Related Reading:**
- [How to Build Health Checks and Readiness Probes in Python](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Structure Logs Properly in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
