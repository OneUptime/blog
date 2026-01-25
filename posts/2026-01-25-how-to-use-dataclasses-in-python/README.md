# How to Use dataclasses in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, dataclasses, Object-Oriented Programming, Data Structures, Type Hints, Clean Code

Description: Master Python's dataclasses module for creating clean, efficient data containers. Learn about field options, inheritance, immutability, and practical patterns for real-world applications.

---

> Python's dataclasses module, introduced in Python 3.7, provides a decorator and functions for automatically generating special methods like `__init__`, `__repr__`, and `__eq__`. They reduce boilerplate while keeping your code readable.

Before dataclasses, creating simple data-holding classes required writing repetitive code. Dataclasses solve this problem elegantly while offering powerful features for customization.

---

## Basic Usage

### Your First Dataclass

```python
# basic_dataclass.py
# Creating a simple dataclass
from dataclasses import dataclass

@dataclass
class User:
    """A user in the system."""
    name: str
    email: str
    age: int

# The @dataclass decorator automatically generates:
# - __init__(self, name, email, age)
# - __repr__(self)
# - __eq__(self, other)

# Create instances like regular classes
user1 = User(name="Alice", email="alice@example.com", age=30)
user2 = User("Bob", "bob@example.com", 25)  # Positional args also work

# Nice string representation for free
print(user1)
# Output: User(name='Alice', email='alice@example.com', age=30)

# Equality comparison based on field values
user3 = User("Alice", "alice@example.com", 30)
print(user1 == user3)  # True - same values
print(user1 == user2)  # False - different values
```

### Comparing to Traditional Classes

```python
# Without dataclasses - lots of boilerplate
class TraditionalUser:
    def __init__(self, name, email, age):
        self.name = name
        self.email = email
        self.age = age

    def __repr__(self):
        return f"TraditionalUser(name={self.name!r}, email={self.email!r}, age={self.age})"

    def __eq__(self, other):
        if not isinstance(other, TraditionalUser):
            return NotImplemented
        return (self.name, self.email, self.age) == (other.name, other.email, other.age)

# With dataclasses - clean and concise
@dataclass
class DataclassUser:
    name: str
    email: str
    age: int

# Both achieve the same functionality, but dataclass requires far less code
```

---

## Field Options

### Default Values

```python
from dataclasses import dataclass, field
from typing import List
from datetime import datetime

@dataclass
class BlogPost:
    """A blog post with various field configurations."""
    title: str
    author: str

    # Simple default value
    published: bool = False

    # Default value using field() - required for mutable defaults
    tags: List[str] = field(default_factory=list)

    # Dynamic default using a factory function
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Field that is not part of __init__
    word_count: int = field(init=False, default=0)

    # Field excluded from repr
    internal_id: str = field(default="", repr=False)

# Create with minimal arguments
post = BlogPost(title="Python Tips", author="Alice")
print(post.tags)  # [] - empty list, not shared between instances
print(post.created_at)  # Current timestamp

# IMPORTANT: Never use mutable default values directly
# BAD: tags: List[str] = []  # This list would be shared!
# GOOD: tags: List[str] = field(default_factory=list)
```

### Field Metadata

```python
from dataclasses import dataclass, field

@dataclass
class Product:
    """Product with field metadata for validation."""
    name: str = field(metadata={'min_length': 1, 'max_length': 100})
    price: float = field(metadata={'min': 0, 'currency': 'USD'})
    quantity: int = field(metadata={'min': 0})

# Access metadata programmatically
from dataclasses import fields

for f in fields(Product):
    print(f"Field: {f.name}")
    print(f"  Type: {f.type}")
    print(f"  Metadata: {f.metadata}")

# Useful for building validation or serialization frameworks
```

---

## Post-Initialization Processing

```python
from dataclasses import dataclass, field

@dataclass
class Rectangle:
    """Rectangle with computed properties."""
    width: float
    height: float

    # Computed field - not in __init__
    area: float = field(init=False)
    perimeter: float = field(init=False)

    def __post_init__(self):
        """Called after the auto-generated __init__."""
        # Calculate derived values
        self.area = self.width * self.height
        self.perimeter = 2 * (self.width + self.height)

rect = Rectangle(width=10, height=5)
print(f"Area: {rect.area}")  # 50
print(f"Perimeter: {rect.perimeter}")  # 30


@dataclass
class EmailAddress:
    """Email with validation in post_init."""
    raw_email: str

    # Normalized version of the email
    normalized: str = field(init=False)
    domain: str = field(init=False)

    def __post_init__(self):
        # Validate email format
        if '@' not in self.raw_email:
            raise ValueError(f"Invalid email: {self.raw_email}")

        # Normalize and extract parts
        self.normalized = self.raw_email.lower().strip()
        self.domain = self.normalized.split('@')[1]

email = EmailAddress("  Alice@Example.COM  ")
print(email.normalized)  # alice@example.com
print(email.domain)  # example.com
```

---

## Immutable Dataclasses

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    """An immutable 2D point."""
    x: float
    y: float

point = Point(3.0, 4.0)

# Frozen dataclasses cannot be modified
try:
    point.x = 5.0  # This raises an error
except AttributeError as e:
    print(f"Cannot modify frozen dataclass: {e}")

# Frozen dataclasses can be used in sets and as dict keys
points = {Point(0, 0), Point(1, 1), Point(0, 0)}
print(len(points))  # 2 - duplicates removed

# Use as dictionary keys
distances = {Point(0, 0): 0, Point(3, 4): 5}


@dataclass(frozen=True)
class Config:
    """Immutable configuration object."""
    database_url: str
    debug: bool = False
    max_connections: int = 10

    def with_debug(self, debug: bool) -> 'Config':
        """Create a new Config with updated debug setting."""
        # Since frozen, we return a new instance
        from dataclasses import replace
        return replace(self, debug=debug)

config = Config(database_url="postgresql://localhost/db")
debug_config = config.with_debug(True)
print(config.debug)  # False - original unchanged
print(debug_config.debug)  # True
```

---

## Inheritance

```python
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

@dataclass
class BaseModel:
    """Base class for all database models."""
    id: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

@dataclass
class User(BaseModel):
    """User model extending BaseModel."""
    username: str = ""  # Default required because parent has defaults
    email: str = ""
    is_active: bool = True

@dataclass
class Admin(User):
    """Admin user with additional permissions."""
    permissions: list = field(default_factory=list)
    access_level: int = 1

# Create instances
user = User(username="alice", email="alice@example.com")
print(user.id)  # None - inherited from BaseModel
print(user.created_at)  # Current timestamp

admin = Admin(
    username="admin",
    email="admin@example.com",
    permissions=["read", "write", "delete"],
    access_level=10
)
```

---

## Comparison and Ordering

```python
from dataclasses import dataclass

@dataclass(order=True)
class Version:
    """Software version with comparison support."""
    # Fields are compared in order they are defined
    major: int
    minor: int
    patch: int

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"

versions = [
    Version(2, 0, 0),
    Version(1, 9, 5),
    Version(1, 10, 0),
    Version(2, 0, 1),
]

# Sorting works automatically with order=True
sorted_versions = sorted(versions)
for v in sorted_versions:
    print(v)
# Output: 1.9.5, 1.10.0, 2.0.0, 2.0.1

# Comparison operators work
print(Version(2, 0, 0) > Version(1, 9, 5))  # True


@dataclass(order=True)
class Task:
    """Task with custom sort key."""
    # Use sort_index to control what gets compared
    sort_index: int = field(init=False, repr=False)

    priority: int
    name: str

    def __post_init__(self):
        # Higher priority = lower sort_index (sorted first)
        self.sort_index = -self.priority

tasks = [
    Task(priority=1, name="Low priority"),
    Task(priority=3, name="High priority"),
    Task(priority=2, name="Medium priority"),
]

for task in sorted(tasks):
    print(f"{task.name} (priority: {task.priority})")
# Output: High priority, Medium priority, Low priority
```

---

## Converting to Dictionaries and JSON

```python
from dataclasses import dataclass, asdict, astuple
import json

@dataclass
class Address:
    street: str
    city: str
    country: str

@dataclass
class Person:
    name: str
    age: int
    address: Address

# Create nested structure
person = Person(
    name="Alice",
    age=30,
    address=Address("123 Main St", "Boston", "USA")
)

# Convert to dictionary (recursively)
person_dict = asdict(person)
print(person_dict)
# {'name': 'Alice', 'age': 30, 'address': {'street': '123 Main St', 'city': 'Boston', 'country': 'USA'}}

# Convert to tuple
person_tuple = astuple(person)
print(person_tuple)
# ('Alice', 30, ('123 Main St', 'Boston', 'USA'))

# JSON serialization
json_str = json.dumps(asdict(person), indent=2)
print(json_str)

# JSON deserialization requires custom handling
def person_from_dict(data: dict) -> Person:
    """Create Person from dictionary."""
    address = Address(**data['address'])
    return Person(name=data['name'], age=data['age'], address=address)

restored = person_from_dict(json.loads(json_str))
print(restored)
```

---

## Practical Patterns

### Configuration Objects

```python
from dataclasses import dataclass, field
from typing import List
import os

@dataclass(frozen=True)
class DatabaseConfig:
    """Database configuration."""
    host: str = "localhost"
    port: int = 5432
    database: str = "app"
    user: str = "postgres"
    password: str = field(default="", repr=False)  # Hide in repr

    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        """Create config from environment variables."""
        return cls(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            database=os.getenv('DB_NAME', 'app'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', '')
        )

    @property
    def connection_string(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
```

### API Response Models

```python
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Generic, TypeVar
from datetime import datetime

T = TypeVar('T')

@dataclass
class ApiResponse(Generic[T]):
    """Generic API response wrapper."""
    data: T
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return result

@dataclass
class UserResponse:
    id: int
    username: str
    email: str

# Create a typed response
response = ApiResponse[UserResponse](
    data=UserResponse(id=1, username="alice", email="alice@example.com"),
    message="User retrieved successfully"
)
print(response.to_dict())
```

---

## Conclusion

Dataclasses simplify Python class definitions while providing powerful features:

- Automatic generation of `__init__`, `__repr__`, and `__eq__`
- Field defaults and factories for complex types
- Immutability with `frozen=True`
- Built-in comparison with `order=True`
- Easy conversion to dictionaries and tuples

Use dataclasses for any class that primarily holds data. They make your code cleaner, more readable, and less prone to bugs.

---

*Building Python applications with complex data models? [OneUptime](https://oneuptime.com) helps you monitor your applications and catch issues before they impact users.*

