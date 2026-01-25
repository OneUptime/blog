# How to Use Pydantic for Data Validation in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pydantic, Data Validation, Type Safety, FastAPI, Configuration

Description: Learn how to use Pydantic for data validation in Python. This guide covers models, validators, settings management, and integration patterns for building robust applications.

---

> Pydantic is Python's most popular data validation library, used by FastAPI and many other frameworks. It uses Python type hints to validate data, serialize objects, and generate schemas automatically.

This guide covers Pydantic v2, showing you how to define models, create custom validators, and use Pydantic effectively in your applications.

---

## Getting Started

### Installation

```bash
pip install pydantic
pip install pydantic[email]  # For email validation
```

### Basic Model

```python
# basic_model.py
# Introduction to Pydantic models
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class User(BaseModel):
    """User model with automatic validation."""
    id: int
    name: str
    email: str
    age: int
    is_active: bool = True  # Default value
    tags: List[str] = []    # Default empty list
    created_at: Optional[datetime] = None

# Create instance with validation
user = User(
    id=1,
    name="Alice",
    email="alice@example.com",
    age=30
)

print(user)
# id=1 name='Alice' email='alice@example.com' age=30 is_active=True tags=[] created_at=None

# Access fields
print(user.name)  # Alice
print(user.model_dump())  # Convert to dictionary

# Automatic type coercion
user2 = User(
    id="2",  # String converted to int
    name="Bob",
    email="bob@example.com",
    age="25"  # String converted to int
)
print(user2.id)  # 2 (int, not str)

# Validation errors
try:
    invalid_user = User(
        id="not-a-number",
        name="Test",
        email="test@example.com",
        age=-5
    )
except ValueError as e:
    print(f"Validation error: {e}")
```

---

## Field Constraints

```python
# field_constraints.py
# Adding constraints to fields
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import date

class Product(BaseModel):
    """Product model with field constraints."""

    # Required field with description
    name: str = Field(..., min_length=1, max_length=100, description="Product name")

    # Numeric constraints
    price: float = Field(..., gt=0, description="Price must be positive")
    quantity: int = Field(default=0, ge=0, le=10000, description="Stock quantity")

    # String pattern
    sku: str = Field(..., pattern=r'^[A-Z]{3}-\d{4}$', description="SKU format: ABC-1234")

    # Email validation (requires pydantic[email])
    contact_email: EmailStr

    # List constraints
    tags: List[str] = Field(default=[], max_length=10, description="Max 10 tags")

    # Optional with constraint
    discount_percent: Optional[float] = Field(None, ge=0, le=100)

# Valid product
product = Product(
    name="Laptop",
    price=999.99,
    quantity=50,
    sku="LAP-1234",
    contact_email="sales@example.com",
    tags=["electronics", "computers"]
)

# Invalid product - raises ValidationError
try:
    invalid = Product(
        name="",  # Too short
        price=-10,  # Must be positive
        sku="invalid",  # Wrong pattern
        contact_email="not-an-email"
    )
except ValueError as e:
    print(e)
```

---

## Custom Validators

```python
# custom_validators.py
# Creating custom validation logic
from pydantic import BaseModel, field_validator, model_validator
from typing import List
from datetime import date

class Registration(BaseModel):
    """Registration with custom validators."""
    username: str
    password: str
    password_confirm: str
    email: str
    birth_date: date
    accepted_terms: bool

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        """Validate username contains only alphanumeric characters."""
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v.lower()  # Normalize to lowercase

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password meets strength requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain a digit')
        return v

    @field_validator('birth_date')
    @classmethod
    def must_be_adult(cls, v: date) -> date:
        """Validate user is at least 18 years old."""
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError('Must be at least 18 years old')
        return v

    @model_validator(mode='after')
    def passwords_match(self) -> 'Registration':
        """Validate passwords match (cross-field validation)."""
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')
        return self

    @model_validator(mode='after')
    def terms_accepted(self) -> 'Registration':
        """Validate terms were accepted."""
        if not self.accepted_terms:
            raise ValueError('You must accept the terms and conditions')
        return self

# Valid registration
reg = Registration(
    username="alice123",
    password="SecurePass1",
    password_confirm="SecurePass1",
    email="alice@example.com",
    birth_date=date(1990, 1, 1),
    accepted_terms=True
)
print(f"Registered: {reg.username}")
```

---

## Nested Models

```python
# nested_models.py
# Working with nested data structures
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Address(BaseModel):
    """Address model."""
    street: str
    city: str
    state: str
    zip_code: str = Field(..., pattern=r'^\d{5}(-\d{4})?$')
    country: str = "USA"

class ContactInfo(BaseModel):
    """Contact information."""
    email: str
    phone: Optional[str] = None
    address: Optional[Address] = None

class Company(BaseModel):
    """Company model with nested structures."""
    name: str
    founded: int
    contact: ContactInfo
    locations: List[Address] = []

# Create nested structure
company = Company(
    name="TechCorp",
    founded=2020,
    contact=ContactInfo(
        email="info@techcorp.com",
        phone="555-1234",
        address=Address(
            street="123 Tech Street",
            city="San Francisco",
            state="CA",
            zip_code="94102"
        )
    ),
    locations=[
        Address(
            street="456 Innovation Ave",
            city="New York",
            state="NY",
            zip_code="10001"
        )
    ]
)

# Access nested fields
print(company.contact.address.city)  # San Francisco

# Parse from dictionary (e.g., JSON data)
data = {
    "name": "StartupXYZ",
    "founded": 2023,
    "contact": {
        "email": "hello@startup.xyz"
    }
}
startup = Company.model_validate(data)
```

---

## Serialization

```python
# serialization.py
# Converting models to different formats
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Article(BaseModel):
    """Article model with serialization options."""
    id: int
    title: str
    content: str
    author_id: int = Field(..., serialization_alias='authorId')
    published_at: Optional[datetime] = None
    internal_notes: str = Field(default="", exclude=True)  # Excluded from serialization

    class Config:
        # Use field names when serializing (not aliases)
        populate_by_name = True

article = Article(
    id=1,
    title="Hello World",
    content="This is my first article.",
    author_id=42,
    published_at=datetime(2024, 1, 15, 10, 30),
    internal_notes="Draft - needs review"
)

# Convert to dictionary
print(article.model_dump())
# {'id': 1, 'title': 'Hello World', 'content': '...', 'author_id': 42, 'published_at': datetime(...)}

# Convert with aliases
print(article.model_dump(by_alias=True))
# {'id': 1, 'title': 'Hello World', 'content': '...', 'authorId': 42, ...}

# Convert to JSON string
print(article.model_dump_json(indent=2))

# Include/exclude specific fields
print(article.model_dump(include={'id', 'title'}))
# {'id': 1, 'title': 'Hello World'}

print(article.model_dump(exclude={'content', 'internal_notes'}))
# Excludes content and internal_notes
```

---

## Settings Management

```python
# settings.py
# Configuration management with Pydantic Settings
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List, Optional

class DatabaseSettings(BaseSettings):
    """Database configuration."""
    host: str = "localhost"
    port: int = 5432
    name: str = Field(..., alias="db_name")
    user: str = "postgres"
    password: str = Field(..., repr=False)  # Hide in repr

    model_config = SettingsConfigDict(
        env_prefix="DB_"  # Environment variables: DB_HOST, DB_PORT, etc.
    )

class AppSettings(BaseSettings):
    """Application configuration from environment variables."""

    # Basic settings
    app_name: str = "MyApp"
    debug: bool = False
    secret_key: str

    # Nested settings
    database: DatabaseSettings = None

    # List from comma-separated env var
    allowed_hosts: List[str] = ["localhost"]

    # API keys
    api_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__"  # For nested: DATABASE__HOST
    )

# .env file:
# APP_NAME=MyApp
# DEBUG=true
# SECRET_KEY=super-secret
# ALLOWED_HOSTS=localhost,example.com
# DB_HOST=postgres.example.com
# DB_PASSWORD=secret123

# Load settings (automatically reads from environment)
settings = AppSettings()
print(f"Running {settings.app_name} in {'debug' if settings.debug else 'production'} mode")
```

---

## Generic Models

```python
# generic_models.py
# Creating reusable generic models
from pydantic import BaseModel
from typing import TypeVar, Generic, List, Optional
from datetime import datetime

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: List[T]
    total: int
    page: int
    page_size: int
    has_more: bool

    @property
    def total_pages(self) -> int:
        return (self.total + self.page_size - 1) // self.page_size

class APIResponse(BaseModel, Generic[T]):
    """Generic API response wrapper."""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Usage with specific types
class User(BaseModel):
    id: int
    name: str

class Product(BaseModel):
    id: int
    name: str
    price: float

# Typed responses
user_response: APIResponse[User] = APIResponse(
    success=True,
    data=User(id=1, name="Alice")
)

product_list: PaginatedResponse[Product] = PaginatedResponse(
    items=[
        Product(id=1, name="Laptop", price=999.99),
        Product(id=2, name="Mouse", price=29.99)
    ],
    total=100,
    page=1,
    page_size=10,
    has_more=True
)

print(f"Total pages: {product_list.total_pages}")
```

---

## Computed Fields

```python
# computed_fields.py
# Fields computed from other fields
from pydantic import BaseModel, computed_field
from typing import List
from datetime import date

class Order(BaseModel):
    """Order with computed fields."""
    items: List[dict]  # [{"name": "...", "price": 10.0, "quantity": 2}]
    tax_rate: float = 0.08
    discount_percent: float = 0

    @computed_field
    @property
    def subtotal(self) -> float:
        """Calculate subtotal from items."""
        return sum(
            item["price"] * item["quantity"]
            for item in self.items
        )

    @computed_field
    @property
    def discount_amount(self) -> float:
        """Calculate discount amount."""
        return self.subtotal * (self.discount_percent / 100)

    @computed_field
    @property
    def tax_amount(self) -> float:
        """Calculate tax on discounted subtotal."""
        return (self.subtotal - self.discount_amount) * self.tax_rate

    @computed_field
    @property
    def total(self) -> float:
        """Calculate final total."""
        return self.subtotal - self.discount_amount + self.tax_amount

order = Order(
    items=[
        {"name": "Widget", "price": 10.0, "quantity": 5},
        {"name": "Gadget", "price": 25.0, "quantity": 2}
    ],
    discount_percent=10
)

print(f"Subtotal: ${order.subtotal:.2f}")
print(f"Discount: ${order.discount_amount:.2f}")
print(f"Tax: ${order.tax_amount:.2f}")
print(f"Total: ${order.total:.2f}")

# Computed fields included in serialization
print(order.model_dump())
```

---

## Union Types and Discriminators

```python
# discriminated_unions.py
# Handle different types with discriminated unions
from pydantic import BaseModel, Field
from typing import Union, Literal
from datetime import datetime

class EmailNotification(BaseModel):
    """Email notification type."""
    type: Literal["email"] = "email"
    recipient: str
    subject: str
    body: str

class SMSNotification(BaseModel):
    """SMS notification type."""
    type: Literal["sms"] = "sms"
    phone_number: str
    message: str

class PushNotification(BaseModel):
    """Push notification type."""
    type: Literal["push"] = "push"
    device_token: str
    title: str
    body: str

# Discriminated union based on 'type' field
Notification = Union[EmailNotification, SMSNotification, PushNotification]

class NotificationRequest(BaseModel):
    """Request with discriminated union."""
    notification: Notification = Field(..., discriminator='type')
    scheduled_at: datetime = None

# Pydantic picks the right type based on 'type' field
email_req = NotificationRequest(
    notification={
        "type": "email",
        "recipient": "user@example.com",
        "subject": "Hello",
        "body": "World"
    }
)
print(type(email_req.notification))  # EmailNotification

sms_req = NotificationRequest(
    notification={
        "type": "sms",
        "phone_number": "+1234567890",
        "message": "Hello!"
    }
)
print(type(sms_req.notification))  # SMSNotification
```

---

## Conclusion

Pydantic provides powerful data validation for Python:

- Define models with type hints for automatic validation
- Use Field constraints for detailed validation rules
- Create custom validators for complex logic
- Serialize models to dictionaries and JSON
- Manage configuration with BaseSettings
- Use generics for reusable model patterns

Pydantic makes your code more robust by catching data errors early and providing clear error messages.

---

*Building applications with Pydantic? [OneUptime](https://oneuptime.com) helps you monitor your services, track validation errors, and maintain application reliability.*

