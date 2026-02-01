# How to Build Microservices Architecture in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Microservices, FastAPI, Architecture, Docker, Kubernetes

Description: A comprehensive guide to building production-ready microservices architecture in Python. Learn service design, inter-service communication, API gateways, service discovery, and deployment patterns with FastAPI, Docker, and Kubernetes.

---

> Microservices architecture breaks down monolithic applications into smaller, independently deployable services. This guide walks you through building a complete microservices system in Python, from service design to production deployment.

Microservices enable teams to build, deploy, and scale components independently. When done right, they offer flexibility, resilience, and faster development cycles. When done wrong, they create distributed complexity nightmares. This guide focuses on practical patterns that work.

---

## Why Microservices?

Before diving in, understand when microservices make sense:

**Use microservices when:**
- Teams need to deploy independently
- Different components have different scaling needs
- You need technology flexibility per component
- Development complexity requires team boundaries

**Avoid microservices when:**
- You have a small team (under 5 engineers)
- The domain is not well understood
- You are building an MVP
- Operational maturity is low

---

## Architecture Overview

Here is the reference architecture we will build throughout this guide:

```mermaid
flowchart TB
    subgraph clients["Clients"]
        Web["Web App"]
        Mobile["Mobile App"]
        CLI["CLI Tool"]
    end

    subgraph gateway["API Gateway Layer"]
        GW["API Gateway<br/>FastAPI"]
        Auth["Auth Service<br/>JWT Validation"]
    end

    subgraph services["Core Services"]
        US["User Service<br/>Port 8001"]
        OS["Order Service<br/>Port 8002"]
        PS["Product Service<br/>Port 8003"]
        NS["Notification Service<br/>Port 8004"]
    end

    subgraph messaging["Message Broker"]
        RMQ["RabbitMQ<br/>Event Bus"]
    end

    subgraph data["Data Stores"]
        UserDB[(PostgreSQL<br/>Users)]
        OrderDB[(PostgreSQL<br/>Orders)]
        ProductDB[(PostgreSQL<br/>Products)]
        Cache[(Redis<br/>Cache)]
    end

    subgraph infra["Infrastructure"]
        SD["Service Discovery<br/>Consul/K8s DNS"]
        CB["Circuit Breaker<br/>Resilience"]
    end

    Web --> GW
    Mobile --> GW
    CLI --> GW

    GW --> Auth
    GW --> US
    GW --> OS
    GW --> PS

    US --> UserDB
    OS --> OrderDB
    PS --> ProductDB

    US --> Cache
    OS --> Cache
    PS --> Cache

    OS --> RMQ
    NS --> RMQ

    US --> SD
    OS --> SD
    PS --> SD
```

---

## Project Structure

A well-organized project structure is critical for maintainability:

```
microservices-platform/
├── docker-compose.yml           # Local development orchestration
├── docker-compose.prod.yml      # Production overrides
├── k8s/                         # Kubernetes manifests
│   ├── namespace.yml
│   ├── user-service/
│   ├── order-service/
│   ├── product-service/
│   └── api-gateway/
├── shared/                      # Shared libraries
│   ├── __init__.py
│   ├── telemetry.py            # OpenTelemetry setup
│   ├── messaging.py            # RabbitMQ client
│   ├── database.py             # Database utilities
│   └── models.py               # Shared Pydantic models
├── services/
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   └── tests/
│   ├── user-service/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── repository.py
│   │   │   └── service.py
│   │   └── tests/
│   ├── order-service/
│   └── product-service/
└── scripts/
    ├── setup.sh
    └── deploy.sh
```

---

## Shared Infrastructure Code

Start with common utilities that all services will use.

### Telemetry Setup

```python
# shared/telemetry.py
"""
OpenTelemetry configuration for distributed tracing across services.
Each service imports this module to enable trace propagation.
"""

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor


def init_telemetry(service_name: str) -> trace.Tracer:
    """
    Initialize OpenTelemetry for a microservice.
    
    Args:
        service_name: Unique identifier for this service (e.g., "user-service")
    
    Returns:
        Configured Tracer instance for creating spans
    """
    # Resource attributes identify this service in trace visualizations
    resource = Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Create and configure the tracer provider
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter - sends traces to observability backend
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv(
            "OTLP_ENDPOINT",
            "https://otlp.oneuptime.com/v1/traces"
        ),
        headers={
            "x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")
        }
    )

    # BatchSpanProcessor buffers spans and sends in batches
    # This reduces network overhead compared to sending each span individually
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    # Register as global tracer provider
    trace.set_tracer_provider(provider)

    # Configure W3C Trace Context propagator for cross-service tracing
    propagator = CompositePropagator([
        TraceContextTextMapPropagator()
    ])
    set_global_textmap(propagator)

    return trace.get_tracer(service_name)


def instrument_fastapi(app):
    """
    Apply automatic instrumentation to FastAPI application.
    This creates spans for all HTTP requests automatically.
    """
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
```

### Database Utilities

```python
# shared/database.py
"""
Database connection management with connection pooling.
Supports both sync and async database operations.
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base, sessionmaker

# Base class for SQLAlchemy models
Base = declarative_base()


class DatabaseManager:
    """
    Manages database connections with proper pooling configuration.
    Each microservice should create its own DatabaseManager instance
    with its specific database URL.
    """

    def __init__(self, database_url: str):
        """
        Initialize database manager with connection URL.
        
        Args:
            database_url: PostgreSQL connection string
                         Format: postgresql+asyncpg://user:pass@host:port/db
        """
        self.database_url = database_url
        
        # Create async engine with connection pool settings
        # pool_size: Number of connections to keep open
        # max_overflow: Additional connections allowed when pool is exhausted
        # pool_timeout: Seconds to wait for connection before error
        self.engine = create_async_engine(
            database_url,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=3600,  # Recycle connections after 1 hour
            echo=os.getenv("SQL_ECHO", "false").lower() == "true"
        )

        # Session factory for creating database sessions
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Provide a transactional scope around a series of operations.
        
        Usage:
            async with db.get_session() as session:
                user = await session.get(User, user_id)
        """
        session = self.async_session()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def create_tables(self):
        """Create all tables defined in the models."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self):
        """Close the database connection pool."""
        await self.engine.dispose()
```

### Message Bus Client

```python
# shared/messaging.py
"""
RabbitMQ client for event-driven communication between services.
Supports publishing events and consuming from queues with trace propagation.
"""

import json
import asyncio
from typing import Callable, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

import aio_pika
from aio_pika import Message, ExchangeType
from opentelemetry import trace
from opentelemetry.propagate import inject, extract
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)


@dataclass
class Event:
    """
    Base event class for inter-service communication.
    All events should include metadata for tracing and debugging.
    """
    event_type: str
    payload: Dict[str, Any]
    timestamp: str = None
    trace_context: Dict[str, str] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
        if self.trace_context is None:
            self.trace_context = {}


class MessageBus:
    """
    RabbitMQ message bus for publishing and consuming events.
    Handles connection management and automatic reconnection.
    """

    def __init__(self, rabbitmq_url: str, service_name: str):
        """
        Initialize message bus client.
        
        Args:
            rabbitmq_url: AMQP connection string
            service_name: Name of the service using this client
        """
        self.rabbitmq_url = rabbitmq_url
        self.service_name = service_name
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.exchange: Optional[aio_pika.Exchange] = None

    async def connect(self):
        """
        Establish connection to RabbitMQ.
        Creates a topic exchange for event routing.
        """
        self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
        self.channel = await self.connection.channel()
        
        # Create a topic exchange for flexible routing
        # Topic exchanges route messages based on routing key patterns
        self.exchange = await self.channel.declare_exchange(
            "events",
            ExchangeType.TOPIC,
            durable=True  # Survive broker restarts
        )

    async def publish(self, event_type: str, payload: Dict[str, Any]):
        """
        Publish an event to the message bus.
        
        Args:
            event_type: Type of event (used as routing key)
            payload: Event data to send
        """
        with tracer.start_as_current_span(
            f"publish:{event_type}",
            kind=SpanKind.PRODUCER
        ) as span:
            span.set_attribute("messaging.system", "rabbitmq")
            span.set_attribute("messaging.destination", "events")
            span.set_attribute("messaging.rabbitmq.routing_key", event_type)

            # Inject trace context into event for propagation
            trace_context = {}
            inject(trace_context)

            event = Event(
                event_type=event_type,
                payload=payload,
                trace_context=trace_context
            )

            message = Message(
                body=json.dumps(asdict(event)).encode(),
                content_type="application/json",
                headers={"source": self.service_name}
            )

            await self.exchange.publish(
                message,
                routing_key=event_type
            )
            
            span.set_attribute("messaging.message_id", str(message.message_id))

    async def subscribe(
        self,
        event_patterns: list[str],
        handler: Callable[[Event], None],
        queue_name: str = None
    ):
        """
        Subscribe to events matching given patterns.
        
        Args:
            event_patterns: List of routing key patterns (e.g., "order.*")
            handler: Async function to process received events
            queue_name: Optional queue name (defaults to service-specific queue)
        """
        if queue_name is None:
            queue_name = f"{self.service_name}_events"

        # Create durable queue that survives broker restarts
        queue = await self.channel.declare_queue(
            queue_name,
            durable=True
        )

        # Bind queue to exchange with each pattern
        for pattern in event_patterns:
            await queue.bind(self.exchange, routing_key=pattern)

        async def on_message(message: aio_pika.IncomingMessage):
            async with message.process():
                event_data = json.loads(message.body.decode())
                event = Event(**event_data)

                # Extract trace context from event
                parent_context = extract(event.trace_context)

                with tracer.start_as_current_span(
                    f"consume:{event.event_type}",
                    context=parent_context,
                    kind=SpanKind.CONSUMER
                ) as span:
                    span.set_attribute("messaging.system", "rabbitmq")
                    span.set_attribute("messaging.operation", "receive")

                    try:
                        await handler(event)
                    except Exception as e:
                        span.record_exception(e)
                        raise

        await queue.consume(on_message)

    async def close(self):
        """Close the connection to RabbitMQ."""
        if self.connection:
            await self.connection.close()
```

---

## Building the User Service

The User Service handles user registration, authentication, and profile management.

### Models

```python
# services/user-service/app/models.py
"""
SQLAlchemy models for User Service.
Defines the database schema for user-related data.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

from shared.database import Base


class User(Base):
    """
    User model representing authenticated users in the system.
    
    Attributes:
        id: Unique identifier (UUID)
        email: User email (unique, indexed for fast lookup)
        hashed_password: Bcrypt hashed password
        full_name: User display name
        is_active: Whether user can log in
        is_verified: Whether email has been verified
        created_at: Account creation timestamp
        updated_at: Last modification timestamp
    """
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )
```

### Schemas

```python
# services/user-service/app/schemas.py
"""
Pydantic schemas for request/response validation.
Separates API contracts from database models.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration requests."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)


class UserUpdate(BaseModel):
    """Schema for partial user updates."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user data in API responses."""
    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for login requests."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
```

### Repository Layer

```python
# services/user-service/app/repository.py
"""
Repository pattern for database operations.
Isolates data access logic from business logic.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import User
from .schemas import UserCreate, UserUpdate


class UserRepository:
    """
    Repository for User database operations.
    Each method represents a single database operation.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_data: UserCreate, hashed_password: str) -> User:
        """
        Create a new user in the database.
        
        Args:
            user_data: Validated user creation data
            hashed_password: Pre-hashed password
        
        Returns:
            Created User instance
        """
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name
        )
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Fetch user by primary key."""
        return await self.session.get(User, user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch user by email address."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def update(self, user: User, user_data: UserUpdate) -> User:
        """
        Update user with provided fields.
        Only updates non-None fields from user_data.
        """
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        """Remove user from database."""
        await self.session.delete(user)
```

### Service Layer

```python
# services/user-service/app/service.py
"""
Business logic layer for User Service.
Coordinates between API endpoints, repository, and external services.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta

import bcrypt
import jwt
from opentelemetry import trace

from .models import User
from .schemas import UserCreate, UserUpdate, UserResponse, TokenResponse
from .repository import UserRepository
from shared.messaging import MessageBus

tracer = trace.get_tracer(__name__)

# JWT configuration
JWT_SECRET = "your-secret-key"  # In production, use environment variable
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class UserServiceError(Exception):
    """Base exception for User Service errors."""
    pass


class UserNotFoundError(UserServiceError):
    """Raised when requested user does not exist."""
    pass


class UserAlreadyExistsError(UserServiceError):
    """Raised when creating user with existing email."""
    pass


class InvalidCredentialsError(UserServiceError):
    """Raised when login credentials are invalid."""
    pass


class UserService:
    """
    Core business logic for user management.
    Handles registration, authentication, and profile operations.
    """

    def __init__(self, repository: UserRepository, message_bus: MessageBus = None):
        self.repository = repository
        self.message_bus = message_bus

    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """
        Register a new user account.
        
        Args:
            user_data: Validated registration data
        
        Returns:
            Created user response
        
        Raises:
            UserAlreadyExistsError: If email is already registered
        """
        with tracer.start_as_current_span("register_user") as span:
            span.set_attribute("user.email", user_data.email)

            # Check for existing user
            existing = await self.repository.get_by_email(user_data.email)
            if existing:
                raise UserAlreadyExistsError(
                    f"User with email {user_data.email} already exists"
                )

            # Hash password with bcrypt
            with tracer.start_as_current_span("hash_password"):
                hashed = bcrypt.hashpw(
                    user_data.password.encode(),
                    bcrypt.gensalt()
                ).decode()

            # Create user
            user = await self.repository.create(user_data, hashed)
            span.set_attribute("user.id", str(user.id))

            # Publish user created event
            if self.message_bus:
                await self.message_bus.publish(
                    "user.created",
                    {
                        "user_id": str(user.id),
                        "email": user.email,
                        "full_name": user.full_name
                    }
                )

            return UserResponse.model_validate(user)

    async def authenticate(self, email: str, password: str) -> TokenResponse:
        """
        Authenticate user and generate JWT token.
        
        Args:
            email: User email
            password: Plain text password
        
        Returns:
            JWT token response
        
        Raises:
            InvalidCredentialsError: If credentials are invalid
        """
        with tracer.start_as_current_span("authenticate") as span:
            span.set_attribute("user.email", email)

            user = await self.repository.get_by_email(email)
            if not user or not user.is_active:
                raise InvalidCredentialsError("Invalid email or password")

            # Verify password
            if not bcrypt.checkpw(password.encode(), user.hashed_password.encode()):
                raise InvalidCredentialsError("Invalid email or password")

            span.set_attribute("user.id", str(user.id))

            # Generate JWT token
            expires_at = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
            token_payload = {
                "sub": str(user.id),
                "email": user.email,
                "exp": expires_at
            }
            
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

            return TokenResponse(
                access_token=token,
                expires_in=JWT_EXPIRATION_HOURS * 3600
            )

    async def get_user(self, user_id: UUID) -> UserResponse:
        """
        Retrieve user by ID.
        
        Args:
            user_id: User UUID
        
        Returns:
            User response
        
        Raises:
            UserNotFoundError: If user does not exist
        """
        with tracer.start_as_current_span("get_user") as span:
            span.set_attribute("user.id", str(user_id))

            user = await self.repository.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")

            return UserResponse.model_validate(user)

    async def update_user(
        self,
        user_id: UUID,
        user_data: UserUpdate
    ) -> UserResponse:
        """
        Update user profile.
        
        Args:
            user_id: User UUID
            user_data: Fields to update
        
        Returns:
            Updated user response
        """
        with tracer.start_as_current_span("update_user") as span:
            span.set_attribute("user.id", str(user_id))

            user = await self.repository.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")

            updated = await self.repository.update(user, user_data)

            # Publish user updated event
            if self.message_bus:
                await self.message_bus.publish(
                    "user.updated",
                    {
                        "user_id": str(updated.id),
                        "updated_fields": list(user_data.model_dump(exclude_unset=True).keys())
                    }
                )

            return UserResponse.model_validate(updated)
```

### API Endpoints

```python
# services/user-service/app/main.py
"""
FastAPI application for User Service.
Defines HTTP API endpoints and dependency injection.
"""

import os
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware

from shared.telemetry import init_telemetry, instrument_fastapi
from shared.database import DatabaseManager
from shared.messaging import MessageBus

from .schemas import UserCreate, UserUpdate, UserResponse, UserLogin, TokenResponse
from .repository import UserRepository
from .service import (
    UserService,
    UserNotFoundError,
    UserAlreadyExistsError,
    InvalidCredentialsError
)

# Initialize telemetry first
tracer = init_telemetry("user-service")

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/users"
)
RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://guest:guest@localhost:5672/"
)

# Global instances
db = DatabaseManager(DATABASE_URL)
message_bus: MessageBus = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown of database and message bus connections.
    """
    global message_bus
    
    # Startup
    await db.create_tables()
    message_bus = MessageBus(RABBITMQ_URL, "user-service")
    await message_bus.connect()
    
    yield
    
    # Shutdown
    await message_bus.close()
    await db.close()


app = FastAPI(
    title="User Service",
    description="User management microservice",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apply OpenTelemetry instrumentation
instrument_fastapi(app)


async def get_user_service() -> UserService:
    """
    Dependency injection for UserService.
    Creates a new service instance with fresh database session.
    """
    async with db.get_session() as session:
        repository = UserRepository(session)
        yield UserService(repository, message_bus)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Service health check for Kubernetes probes."""
    return {"status": "healthy", "service": "user-service"}


@app.post(
    "/api/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_user_service)
):
    """
    Register a new user.
    
    Args:
        user_data: User registration data
    
    Returns:
        Created user
    
    Raises:
        409: If email already exists
    """
    try:
        return await service.register_user(user_data)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@app.post("/api/users/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    service: UserService = Depends(get_user_service)
):
    """
    Authenticate user and return JWT token.
    
    Args:
        credentials: Email and password
    
    Returns:
        JWT access token
    
    Raises:
        401: If credentials are invalid
    """
    try:
        return await service.authenticate(credentials.email, credentials.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    service: UserService = Depends(get_user_service)
):
    """
    Get user by ID.
    
    Args:
        user_id: User UUID
    
    Returns:
        User data
    
    Raises:
        404: If user not found
    """
    try:
        return await service.get_user(user_id)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )


@app.patch("/api/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    service: UserService = Depends(get_user_service)
):
    """
    Update user profile.
    
    Args:
        user_id: User UUID
        user_data: Fields to update
    
    Returns:
        Updated user
    """
    try:
        return await service.update_user(user_id, user_data)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

---

## API Gateway

The API Gateway is the single entry point for all client requests.

```python
# services/api-gateway/app/main.py
"""
API Gateway Service.
Routes requests to appropriate microservices and handles cross-cutting concerns.
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.propagate import inject

from shared.telemetry import init_telemetry, instrument_fastapi

tracer = init_telemetry("api-gateway")

# Service URLs from environment
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001")
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order-service:8002")
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://product-service:8003")

# HTTP client with connection pooling
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage HTTP client lifecycle."""
    global http_client
    
    # Create client with connection pool
    http_client = httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100
        )
    )
    
    yield
    
    await http_client.aclose()


app = FastAPI(
    title="API Gateway",
    description="Unified entry point for microservices",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

instrument_fastapi(app)


async def proxy_request(
    service_url: str,
    path: str,
    request: Request,
    method: str = None
) -> httpx.Response:
    """
    Proxy a request to a downstream service.
    Propagates trace context for distributed tracing.
    
    Args:
        service_url: Base URL of target service
        path: Path to append to service URL
        request: Original FastAPI request
        method: HTTP method (defaults to original request method)
    
    Returns:
        Response from downstream service
    """
    url = f"{service_url}{path}"
    method = method or request.method

    with tracer.start_as_current_span(f"proxy:{method}:{path}") as span:
        span.set_attribute("http.url", url)
        span.set_attribute("http.method", method)

        # Prepare headers with trace context
        headers = dict(request.headers)
        headers.pop("host", None)
        inject(headers)  # Add trace context headers

        # Get request body for non-GET requests
        body = None
        if method in ["POST", "PUT", "PATCH"]:
            body = await request.body()

        # Make proxied request
        response = await http_client.request(
            method=method,
            url=url,
            headers=headers,
            content=body,
            params=dict(request.query_params)
        )

        span.set_attribute("http.status_code", response.status_code)

        return response


@app.get("/health")
async def health_check():
    """Gateway health check."""
    return {"status": "healthy", "service": "api-gateway"}


# User Service routes
@app.api_route(
    "/api/users/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def user_service_proxy(path: str, request: Request):
    """Proxy requests to User Service."""
    response = await proxy_request(USER_SERVICE_URL, f"/api/users/{path}", request)
    return response.json()


@app.post("/api/users")
async def create_user_proxy(request: Request):
    """Proxy user creation to User Service."""
    response = await proxy_request(USER_SERVICE_URL, "/api/users", request)
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.json().get("detail", "Error")
        )
    return response.json()


# Order Service routes
@app.api_route(
    "/api/orders/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def order_service_proxy(path: str, request: Request):
    """Proxy requests to Order Service."""
    response = await proxy_request(ORDER_SERVICE_URL, f"/api/orders/{path}", request)
    return response.json()


# Product Service routes
@app.api_route(
    "/api/products/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
)
async def product_service_proxy(path: str, request: Request):
    """Proxy requests to Product Service."""
    response = await proxy_request(PRODUCT_SERVICE_URL, f"/api/products/{path}", request)
    return response.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Inter-Service Communication Patterns

```mermaid
flowchart TB
    subgraph sync["Synchronous (HTTP/gRPC)"]
        direction TB
        A1["API Gateway"] -->|REST| B1["User Service"]
        B1 -->|gRPC| C1["Auth Service"]
    end

    subgraph async["Asynchronous (Events)"]
        direction TB
        A2["Order Service"] -->|publish| Q["RabbitMQ"]
        Q -->|consume| B2["Notification Service"]
        Q -->|consume| C2["Inventory Service"]
    end

    subgraph saga["Saga Pattern"]
        direction TB
        S1["Create Order"] --> S2["Reserve Inventory"]
        S2 --> S3["Process Payment"]
        S3 --> S4["Ship Order"]
        S3 -.->|rollback| S2
        S2 -.->|rollback| S1
    end
```

### Circuit Breaker Pattern

```python
# shared/circuit_breaker.py
"""
Circuit breaker pattern implementation for resilient service calls.
Prevents cascading failures when downstream services are unhealthy.
"""

import asyncio
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Any
from dataclasses import dataclass, field

from opentelemetry import trace

tracer = trace.get_tracer(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreaker:
    """
    Circuit breaker for wrapping service calls.
    
    Attributes:
        name: Identifier for this circuit breaker
        failure_threshold: Failures before opening circuit
        recovery_timeout: Seconds before trying half-open
        success_threshold: Successes in half-open before closing
    """
    name: str
    failure_threshold: int = 5
    recovery_timeout: int = 30
    success_threshold: int = 3
    
    # Internal state
    state: CircuitState = field(default=CircuitState.CLOSED)
    failure_count: int = field(default=0)
    success_count: int = field(default=0)
    last_failure_time: datetime = field(default=None)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function with circuit breaker protection.
        
        Args:
            func: Async function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        
        Raises:
            CircuitOpenError: If circuit is open
            Original exception: If function fails
        """
        async with self._lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_recovery():
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                else:
                    raise CircuitOpenError(
                        f"Circuit {self.name} is open"
                    )

        with tracer.start_as_current_span(f"circuit_breaker:{self.name}") as span:
            span.set_attribute("circuit.state", self.state.value)

            try:
                result = await func(*args, **kwargs)
                await self._record_success()
                return result
            except Exception as e:
                await self._record_failure()
                span.record_exception(e)
                raise

    def _should_attempt_recovery(self) -> bool:
        """Check if enough time has passed to try recovery."""
        if self.last_failure_time is None:
            return True
        recovery_time = self.last_failure_time + timedelta(
            seconds=self.recovery_timeout
        )
        return datetime.utcnow() >= recovery_time

    async def _record_success(self):
        """Record a successful call."""
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0

    async def _record_failure(self):
        """Record a failed call."""
        async with self._lock:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()

            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
            elif (
                self.state == CircuitState.CLOSED
                and self.failure_count >= self.failure_threshold
            ):
                self.state = CircuitState.OPEN


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


# Usage example
user_service_circuit = CircuitBreaker(
    name="user-service",
    failure_threshold=5,
    recovery_timeout=30
)

async def get_user_with_circuit_breaker(user_id: str):
    """Fetch user with circuit breaker protection."""
    return await user_service_circuit.call(
        fetch_user_from_service,
        user_id
    )
```

---

## Docker Configuration

### Service Dockerfile

```dockerfile
# services/user-service/Dockerfile

# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# Production stage
FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application code
COPY --chown=appuser:appuser shared/ /app/shared/
COPY --chown=appuser:appuser services/user-service/app/ /app/app/

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/health')"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.9"

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ Message Broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Gateway
  api-gateway:
    build:
      context: .
      dockerfile: services/api-gateway/Dockerfile
    ports:
      - "8000:8000"
    environment:
      USER_SERVICE_URL: http://user-service:8001
      ORDER_SERVICE_URL: http://order-service:8002
      PRODUCT_SERVICE_URL: http://product-service:8003
      OTLP_ENDPOINT: ${OTLP_ENDPOINT}
      ONEUPTIME_TOKEN: ${ONEUPTIME_TOKEN}
    depends_on:
      - user-service
      - order-service
      - product-service

  # User Service
  user-service:
    build:
      context: .
      dockerfile: services/user-service/Dockerfile
    ports:
      - "8001:8001"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/users
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
      REDIS_URL: redis://redis:6379/0
      OTLP_ENDPOINT: ${OTLP_ENDPOINT}
      ONEUPTIME_TOKEN: ${ONEUPTIME_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Order Service
  order-service:
    build:
      context: .
      dockerfile: services/order-service/Dockerfile
    ports:
      - "8002:8002"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/orders
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
      USER_SERVICE_URL: http://user-service:8001
      OTLP_ENDPOINT: ${OTLP_ENDPOINT}
      ONEUPTIME_TOKEN: ${ONEUPTIME_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      user-service:
        condition: service_started

  # Product Service
  product-service:
    build:
      context: .
      dockerfile: services/product-service/Dockerfile
    ports:
      - "8003:8003"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/products
      REDIS_URL: redis://redis:6379/1
      OTLP_ENDPOINT: ${OTLP_ENDPOINT}
      ONEUPTIME_TOKEN: ${ONEUPTIME_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
```

---

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# k8s/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices
  labels:
    name: microservices

---
# k8s/configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: microservices-config
  namespace: microservices
data:
  ENVIRONMENT: "production"
  USER_SERVICE_URL: "http://user-service:8001"
  ORDER_SERVICE_URL: "http://order-service:8002"
  PRODUCT_SERVICE_URL: "http://product-service:8003"
```

### User Service Deployment

```yaml
# k8s/user-service/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
  labels:
    app: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: your-registry/user-service:latest
          ports:
            - containerPort: 8001
          envFrom:
            - configMapRef:
                name: microservices-config
            - secretRef:
                name: microservices-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8001
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8001
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: microservices
spec:
  selector:
    app: user-service
  ports:
    - protocol: TCP
      port: 8001
      targetPort: 8001
```

---

## Best Practices Summary

### Service Design

1. **Single Responsibility**: Each service owns one domain
2. **API First**: Design APIs before implementation
3. **Loose Coupling**: Services communicate through well-defined interfaces
4. **Data Isolation**: Each service owns its data store

### Communication

1. **Sync for Queries**: Use HTTP/gRPC for real-time queries
2. **Async for Commands**: Use message queues for commands that can be deferred
3. **Idempotent Operations**: Design APIs to handle retries safely
4. **Circuit Breakers**: Protect against cascading failures

### Observability

1. **Distributed Tracing**: Propagate trace context across all services
2. **Structured Logging**: Use consistent log formats with correlation IDs
3. **Health Checks**: Implement liveness and readiness probes
4. **Metrics**: Export key business and technical metrics

### Deployment

1. **Containerize Everything**: Use Docker for consistent environments
2. **Infrastructure as Code**: Define deployments in version control
3. **Blue-Green Deployments**: Enable zero-downtime releases
4. **Auto-scaling**: Scale based on demand

---

## Conclusion

Building microservices in Python requires careful attention to service boundaries, communication patterns, and operational concerns. The patterns shown in this guide provide a foundation for building production-ready systems.

Key takeaways:

- **Start with clear service boundaries** based on business domains
- **Use FastAPI** for high-performance async services
- **Implement proper tracing** with OpenTelemetry from day one
- **Design for failure** with circuit breakers and retries
- **Deploy incrementally** with Docker and Kubernetes

---

*Need to monitor your microservices? [OneUptime](https://oneuptime.com) provides distributed tracing, metrics, and alerting designed for microservices architectures. See how requests flow across your services and catch issues before they impact users.*

**Related Reading:**
- [How to Implement Distributed Tracing in Python Microservices](https://oneuptime.com/blog/post/2025-01-06-python-distributed-tracing-microservices/view)
- [How to Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Containerize Python Apps with Multi-Stage Dockerfiles](https://oneuptime.com/blog/post/2025-01-06-python-docker-multi-stage/view)
