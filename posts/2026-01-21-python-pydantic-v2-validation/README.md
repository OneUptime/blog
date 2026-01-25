# How to Validate Data with Pydantic v2 Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pydantic, Data Validation, Type Safety, FastAPI, API, Models, Serialization, Settings Management

Description: Learn how to validate and serialize data in Python using Pydantic v2. This guide covers model definition, custom validators, computed fields, settings management, and integration with FastAPI.

---

> Data validation is one of those things you either do properly or regret later. Pydantic v2 brings a complete rewrite with significant performance improvements and a cleaner API. It uses Python type hints to validate data at runtime, catching bugs before they cause problems.

Pydantic v2 is 5 to 50 times faster than v1 thanks to its Rust-based validation core. Whether you are building APIs, processing configuration files, or working with external data, Pydantic helps ensure your data is correct and well-typed.

---

## Getting Started

Install Pydantic v2:

```bash
pip install pydantic>=2.0
```

For settings management and extra features:

```bash
pip install pydantic-settings
```

---

## Basic Model Definition

Start with simple model definitions:

```python
# basic_models.py
# Basic Pydantic v2 model definitions

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class Address(BaseModel):
    """
    Nested model for addresses.
    Pydantic handles nested validation automatically.
    """
    street: str
    city: str
    country: str
    postal_code: str


class User(BaseModel):
    """
    User model with various field types.
    Field() provides additional metadata and validation.
    """
    # Required field with constraints
    id: int = Field(gt=0, description="Unique user identifier")

    # String with length validation
    name: str = Field(min_length=2, max_length=100)

    # Email field (Pydantic provides built-in email validation)
    email: str = Field(pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

    # Optional field with default
    age: Optional[int] = Field(default=None, ge=0, le=150)

    # Enum field
    role: UserRole = UserRole.USER

    # List of strings
    tags: List[str] = Field(default_factory=list)

    # Nested model
    address: Optional[Address] = None

    # Datetime with default
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Creating instances
user = User(
    id=1,
    name="John Doe",
    email="john@example.com",
    age=30,
    tags=["developer", "python"],
    address=Address(
        street="123 Main St",
        city="New York",
        country="USA",
        postal_code="10001"
    )
)

# Validation happens automatically
print(user.model_dump())  # Convert to dictionary
print(user.model_dump_json())  # Convert to JSON string

# This will raise ValidationError
try:
    invalid_user = User(id=-1, name="A", email="invalid")
except Exception as e:
    print(f"Validation failed: {e}")
```

---

## Custom Validators

Create custom validation logic:

```python
# custom_validators.py
# Custom validators and validation modes

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ValidationError
)
from typing import Optional, List
import re


class Product(BaseModel):
    """
    Product model with custom validators.
    Validators run after type coercion.
    """
    sku: str
    name: str
    price: float
    discount_price: Optional[float] = None
    quantity: int = 0
    categories: List[str] = Field(default_factory=list)

    @field_validator('sku')
    @classmethod
    def validate_sku(cls, v: str) -> str:
        """
        Validate SKU format: ABC-12345
        @field_validator decorates methods that validate single fields.
        """
        pattern = r'^[A-Z]{3}-\d{5}$'
        if not re.match(pattern, v):
            raise ValueError(f'SKU must match pattern ABC-12345, got {v}')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Capitalize product name."""
        return v.strip().title()

    @field_validator('price', 'discount_price')
    @classmethod
    def validate_prices(cls, v: Optional[float]) -> Optional[float]:
        """Validate prices are positive."""
        if v is not None and v < 0:
            raise ValueError('Price cannot be negative')
        return v

    @field_validator('categories', mode='before')
    @classmethod
    def split_categories(cls, v):
        """
        Pre-validator: runs before type coercion.
        Allows passing comma-separated string for categories.
        """
        if isinstance(v, str):
            return [cat.strip() for cat in v.split(',')]
        return v

    @model_validator(mode='after')
    def validate_discount(self) -> 'Product':
        """
        Model validator: runs after all fields are validated.
        Can validate relationships between fields.
        """
        if self.discount_price is not None:
            if self.discount_price >= self.price:
                raise ValueError('Discount price must be less than regular price')
        return self


# Usage examples
product = Product(
    sku="ABC-12345",
    name="wireless mouse",  # Will be capitalized
    price=29.99,
    discount_price=24.99,
    categories="electronics, accessories"  # String will be split
)

print(product.name)  # "Wireless Mouse"
print(product.categories)  # ["electronics", "accessories"]


class PasswordModel(BaseModel):
    """Model with password validation."""
    password: str
    confirm_password: str

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets security requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v

    @model_validator(mode='after')
    def passwords_match(self) -> 'PasswordModel':
        """Verify passwords match."""
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return self
```

---

## Computed Fields and Properties

Add computed fields that derive from other data:

```python
# computed_fields.py
# Computed fields and model properties

from pydantic import BaseModel, Field, computed_field
from typing import List
from decimal import Decimal
from datetime import datetime, date


class OrderItem(BaseModel):
    """Individual item in an order."""
    product_name: str
    unit_price: Decimal
    quantity: int = Field(ge=1)

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        """Calculate item subtotal."""
        return self.unit_price * self.quantity


class Order(BaseModel):
    """
    Order model with computed fields.
    Computed fields are included in serialization.
    """
    id: str
    customer_name: str
    items: List[OrderItem]
    discount_percent: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0.08")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        """Calculate order subtotal before discount and tax."""
        return sum(item.subtotal for item in self.items)

    @computed_field
    @property
    def discount_amount(self) -> Decimal:
        """Calculate discount amount."""
        return self.subtotal * (self.discount_percent / 100)

    @computed_field
    @property
    def tax_amount(self) -> Decimal:
        """Calculate tax on discounted amount."""
        taxable = self.subtotal - self.discount_amount
        return taxable * self.tax_rate

    @computed_field
    @property
    def total(self) -> Decimal:
        """Calculate final total."""
        return self.subtotal - self.discount_amount + self.tax_amount

    @computed_field
    @property
    def item_count(self) -> int:
        """Total number of items."""
        return sum(item.quantity for item in self.items)


# Usage
order = Order(
    id="ORD-001",
    customer_name="Jane Smith",
    items=[
        OrderItem(product_name="Widget", unit_price=Decimal("10.00"), quantity=3),
        OrderItem(product_name="Gadget", unit_price=Decimal("25.00"), quantity=2),
    ],
    discount_percent=Decimal("10")
)

print(f"Subtotal: ${order.subtotal}")
print(f"Discount: ${order.discount_amount}")
print(f"Tax: ${order.tax_amount}")
print(f"Total: ${order.total}")

# Computed fields appear in serialization
print(order.model_dump())
```

---

## Model Configuration

Configure model behavior with model_config:

```python
# model_config.py
# Pydantic model configuration options

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class StrictUser(BaseModel):
    """
    Model with strict configuration.
    Uses model_config for Pydantic v2.
    """
    model_config = ConfigDict(
        # Forbid extra fields not defined in model
        extra='forbid',
        # Validate default values
        validate_default=True,
        # Revalidate instances when attributes change
        revalidate_instances='always',
        # Use enum values in serialization
        use_enum_values=True,
        # Enable JSON schema generation
        json_schema_extra={
            "examples": [
                {"name": "John", "age": 30}
            ]
        }
    )

    name: str
    age: int = Field(ge=0)


class FlexibleModel(BaseModel):
    """Model that allows extra fields."""
    model_config = ConfigDict(
        extra='allow',  # Unknown fields are stored
        str_strip_whitespace=True,  # Strip whitespace from strings
        str_min_length=1,  # Minimum string length globally
    )

    id: int
    name: str


class ImmutableModel(BaseModel):
    """
    Immutable (frozen) model.
    Attributes cannot be changed after creation.
    """
    model_config = ConfigDict(frozen=True)

    id: int
    name: str


# ORM mode for database integration
class UserORM(BaseModel):
    """Model that works with ORM objects."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


# Usage with SQLAlchemy
class SQLAlchemyUser:
    """Simulated SQLAlchemy model."""
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email


# Convert ORM object to Pydantic model
db_user = SQLAlchemyUser(1, "John", "john@example.com")
user = UserORM.model_validate(db_user)
print(user.model_dump())


class AliasedModel(BaseModel):
    """Model using field aliases."""
    model_config = ConfigDict(
        populate_by_name=True,  # Allow using both alias and field name
    )

    # API returns camelCase, but we use snake_case internally
    user_name: str = Field(alias='userName')
    email_address: str = Field(alias='emailAddress')


# Can create using either name
m1 = AliasedModel(userName="John", emailAddress="john@example.com")
m2 = AliasedModel(user_name="John", email_address="john@example.com")
```

---

## Settings Management

Use Pydantic for application configuration:

```python
# settings.py
# Application settings with pydantic-settings

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr
from typing import Optional, List
from functools import lru_cache


class DatabaseSettings(BaseSettings):
    """Database configuration."""
    model_config = SettingsConfigDict(
        env_prefix='DB_',  # Environment variables start with DB_
    )

    host: str = "localhost"
    port: int = 5432
    name: str = "app"
    user: str = "postgres"
    password: SecretStr  # Masked in logs

    @property
    def connection_string(self) -> str:
        """Build connection string."""
        password = self.password.get_secret_value()
        return f"postgresql://{self.user}:{password}@{self.host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    """Redis configuration."""
    model_config = SettingsConfigDict(env_prefix='REDIS_')

    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[SecretStr] = None


class AppSettings(BaseSettings):
    """
    Main application settings.
    Reads from environment variables and .env files.
    """
    model_config = SettingsConfigDict(
        env_file='.env',  # Load from .env file
        env_file_encoding='utf-8',
        case_sensitive=False,  # Environment variables are case-insensitive
        extra='ignore',  # Ignore unknown environment variables
    )

    # Application settings
    app_name: str = "MyApp"
    debug: bool = False
    secret_key: SecretStr
    allowed_hosts: List[str] = Field(default_factory=lambda: ["localhost"])

    # API settings
    api_version: str = "v1"
    api_rate_limit: int = 100

    # Feature flags
    enable_cache: bool = True
    enable_metrics: bool = True

    # Nested settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)


@lru_cache()
def get_settings() -> AppSettings:
    """
    Get cached settings instance.
    Uses lru_cache to avoid reading env on every call.
    """
    return AppSettings()


# Usage
settings = get_settings()
print(f"App: {settings.app_name}")
print(f"Debug: {settings.debug}")
print(f"DB Connection: {settings.database.connection_string}")

# .env file example:
# SECRET_KEY=my-super-secret-key
# DEBUG=true
# DB_HOST=postgres.example.com
# DB_PASSWORD=secret
# ALLOWED_HOSTS=["example.com", "www.example.com"]
```

---

## FastAPI Integration

Pydantic works seamlessly with FastAPI:

```python
# fastapi_integration.py
# Pydantic models with FastAPI

from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

app = FastAPI()


class CreateUserRequest(BaseModel):
    """Request model for creating a user."""
    name: str = Field(min_length=2, max_length=100, description="User's full name")
    email: str = Field(description="User's email address")
    password: str = Field(min_length=8, description="User's password")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower()


class UserResponse(BaseModel):
    """Response model for user data."""
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsersListResponse(BaseModel):
    """Paginated list of users."""
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class UpdateUserRequest(BaseModel):
    """Request model for updating a user."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None


# In-memory database
users_db = {}
user_counter = 0


@app.post(
    "/users",
    response_model=UserResponse,
    responses={400: {"model": ErrorResponse}}
)
async def create_user(user: CreateUserRequest) -> UserResponse:
    """
    Create a new user.
    Request body is automatically validated by Pydantic.
    """
    global user_counter
    user_counter += 1

    # Check for duplicate email
    for existing in users_db.values():
        if existing.email == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    new_user = UserResponse(
        id=user_counter,
        name=user.name,
        email=user.email,
        created_at=datetime.utcnow()
    )
    users_db[user_counter] = new_user

    return new_user


@app.get("/users", response_model=UsersListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
) -> UsersListResponse:
    """
    List users with pagination.
    Query parameters are validated by Pydantic types.
    """
    all_users = list(users_db.values())
    total = len(all_users)

    start = (page - 1) * page_size
    end = start + page_size
    items = all_users[start:end]

    return UsersListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=end < total
    )


@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    responses={404: {"model": ErrorResponse}}
)
async def get_user(
    user_id: int = Path(..., ge=1, description="User ID")
) -> UserResponse:
    """Get a user by ID."""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return users_db[user_id]


@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int = Path(..., ge=1),
    updates: UpdateUserRequest = None
) -> UserResponse:
    """
    Update a user.
    Only provided fields are updated.
    """
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_db[user_id]

    # Use model_dump with exclude_unset to get only provided fields
    update_data = updates.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    return user
```

---

## Serialization and Deserialization

Control how models are serialized:

```python
# serialization.py
# Pydantic serialization options

from pydantic import BaseModel, Field, field_serializer
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class Status(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"


class Invoice(BaseModel):
    """Model with custom serialization."""
    id: str
    customer_name: str
    amount: Decimal
    tax: Decimal
    status: Status
    created_at: datetime
    due_date: date
    internal_notes: Optional[str] = Field(default=None, exclude=True)  # Excluded from output

    @field_serializer('amount', 'tax')
    def serialize_decimal(self, value: Decimal) -> str:
        """Serialize decimals as formatted strings."""
        return f"${value:.2f}"

    @field_serializer('created_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime in ISO format."""
        return value.isoformat()

    @field_serializer('due_date')
    def serialize_date(self, value: date) -> str:
        """Serialize date in readable format."""
        return value.strftime("%B %d, %Y")


# Create invoice
invoice = Invoice(
    id="INV-001",
    customer_name="Acme Corp",
    amount=Decimal("1500.00"),
    tax=Decimal("120.00"),
    status=Status.PENDING,
    created_at=datetime(2026, 1, 25, 10, 30, 0),
    due_date=date(2026, 2, 25),
    internal_notes="Follow up next week"
)

# Different serialization modes
print(invoice.model_dump())
# amount and tax are "$1500.00", "$120.00"
# internal_notes is excluded

print(invoice.model_dump(mode='json'))
# Returns JSON-compatible types

print(invoice.model_dump(by_alias=True))
# Uses field aliases

print(invoice.model_dump(exclude={'id', 'status'}))
# Exclude specific fields

print(invoice.model_dump(include={'customer_name', 'amount', 'total'}))
# Include only specific fields

# JSON output
json_str = invoice.model_dump_json(indent=2)
print(json_str)

# Parse JSON back to model
parsed = Invoice.model_validate_json(json_str)
```

---

## Best Practices

1. **Use Field() for documentation**: Add descriptions and examples for better API documentation.

2. **Prefer computed_field over property**: Computed fields are included in serialization automatically.

3. **Use SecretStr for sensitive data**: Prevents accidental logging of passwords and tokens.

4. **Validate at boundaries**: Validate data when it enters your system (API requests, file parsing).

5. **Use model_config instead of class Config**: This is the Pydantic v2 way.

6. **Cache settings with lru_cache**: Avoid repeated environment variable reads.

7. **Use exclude_unset for partial updates**: Get only the fields that were actually provided.

---

*Building reliable APIs? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your FastAPI applications, tracking validation errors, response times, and endpoint health.*

**Related Reading:**
- [How to Build GraphQL APIs with Strawberry in Python](https://oneuptime.com/blog/post/2026-01-22-python-graphql-strawberry/view)
- [How to Implement Circuit Breakers in Python](https://oneuptime.com/blog/post/2026-01-23-python-circuit-breakers/view)
