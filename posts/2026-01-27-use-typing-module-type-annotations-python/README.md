# How to Use typing Module for Type Annotations in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Type Hints, typing, Type Annotations, Static Analysis, mypy

Description: Master Python's typing module for better code quality. Learn how to use type hints, generics, protocols, and type guards to write safer, more maintainable code.

---

> Type annotations in Python provide documentation, enable better IDE support, and catch bugs before runtime with static analysis tools like mypy. The typing module provides the building blocks for expressing complex types.

This guide covers everything you need to know about type annotations in Python, from basic types to advanced patterns.

---

## Basic Type Annotations

### Function Annotations

```python
# basic_types.py
# Basic type annotations for functions

def greet(name: str) -> str:
    """Greet a person by name."""
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    """Add two integers."""
    return a + b

def divide(a: float, b: float) -> float:
    """Divide a by b."""
    return a / b

def process_items(items: list, count: int) -> bool:
    """Process items and return success status."""
    return len(items) >= count

# Variable annotations
name: str = "Alice"
age: int = 30
price: float = 19.99
is_active: bool = True
```

### Collections

```python
# collection_types.py
# Type annotations for collections
from typing import List, Dict, Set, Tuple, Sequence

# Lists with element type
def get_names() -> List[str]:
    return ["Alice", "Bob", "Charlie"]

def sum_numbers(numbers: List[int]) -> int:
    return sum(numbers)

# Dictionaries with key and value types
def get_user_ages() -> Dict[str, int]:
    return {"Alice": 30, "Bob": 25}

def update_config(config: Dict[str, str]) -> None:
    config["updated"] = "true"

# Sets
def get_unique_tags() -> Set[str]:
    return {"python", "coding", "tutorial"}

# Tuples - fixed length with specific types
def get_coordinates() -> Tuple[float, float]:
    return (40.7128, -74.0060)

# Variable length tuple with same type
def get_scores() -> Tuple[int, ...]:
    return (85, 90, 78, 92)

# Python 3.9+ - use built-in types directly
def modern_types() -> list[str]:
    return ["no", "import", "needed"]

def modern_dict() -> dict[str, int]:
    return {"count": 42}
```

---

## Optional and Union Types

```python
# optional_union.py
# Handling optional values and multiple types
from typing import Optional, Union

# Optional - can be the type or None
def find_user(user_id: int) -> Optional[str]:
    """Find user by ID, return None if not found."""
    users = {1: "Alice", 2: "Bob"}
    return users.get(user_id)

# Explicit Optional is the same as Union with None
def get_config_value(key: str) -> Optional[str]:
    # Same as: Union[str, None]
    config = {"debug": "true"}
    return config.get(key)

# Union - can be any of the specified types
def process_id(id_value: Union[int, str]) -> str:
    """Process an ID that could be int or string."""
    return str(id_value)

def parse_input(value: Union[str, int, float]) -> float:
    """Convert various inputs to float."""
    return float(value)

# Python 3.10+ - use | for unions
def modern_union(value: int | str) -> str:
    return str(value)

def modern_optional(name: str | None) -> str:
    return name or "Anonymous"
```

---

## Callable Types

```python
# callable_types.py
# Type hints for functions and callbacks
from typing import Callable, Any

# Function that takes another function as argument
def apply_operation(x: int, y: int, operation: Callable[[int, int], int]) -> int:
    """Apply an operation to two integers."""
    return operation(x, y)

# Usage
result = apply_operation(5, 3, lambda a, b: a + b)

# Callback with no arguments
def on_complete(callback: Callable[[], None]) -> None:
    """Execute callback when done."""
    # ... do work ...
    callback()

# Callback with any arguments
def register_handler(handler: Callable[..., Any]) -> None:
    """Register a handler that can take any arguments."""
    pass

# Function returning a function
def create_multiplier(factor: int) -> Callable[[int], int]:
    """Return a function that multiplies by factor."""
    def multiplier(x: int) -> int:
        return x * factor
    return multiplier

double = create_multiplier(2)
result = double(5)  # 10
```

---

## Generics

```python
# generics.py
# Generic types for reusable code
from typing import TypeVar, Generic, List, Optional

# Define a type variable
T = TypeVar('T')

def first_element(items: List[T]) -> Optional[T]:
    """Get the first element of a list."""
    return items[0] if items else None

# Works with any type
names: List[str] = ["Alice", "Bob"]
first_name = first_element(names)  # Type: Optional[str]

numbers: List[int] = [1, 2, 3]
first_number = first_element(numbers)  # Type: Optional[int]


# Generic classes
class Stack(Generic[T]):
    """A generic stack implementation."""

    def __init__(self) -> None:
        self._items: List[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

    def is_empty(self) -> bool:
        return len(self._items) == 0

# Usage with specific types
string_stack: Stack[str] = Stack()
string_stack.push("hello")
value: str = string_stack.pop()

int_stack: Stack[int] = Stack()
int_stack.push(42)


# Bounded type variables
from typing import TypeVar
from numbers import Number

N = TypeVar('N', bound=Number)

def double(x: N) -> N:
    """Double any numeric value."""
    return x * 2  # type: ignore

# Multiple constraints
T = TypeVar('T', str, bytes)

def concat(a: T, b: T) -> T:
    """Concatenate strings or bytes."""
    return a + b
```

---

## TypedDict and NamedTuple

```python
# structured_types.py
# Typed dictionaries and named tuples
from typing import TypedDict, NamedTuple, Optional

# TypedDict - dictionary with specific keys and types
class UserDict(TypedDict):
    id: int
    name: str
    email: str
    is_active: bool

def create_user(data: UserDict) -> None:
    """Process user data with known structure."""
    print(f"Creating user: {data['name']}")

user: UserDict = {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "is_active": True
}

# Optional keys in TypedDict
class ConfigDict(TypedDict, total=False):
    debug: bool
    log_level: str
    timeout: int

# Required and optional keys
class APIResponse(TypedDict):
    status: str  # Required
    data: dict   # Required

class APIResponseWithMeta(APIResponse, total=False):
    meta: dict   # Optional


# NamedTuple - immutable tuple with named fields
class Point(NamedTuple):
    x: float
    y: float

class User(NamedTuple):
    id: int
    name: str
    email: str
    is_active: bool = True  # Default value

# Usage
point = Point(3.0, 4.0)
print(point.x, point.y)

user = User(1, "Alice", "alice@example.com")
print(user.name)

# NamedTuples are immutable
# user.name = "Bob"  # Error!
```

---

## Protocols and Structural Subtyping

```python
# protocols.py
# Structural typing with Protocols
from typing import Protocol, runtime_checkable

class Drawable(Protocol):
    """Protocol for objects that can be drawn."""

    def draw(self) -> None:
        """Draw the object."""
        ...

class Resizable(Protocol):
    """Protocol for objects that can be resized."""

    def resize(self, width: int, height: int) -> None:
        """Resize the object."""
        ...

# Classes do not need to explicitly inherit from Protocol
class Circle:
    def __init__(self, radius: float):
        self.radius = radius

    def draw(self) -> None:
        print(f"Drawing circle with radius {self.radius}")

class Rectangle:
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def draw(self) -> None:
        print(f"Drawing rectangle {self.width}x{self.height}")

    def resize(self, width: int, height: int) -> None:
        self.width = width
        self.height = height

# Function accepts any Drawable
def render(shape: Drawable) -> None:
    shape.draw()

# Both Circle and Rectangle work - they have draw() method
render(Circle(5.0))
render(Rectangle(10.0, 20.0))


# Runtime checkable protocols
@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None:
        ...

# Can use isinstance with runtime_checkable protocols
class FileHandler:
    def close(self) -> None:
        print("Closing file")

handler = FileHandler()
print(isinstance(handler, Closeable))  # True
```

---

## Type Guards and Narrowing

```python
# type_guards.py
# Type narrowing and type guards
from typing import Union, TypeGuard, List

# Type narrowing with isinstance
def process_value(value: Union[int, str]) -> str:
    if isinstance(value, int):
        # Here, value is narrowed to int
        return f"Integer: {value * 2}"
    else:
        # Here, value is narrowed to str
        return f"String: {value.upper()}"

# Custom type guard
def is_string_list(items: List[object]) -> TypeGuard[List[str]]:
    """Check if all items in list are strings."""
    return all(isinstance(item, str) for item in items)

def process_items(items: List[object]) -> None:
    if is_string_list(items):
        # items is now List[str]
        for item in items:
            print(item.upper())  # String methods available
    else:
        print("Not all items are strings")

# Assertion-based narrowing
def get_user_name(user: Union[dict, None]) -> str:
    assert user is not None
    # user is narrowed to dict
    return user["name"]

# None checking
def greet(name: Optional[str]) -> str:
    if name is None:
        return "Hello, stranger!"
    # name is narrowed to str
    return f"Hello, {name}!"
```

---

## Literal and Final Types

```python
# literal_final.py
# Literal types and Final
from typing import Literal, Final

# Literal - specific values only
def set_mode(mode: Literal["read", "write", "append"]) -> None:
    """Set file mode - only specific values allowed."""
    print(f"Mode set to: {mode}")

set_mode("read")    # OK
set_mode("write")   # OK
# set_mode("delete")  # Error: not a valid literal

# HTTP methods
HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]

def make_request(method: HttpMethod, url: str) -> None:
    print(f"{method} {url}")

# Status codes
StatusCode = Literal[200, 201, 400, 404, 500]

def handle_response(status: StatusCode) -> None:
    if status == 200:
        print("Success")


# Final - cannot be reassigned or overridden
MAX_CONNECTIONS: Final = 100
API_VERSION: Final[str] = "v1"

# MAX_CONNECTIONS = 200  # Error: cannot reassign Final

class Base:
    @final
    def critical_method(self) -> None:
        """This method cannot be overridden."""
        pass

class Config:
    DEBUG: Final = False
    DATABASE_URL: Final[str] = "postgresql://localhost/db"
```

---

## Type Aliases

```python
# type_aliases.py
# Creating type aliases for readability
from typing import Dict, List, Tuple, Callable, TypeAlias

# Simple aliases
UserId = int
Username = str
Email = str

# Complex aliases
UserData = Dict[str, str]
Coordinates = Tuple[float, float]
Matrix = List[List[float]]

# Callback types
EventHandler = Callable[[str, dict], None]
ErrorCallback = Callable[[Exception], None]

# Using TypeAlias (Python 3.10+)
JsonValue: TypeAlias = Union[str, int, float, bool, None, List["JsonValue"], Dict[str, "JsonValue"]]

# Usage improves readability
def get_user(user_id: UserId) -> UserData:
    return {"name": "Alice", "email": "alice@example.com"}

def process_location(coords: Coordinates) -> None:
    lat, lon = coords
    print(f"Processing: {lat}, {lon}")

def register_handler(handler: EventHandler) -> None:
    pass
```

---

## Best Practices

```python
# best_practices.py
# Type annotation best practices

# 1. Start with function signatures
def calculate_total(items: List[dict], tax_rate: float) -> float:
    subtotal = sum(item["price"] for item in items)
    return subtotal * (1 + tax_rate)

# 2. Use Optional for values that can be None
def find_item(items: List[str], target: str) -> Optional[int]:
    try:
        return items.index(target)
    except ValueError:
        return None

# 3. Use TypedDict for structured dictionaries
class OrderItem(TypedDict):
    name: str
    price: float
    quantity: int

# 4. Avoid Any when possible
# Bad: def process(data: Any) -> Any
# Good: def process(data: Dict[str, str]) -> List[str]

# 5. Use Protocols for duck typing
class Serializable(Protocol):
    def to_dict(self) -> dict:
        ...

# 6. Run mypy in CI/CD
# mypy --strict your_module.py
```

---

## Conclusion

Type annotations in Python provide:

- Better documentation through explicit types
- Improved IDE support with autocomplete and error detection
- Bug prevention with static analysis tools
- Clearer interfaces for functions and classes

Start by annotating function signatures, then gradually add more specific types as needed. Use mypy to catch type errors before runtime.

---

*Building type-safe Python applications? [OneUptime](https://oneuptime.com) helps you monitor your applications, track errors, and ensure reliability in production.*

