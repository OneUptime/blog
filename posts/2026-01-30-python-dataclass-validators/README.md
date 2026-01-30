# How to Build Dataclass Validators in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Validation, Data Classes, Type Safety

Description: Add validation to Python dataclasses using __post_init__, descriptors, and Pydantic integration for type-safe data structures with runtime checks.

---

Python dataclasses provide a clean way to define data containers, but they lack built-in validation. When you receive data from APIs, user input, or configuration files, you need to verify that values meet your requirements before processing them. This post walks through several approaches to add validation to dataclasses, from simple `__post_init__` checks to full-featured solutions with Pydantic.

## The Problem with Plain Dataclasses

Standard dataclasses accept any value without complaint, even when type hints suggest otherwise.

```python
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int
    email: str

# This works even though age should be an int
user = User(name="Alice", age="not a number", email="invalid")
print(user)  # User(name='Alice', age='not a number', email='invalid')
```

Type hints are ignored at runtime. Python treats them as documentation only. To enforce constraints, you need explicit validation logic.

## Approach 1: Validation with __post_init__

The `__post_init__` method runs immediately after the generated `__init__` completes. This is the simplest place to add validation.

```python
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class User:
    name: str
    age: int
    email: str
    phone: Optional[str] = None

    def __post_init__(self):
        # Validate name is not empty
        if not self.name or not self.name.strip():
            raise ValueError("Name cannot be empty")

        # Validate age is within reasonable bounds
        if not isinstance(self.age, int):
            raise TypeError(f"Age must be an integer, got {type(self.age).__name__}")
        if self.age < 0 or self.age > 150:
            raise ValueError(f"Age must be between 0 and 150, got {self.age}")

        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, self.email):
            raise ValueError(f"Invalid email format: {self.email}")

        # Validate phone if provided
        if self.phone is not None:
            phone_pattern = r'^\+?[1-9]\d{1,14}$'
            if not re.match(phone_pattern, self.phone):
                raise ValueError(f"Invalid phone format: {self.phone}")
```

Let's test the validation:

```python
# Valid user - works fine
user = User(name="Alice", age=30, email="alice@example.com")
print(user)

# Invalid age - raises ValueError
try:
    user = User(name="Bob", age=-5, email="bob@example.com")
except ValueError as e:
    print(f"Validation error: {e}")

# Invalid email - raises ValueError
try:
    user = User(name="Charlie", age=25, email="not-an-email")
except ValueError as e:
    print(f"Validation error: {e}")
```

### Organizing Validators as Separate Methods

As validation logic grows, keep `__post_init__` clean by extracting validators into dedicated methods.

```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import date
import re

@dataclass
class Employee:
    employee_id: str
    name: str
    email: str
    hire_date: date
    salary: float
    department: str
    skills: List[str]
    manager_id: Optional[str] = None

    def __post_init__(self):
        self._validate_employee_id()
        self._validate_name()
        self._validate_email()
        self._validate_hire_date()
        self._validate_salary()
        self._validate_department()
        self._validate_skills()
        self._validate_manager_id()

    def _validate_employee_id(self):
        """Employee ID must be format: EMP-XXXXX where X is a digit."""
        pattern = r'^EMP-\d{5}$'
        if not re.match(pattern, self.employee_id):
            raise ValueError(
                f"Invalid employee_id format: {self.employee_id}. "
                f"Expected format: EMP-XXXXX"
            )

    def _validate_name(self):
        """Name must be 2-100 characters, letters and spaces only."""
        if not self.name or len(self.name) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(self.name) > 100:
            raise ValueError("Name cannot exceed 100 characters")
        if not re.match(r'^[a-zA-Z\s]+$', self.name):
            raise ValueError("Name can only contain letters and spaces")

    def _validate_email(self):
        """Email must be from company domain."""
        pattern = r'^[a-zA-Z0-9._%+-]+@company\.com$'
        if not re.match(pattern, self.email):
            raise ValueError(
                f"Email must be from company.com domain, got: {self.email}"
            )

    def _validate_hire_date(self):
        """Hire date cannot be in the future."""
        if self.hire_date > date.today():
            raise ValueError("Hire date cannot be in the future")

    def _validate_salary(self):
        """Salary must be positive and within reasonable range."""
        if not isinstance(self.salary, (int, float)):
            raise TypeError(f"Salary must be a number, got {type(self.salary)}")
        if self.salary < 0:
            raise ValueError("Salary cannot be negative")
        if self.salary > 10_000_000:
            raise ValueError("Salary exceeds maximum allowed value")

    def _validate_department(self):
        """Department must be from allowed list."""
        allowed_departments = {
            'Engineering', 'Sales', 'Marketing',
            'HR', 'Finance', 'Operations'
        }
        if self.department not in allowed_departments:
            raise ValueError(
                f"Invalid department: {self.department}. "
                f"Must be one of: {allowed_departments}"
            )

    def _validate_skills(self):
        """Must have at least one skill, max 20."""
        if not self.skills:
            raise ValueError("Employee must have at least one skill")
        if len(self.skills) > 20:
            raise ValueError("Cannot have more than 20 skills")
        for skill in self.skills:
            if not isinstance(skill, str) or not skill.strip():
                raise ValueError("Each skill must be a non-empty string")

    def _validate_manager_id(self):
        """Manager ID, if provided, must match employee ID format."""
        if self.manager_id is not None:
            pattern = r'^EMP-\d{5}$'
            if not re.match(pattern, self.manager_id):
                raise ValueError(f"Invalid manager_id format: {self.manager_id}")
            if self.manager_id == self.employee_id:
                raise ValueError("Employee cannot be their own manager")
```

## Approach 2: Field Validators with Descriptors

Descriptors let you validate values when they are set, not just during initialization. This catches invalid assignments after object creation.

```python
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

class ValidatedField:
    """A descriptor that validates values on assignment."""

    def __init__(
        self,
        validator: Callable[[Any], None],
        default: Any = None,
        default_factory: Optional[Callable] = None
    ):
        self.validator = validator
        self.default = default
        self.default_factory = default_factory
        self.name = None

    def __set_name__(self, owner, name):
        self.name = name
        self.private_name = f'_validated_{name}'

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private_name, self.default)

    def __set__(self, obj, value):
        # Run the validator - it should raise if invalid
        self.validator(value)
        setattr(obj, self.private_name, value)


def positive_number(value):
    """Validator for positive numbers."""
    if not isinstance(value, (int, float)):
        raise TypeError(f"Expected number, got {type(value).__name__}")
    if value <= 0:
        raise ValueError(f"Value must be positive, got {value}")


def non_empty_string(value):
    """Validator for non-empty strings."""
    if not isinstance(value, str):
        raise TypeError(f"Expected string, got {type(value).__name__}")
    if not value.strip():
        raise ValueError("String cannot be empty or whitespace only")


def email_format(value):
    """Validator for email format."""
    import re
    if not isinstance(value, str):
        raise TypeError(f"Expected string, got {type(value).__name__}")
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, value):
        raise ValueError(f"Invalid email format: {value}")


def in_range(min_val, max_val):
    """Factory for range validators."""
    def validator(value):
        if not isinstance(value, (int, float)):
            raise TypeError(f"Expected number, got {type(value).__name__}")
        if value < min_val or value > max_val:
            raise ValueError(f"Value must be between {min_val} and {max_val}")
    return validator
```

Now use these descriptors in a dataclass:

```python
@dataclass
class Product:
    # Descriptors defined at class level
    name: str = ValidatedField(non_empty_string)
    price: float = ValidatedField(positive_number)
    quantity: int = ValidatedField(in_range(0, 10000))
    sku: str = ValidatedField(non_empty_string)

    def __init__(self, name: str, price: float, quantity: int, sku: str):
        # Manual init needed when using descriptors with dataclass
        self.name = name
        self.price = price
        self.quantity = quantity
        self.sku = sku


# Test the descriptor-based validation
product = Product(name="Widget", price=29.99, quantity=100, sku="WDG-001")
print(f"Created product: {product.name} at ${product.price}")

# Validation happens on reassignment too
try:
    product.price = -10  # Raises ValueError
except ValueError as e:
    print(f"Assignment blocked: {e}")

# The original value is preserved
print(f"Price still: ${product.price}")
```

### A Cleaner Descriptor Pattern

Here's a more elegant approach that works better with dataclass field defaults:

```python
from dataclasses import dataclass, field
from typing import Any, Callable, List, TypeVar, Generic

T = TypeVar('T')

class Validator(Generic[T]):
    """
    A descriptor-based validator that integrates cleanly with dataclasses.
    """

    def __init__(self, *validators: Callable[[T], None]):
        self.validators = validators
        self.name: str = ""

    def __set_name__(self, owner: type, name: str):
        self.name = name
        self.storage_name = f"_v_{name}"

    def __get__(self, obj: Any, objtype: type = None) -> T:
        if obj is None:
            return self  # type: ignore
        return getattr(obj, self.storage_name)

    def __set__(self, obj: Any, value: T):
        for validator in self.validators:
            validator(value)
        setattr(obj, self.storage_name, value)


# Reusable validator functions
def min_length(n: int):
    def check(value: str):
        if len(value) < n:
            raise ValueError(f"Must be at least {n} characters")
    return check

def max_length(n: int):
    def check(value: str):
        if len(value) > n:
            raise ValueError(f"Must be at most {n} characters")
    return check

def matches_pattern(pattern: str, message: str = "Invalid format"):
    import re
    compiled = re.compile(pattern)
    def check(value: str):
        if not compiled.match(value):
            raise ValueError(message)
    return check

def is_positive(value: float):
    if value <= 0:
        raise ValueError("Must be positive")

def is_non_negative(value: float):
    if value < 0:
        raise ValueError("Must be non-negative")

def one_of(*choices):
    choices_set = set(choices)
    def check(value):
        if value not in choices_set:
            raise ValueError(f"Must be one of: {choices}")
    return check
```

## Approach 3: Combining with typing for IDE Support

Type hints provide IDE autocompletion and static analysis. Combine them with runtime validation for both benefits.

```python
from dataclasses import dataclass, field
from typing import Annotated, TypeVar, get_type_hints, get_origin, get_args
from typing import List, Optional, Union
import re

# Define validation metadata types
class StringConstraints:
    def __init__(
        self,
        min_length: int = 0,
        max_length: int = None,
        pattern: str = None
    ):
        self.min_length = min_length
        self.max_length = max_length
        self.pattern = pattern

    def validate(self, value: str, field_name: str):
        if not isinstance(value, str):
            raise TypeError(f"{field_name} must be a string")
        if len(value) < self.min_length:
            raise ValueError(
                f"{field_name} must be at least {self.min_length} characters"
            )
        if self.max_length and len(value) > self.max_length:
            raise ValueError(
                f"{field_name} must be at most {self.max_length} characters"
            )
        if self.pattern and not re.match(self.pattern, value):
            raise ValueError(f"{field_name} does not match required pattern")


class NumberConstraints:
    def __init__(
        self,
        ge: float = None,  # greater than or equal
        le: float = None,  # less than or equal
        gt: float = None,  # greater than
        lt: float = None   # less than
    ):
        self.ge = ge
        self.le = le
        self.gt = gt
        self.lt = lt

    def validate(self, value: Union[int, float], field_name: str):
        if not isinstance(value, (int, float)):
            raise TypeError(f"{field_name} must be a number")
        if self.ge is not None and value < self.ge:
            raise ValueError(f"{field_name} must be >= {self.ge}")
        if self.le is not None and value > self.le:
            raise ValueError(f"{field_name} must be <= {self.le}")
        if self.gt is not None and value <= self.gt:
            raise ValueError(f"{field_name} must be > {self.gt}")
        if self.lt is not None and value < self.lt:
            raise ValueError(f"{field_name} must be < {self.lt}")


class ListConstraints:
    def __init__(self, min_items: int = 0, max_items: int = None):
        self.min_items = min_items
        self.max_items = max_items

    def validate(self, value: list, field_name: str):
        if not isinstance(value, list):
            raise TypeError(f"{field_name} must be a list")
        if len(value) < self.min_items:
            raise ValueError(
                f"{field_name} must have at least {self.min_items} items"
            )
        if self.max_items and len(value) > self.max_items:
            raise ValueError(
                f"{field_name} must have at most {self.max_items} items"
            )


def validated_dataclass(cls):
    """
    Decorator that adds validation based on Annotated type hints.
    """
    original_init = cls.__init__
    hints = get_type_hints(cls, include_extras=True)

    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)

        for field_name, hint in hints.items():
            if get_origin(hint) is Annotated:
                args_list = get_args(hint)
                value = getattr(self, field_name)

                for constraint in args_list[1:]:
                    if hasattr(constraint, 'validate'):
                        constraint.validate(value, field_name)

    cls.__init__ = new_init
    return cls
```

Using the annotation-based validation:

```python
@validated_dataclass
@dataclass
class UserProfile:
    # IDE sees these as their base types (str, int, etc.)
    # Runtime validation uses the constraints
    username: Annotated[
        str,
        StringConstraints(min_length=3, max_length=20, pattern=r'^[a-z0-9_]+$')
    ]

    display_name: Annotated[
        str,
        StringConstraints(min_length=1, max_length=50)
    ]

    age: Annotated[
        int,
        NumberConstraints(ge=13, le=120)
    ]

    score: Annotated[
        float,
        NumberConstraints(ge=0.0, le=100.0)
    ]

    tags: Annotated[
        List[str],
        ListConstraints(min_items=1, max_items=10)
    ]


# Test annotated validation
profile = UserProfile(
    username="john_doe",
    display_name="John Doe",
    age=25,
    score=85.5,
    tags=["python", "developer"]
)
print(f"Created profile for: {profile.username}")

# This will fail validation
try:
    bad_profile = UserProfile(
        username="ab",  # Too short
        display_name="Test",
        age=25,
        score=50.0,
        tags=["test"]
    )
except ValueError as e:
    print(f"Validation failed: {e}")
```

## Approach 4: Pydantic Dataclasses Comparison

Pydantic provides production-ready validation with excellent error messages. Here's a comparison with native approaches.

```python
from pydantic import field_validator, model_validator
from pydantic.dataclasses import dataclass as pydantic_dataclass
from typing import List, Optional
from datetime import datetime

@pydantic_dataclass
class PydanticUser:
    username: str
    email: str
    age: int
    tags: List[str] = None
    created_at: datetime = None

    @field_validator('username')
    @classmethod
    def username_must_be_valid(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()  # Normalize to lowercase

    @field_validator('email')
    @classmethod
    def email_must_be_valid(cls, v: str) -> str:
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('age')
    @classmethod
    def age_must_be_reasonable(cls, v: int) -> int:
        if v < 0 or v > 150:
            raise ValueError('Age must be between 0 and 150')
        return v

    @field_validator('tags')
    @classmethod
    def tags_must_be_valid(cls, v: Optional[List[str]]) -> List[str]:
        if v is None:
            return []
        return [tag.strip().lower() for tag in v if tag.strip()]

    @model_validator(mode='after')
    def set_created_at(self):
        if self.created_at is None:
            object.__setattr__(self, 'created_at', datetime.now())
        return self
```

### Feature Comparison Table

| Feature | Native __post_init__ | Descriptors | Pydantic |
|---------|---------------------|-------------|----------|
| Setup complexity | Low | Medium | Low |
| Runtime validation | Yes | Yes | Yes |
| Assignment validation | No | Yes | Yes |
| Automatic coercion | No | No | Yes |
| Nested validation | Manual | Manual | Automatic |
| Error messages | Custom | Custom | Detailed |
| IDE support | Good | Limited | Excellent |
| Dependencies | None | None | pydantic |
| Performance | Fastest | Fast | Good |
| JSON serialization | Manual | Manual | Built-in |

### When to Use Each Approach

```python
# Use __post_init__ when:
# - You need simple validation without dependencies
# - Validation only matters at construction time
# - You want maximum performance

@dataclass
class SimpleConfig:
    host: str
    port: int

    def __post_init__(self):
        if not self.host:
            raise ValueError("Host required")
        if not 1 <= self.port <= 65535:
            raise ValueError("Invalid port")


# Use descriptors when:
# - You need to validate assignments after construction
# - You want reusable validation logic across classes
# - You need computed or transformed values

class PortNumber:
    def __set_name__(self, owner, name):
        self.name = name
        self.storage = f"_{name}"

    def __get__(self, obj, type=None):
        return getattr(obj, self.storage, None)

    def __set__(self, obj, value):
        if not isinstance(value, int) or not 1 <= value <= 65535:
            raise ValueError(f"Invalid port: {value}")
        setattr(obj, self.storage, value)


# Use Pydantic when:
# - You need JSON serialization and deserialization
# - You want automatic type coercion
# - You need detailed error messages for APIs
# - You have complex nested structures
```

## Approach 5: Custom Validator Decorators

Build a decorator-based system for clean, reusable validation.

```python
from dataclasses import dataclass, fields
from typing import Callable, Dict, List, Any, Type
from functools import wraps

# Storage for field validators
_field_validators: Dict[Type, Dict[str, List[Callable]]] = {}

def field_validator(*field_names: str):
    """
    Decorator to register a method as a validator for specific fields.
    """
    def decorator(method: Callable):
        method._validates_fields = field_names
        return method
    return decorator


def model_validator(method: Callable):
    """
    Decorator to register a method as a model-level validator.
    Runs after all field validators.
    """
    method._is_model_validator = True
    return method


def validated(cls):
    """
    Class decorator that enables validation decorators.
    """
    original_init = cls.__init__

    # Collect validators from methods
    field_validators: Dict[str, List[Callable]] = {}
    model_validators: List[Callable] = []

    for attr_name in dir(cls):
        method = getattr(cls, attr_name, None)
        if method is None:
            continue

        if hasattr(method, '_validates_fields'):
            for field_name in method._validates_fields:
                if field_name not in field_validators:
                    field_validators[field_name] = []
                field_validators[field_name].append(method)

        if hasattr(method, '_is_model_validator'):
            model_validators.append(method)

    @wraps(original_init)
    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)

        # Run field validators
        for field_info in fields(cls):
            validators = field_validators.get(field_info.name, [])
            value = getattr(self, field_info.name)

            for validator in validators:
                result = validator(self, value)
                if result is not None:
                    setattr(self, field_info.name, result)

        # Run model validators
        for validator in model_validators:
            validator(self)

    cls.__init__ = new_init
    return cls
```

Using the custom decorator system:

```python
@validated
@dataclass
class Order:
    order_id: str
    customer_email: str
    items: List[str]
    total: float
    discount_code: Optional[str] = None
    final_total: float = 0.0

    @field_validator('order_id')
    def validate_order_id(self, value: str) -> str:
        import re
        if not re.match(r'^ORD-\d{8}$', value):
            raise ValueError(
                f"Order ID must match format ORD-XXXXXXXX, got: {value}"
            )
        return value

    @field_validator('customer_email')
    def validate_email(self, value: str) -> str:
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, value):
            raise ValueError(f"Invalid email: {value}")
        return value.lower()  # Normalize

    @field_validator('items')
    def validate_items(self, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("Order must have at least one item")
        if len(value) > 100:
            raise ValueError("Order cannot have more than 100 items")
        return value

    @field_validator('total')
    def validate_total(self, value: float) -> float:
        if value < 0:
            raise ValueError("Total cannot be negative")
        return round(value, 2)

    @field_validator('discount_code')
    def validate_discount(self, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.startswith('DISC-'):
            raise ValueError("Discount code must start with DISC-")
        return value.upper()

    @model_validator
    def calculate_final_total(self):
        discount = 0.10 if self.discount_code else 0.0
        self.final_total = round(self.total * (1 - discount), 2)


# Test the decorated dataclass
order = Order(
    order_id="ORD-12345678",
    customer_email="CUSTOMER@Example.COM",
    items=["item1", "item2"],
    total=99.999,
    discount_code="disc-summer"
)

print(f"Order: {order.order_id}")
print(f"Email (normalized): {order.customer_email}")
print(f"Total (rounded): ${order.total}")
print(f"Discount code: {order.discount_code}")
print(f"Final total: ${order.final_total}")
```

## Approach 6: Nested Dataclass Validation

Real applications often have nested structures. Here's how to validate them properly.

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from enum import Enum

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


@dataclass
class Address:
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "US"

    def __post_init__(self):
        if not self.street or not self.street.strip():
            raise ValueError("Street address is required")
        if not self.city or not self.city.strip():
            raise ValueError("City is required")
        if not self.state or len(self.state) != 2:
            raise ValueError("State must be a 2-letter code")
        if not self.postal_code:
            raise ValueError("Postal code is required")

        # Normalize values
        self.street = self.street.strip()
        self.city = self.city.strip().title()
        self.state = self.state.upper()
        self.country = self.country.upper()


@dataclass
class OrderItem:
    product_id: str
    product_name: str
    quantity: int
    unit_price: float

    def __post_init__(self):
        if not self.product_id:
            raise ValueError("Product ID is required")
        if not self.product_name:
            raise ValueError("Product name is required")
        if self.quantity < 1:
            raise ValueError("Quantity must be at least 1")
        if self.unit_price < 0:
            raise ValueError("Unit price cannot be negative")

    @property
    def subtotal(self) -> float:
        return round(self.quantity * self.unit_price, 2)


@dataclass
class Customer:
    customer_id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

    def __post_init__(self):
        import re

        if not self.customer_id:
            raise ValueError("Customer ID is required")

        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, self.email):
            raise ValueError(f"Invalid email: {self.email}")

        if not self.first_name or not self.first_name.strip():
            raise ValueError("First name is required")
        if not self.last_name or not self.last_name.strip():
            raise ValueError("Last name is required")

        # Normalize
        self.email = self.email.lower()
        self.first_name = self.first_name.strip().title()
        self.last_name = self.last_name.strip().title()

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


@dataclass
class ShippingInfo:
    address: Address
    method: str
    estimated_delivery: Optional[date] = None
    tracking_number: Optional[str] = None

    VALID_METHODS = {'standard', 'express', 'overnight', 'pickup'}

    def __post_init__(self):
        # Validate nested Address - already validated by its own __post_init__
        if not isinstance(self.address, Address):
            raise TypeError("address must be an Address instance")

        if self.method not in self.VALID_METHODS:
            raise ValueError(
                f"Invalid shipping method: {self.method}. "
                f"Must be one of: {self.VALID_METHODS}"
            )

        if self.estimated_delivery and self.estimated_delivery < date.today():
            raise ValueError("Estimated delivery cannot be in the past")


@dataclass
class CompleteOrder:
    order_id: str
    customer: Customer
    items: List[OrderItem]
    shipping: ShippingInfo
    billing_address: Address
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        import re

        # Validate order ID format
        if not re.match(r'^ORD-\d{8,}$', self.order_id):
            raise ValueError(
                f"Invalid order ID format: {self.order_id}"
            )

        # Validate nested objects exist and are correct types
        if not isinstance(self.customer, Customer):
            raise TypeError("customer must be a Customer instance")

        if not isinstance(self.shipping, ShippingInfo):
            raise TypeError("shipping must be a ShippingInfo instance")

        if not isinstance(self.billing_address, Address):
            raise TypeError("billing_address must be an Address instance")

        # Validate items list
        if not self.items:
            raise ValueError("Order must have at least one item")

        for i, item in enumerate(self.items):
            if not isinstance(item, OrderItem):
                raise TypeError(f"Item at index {i} must be an OrderItem")

        # Validate status
        if not isinstance(self.status, OrderStatus):
            raise TypeError("status must be an OrderStatus enum value")

        # Validate notes length if provided
        if self.notes and len(self.notes) > 1000:
            raise ValueError("Notes cannot exceed 1000 characters")

    @property
    def total(self) -> float:
        return round(sum(item.subtotal for item in self.items), 2)

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items)

    def to_dict(self) -> Dict[str, Any]:
        """Convert order to dictionary for serialization."""
        return {
            'order_id': self.order_id,
            'customer': {
                'id': self.customer.customer_id,
                'email': self.customer.email,
                'name': self.customer.full_name
            },
            'items': [
                {
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'subtotal': item.subtotal
                }
                for item in self.items
            ],
            'total': self.total,
            'status': self.status.value,
            'created_at': self.created_at.isoformat()
        }
```

Testing nested validation:

```python
# Build a complete order with nested validation
customer = Customer(
    customer_id="CUST-001",
    email="john.doe@example.com",
    first_name="john",
    last_name="doe",
    phone="+1234567890"
)

shipping_address = Address(
    street="123 Main St",
    city="springfield",
    state="il",
    postal_code="62701"
)

billing_address = Address(
    street="456 Oak Ave",
    city="chicago",
    state="il",
    postal_code="60601"
)

items = [
    OrderItem(
        product_id="PROD-001",
        product_name="Widget",
        quantity=2,
        unit_price=29.99
    ),
    OrderItem(
        product_id="PROD-002",
        product_name="Gadget",
        quantity=1,
        unit_price=49.99
    )
]

shipping = ShippingInfo(
    address=shipping_address,
    method="express",
    estimated_delivery=date(2026, 2, 15)
)

order = CompleteOrder(
    order_id="ORD-12345678",
    customer=customer,
    items=items,
    shipping=shipping,
    billing_address=billing_address,
    notes="Please leave at door"
)

print(f"Order {order.order_id} created")
print(f"Customer: {order.customer.full_name}")
print(f"Items: {order.item_count}")
print(f"Total: ${order.total}")
print(f"Ship to: {order.shipping.address.city}, {order.shipping.address.state}")
```

## Building a Validation Framework

Here's a complete validation framework combining the best of all approaches:

```python
from dataclasses import dataclass, fields, field
from typing import (
    Any, Callable, Dict, List, Optional,
    Type, TypeVar, Union, get_type_hints
)
from functools import wraps
import re
from abc import ABC, abstractmethod

T = TypeVar('T')


class ValidationError(Exception):
    """Raised when validation fails."""

    def __init__(self, errors: Dict[str, List[str]]):
        self.errors = errors
        message = self._format_errors()
        super().__init__(message)

    def _format_errors(self) -> str:
        lines = ["Validation failed:"]
        for field_name, field_errors in self.errors.items():
            for error in field_errors:
                lines.append(f"  - {field_name}: {error}")
        return "\n".join(lines)


class Rule(ABC):
    """Base class for validation rules."""

    @abstractmethod
    def validate(self, value: Any, field_name: str) -> Optional[str]:
        """Return error message if invalid, None if valid."""
        pass


class Required(Rule):
    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None or (isinstance(value, str) and not value.strip()):
            return "This field is required"
        return None


class MinLength(Rule):
    def __init__(self, length: int):
        self.length = length

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and len(value) < self.length:
            return f"Must be at least {self.length} characters"
        return None


class MaxLength(Rule):
    def __init__(self, length: int):
        self.length = length

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and len(value) > self.length:
            return f"Must be at most {self.length} characters"
        return None


class Pattern(Rule):
    def __init__(self, pattern: str, message: str = None):
        self.pattern = re.compile(pattern)
        self.message = message or f"Must match pattern: {pattern}"

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and not self.pattern.match(str(value)):
            return self.message
        return None


class Range(Rule):
    def __init__(
        self,
        min_value: float = None,
        max_value: float = None
    ):
        self.min_value = min_value
        self.max_value = max_value

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is None:
            return None
        if self.min_value is not None and value < self.min_value:
            return f"Must be at least {self.min_value}"
        if self.max_value is not None and value > self.max_value:
            return f"Must be at most {self.max_value}"
        return None


class Email(Rule):
    PATTERN = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and not self.PATTERN.match(str(value)):
            return "Must be a valid email address"
        return None


class OneOf(Rule):
    def __init__(self, *choices):
        self.choices = set(choices)

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and value not in self.choices:
            return f"Must be one of: {', '.join(str(c) for c in self.choices)}"
        return None


class Custom(Rule):
    def __init__(
        self,
        func: Callable[[Any], bool],
        message: str
    ):
        self.func = func
        self.message = message

    def validate(self, value: Any, field_name: str) -> Optional[str]:
        if value is not None and not self.func(value):
            return self.message
        return None


# Registry for field rules
_rules_registry: Dict[Type, Dict[str, List[Rule]]] = {}


def rules(*field_rules: Rule):
    """Decorator to attach validation rules to a field."""
    def decorator(cls):
        if cls not in _rules_registry:
            _rules_registry[cls] = {}
        return cls
    return decorator


def validated_field(*rules: Rule):
    """Mark a field with validation rules using field metadata."""
    return field(default=None, metadata={'rules': list(rules)})


def validate_dataclass(instance: Any) -> None:
    """Validate a dataclass instance and raise ValidationError if invalid."""
    errors: Dict[str, List[str]] = {}

    for f in fields(instance):
        value = getattr(instance, f.name)
        field_errors: List[str] = []

        # Get rules from field metadata
        rules_list = f.metadata.get('rules', [])

        for rule in rules_list:
            error = rule.validate(value, f.name)
            if error:
                field_errors.append(error)

        if field_errors:
            errors[f.name] = field_errors

    if errors:
        raise ValidationError(errors)


def auto_validate(cls):
    """Class decorator that automatically validates on init."""
    original_init = cls.__init__

    @wraps(original_init)
    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        validate_dataclass(self)

    cls.__init__ = new_init
    return cls
```

Using the complete framework:

```python
@auto_validate
@dataclass
class RegistrationForm:
    username: str = validated_field(
        Required(),
        MinLength(3),
        MaxLength(20),
        Pattern(r'^[a-z0-9_]+$', "Username can only contain lowercase letters, numbers, and underscores")
    )

    email: str = validated_field(
        Required(),
        Email()
    )

    password: str = validated_field(
        Required(),
        MinLength(8),
        Pattern(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
            "Password must contain uppercase, lowercase, and number"
        )
    )

    age: int = validated_field(
        Required(),
        Range(min_value=13, max_value=120)
    )

    country: str = validated_field(
        Required(),
        OneOf('US', 'CA', 'UK', 'AU', 'DE', 'FR')
    )

    bio: Optional[str] = validated_field(
        MaxLength(500)
    )


# Test with valid data
try:
    form = RegistrationForm(
        username="john_doe",
        email="john@example.com",
        password="SecurePass123",
        age=25,
        country="US",
        bio="Hello, I am John!"
    )
    print("Registration successful!")
    print(f"Welcome, {form.username}")
except ValidationError as e:
    print(e)

# Test with invalid data - shows all errors at once
try:
    form = RegistrationForm(
        username="JD",  # Too short, has uppercase
        email="not-an-email",
        password="weak",
        age=10,  # Too young
        country="XX",  # Invalid
        bio="x" * 600  # Too long
    )
except ValidationError as e:
    print(e)
```

## Summary

Here's what each approach offers:

| Approach | Best For | Trade-offs |
|----------|----------|------------|
| `__post_init__` | Simple cases, no dependencies | No assignment validation |
| Descriptors | Reusable validators, assignment checking | More boilerplate |
| Annotated types | IDE support with runtime checks | Requires custom infrastructure |
| Pydantic | Production APIs, complex data | External dependency |
| Custom decorators | Team-specific conventions | Maintenance burden |
| Nested validation | Complex domain models | More code organization needed |

Start with `__post_init__` for simple cases. Move to Pydantic when you need serialization, automatic coercion, or detailed error messages. Use descriptors when you need to validate assignments after construction. Build custom frameworks only when you have specific requirements that existing tools do not cover.

The key is choosing the right level of complexity for your use case. Simple configuration objects might need only basic `__post_init__` checks, while API request and response models benefit from Pydantic's full feature set.
