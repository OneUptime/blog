# How to Use Type Hints in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Type Hints, Type Annotations, Static Typing, Code Quality

Description: Learn Python type hints for better code documentation, IDE support, and error catching. Covers basic types, generics, and integration with mypy.

---

> Type hints make Python code more readable and catch bugs before runtime. While Python remains dynamically typed, type hints provide documentation, enable better IDE support, and allow static analysis tools to find errors early.

Type hints were introduced in Python 3.5 and have evolved significantly. They do not affect runtime behavior but provide valuable information for developers and tools. This guide covers practical type hint usage from basics to advanced patterns.

---

## Basic Type Hints

### Variable Annotations

```python
# Basic types
name: str = "Alice"
age: int = 30
height: float = 5.9
is_active: bool = True

# Without initial value
email: str  # Declares type, assigned later
```

### Function Annotations

```python
def greet(name: str) -> str:
    """Greet a person by name."""
    return f"Hello, {name}!"

def calculate_area(length: float, width: float) -> float:
    """Calculate rectangle area."""
    return length * width

def process_data(data: list) -> None:
    """Process data without returning anything."""
    for item in data:
        print(item)
```

### Type Hints Do Not Enforce Types

```python
def add(a: int, b: int) -> int:
    return a + b

# This works at runtime (but mypy would flag it)
result = add("hello", "world")  # Returns "helloworld"
```

---

## Common Types

### Collections from typing Module

```python
from typing import List, Dict, Set, Tuple, Optional

# Lists with element type
def process_names(names: List[str]) -> List[str]:
    return [name.upper() for name in names]

# Dictionaries with key and value types
def count_words(text: str) -> Dict[str, int]:
    words = text.split()
    return {word: words.count(word) for word in set(words)}

# Sets
def unique_items(items: List[int]) -> Set[int]:
    return set(items)

# Tuples (fixed length and types)
def get_coordinates() -> Tuple[float, float]:
    return (42.0, -71.0)

# Tuple with variable length (same type)
def get_scores() -> Tuple[int, ...]:
    return (95, 87, 92, 88)
```

### Python 3.9+ Built-in Generic Syntax

```python
# Python 3.9+ allows using built-in types directly
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# No need to import from typing for basic types
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 95, "Bob": 87}
```

### Optional and Union

```python
from typing import Optional, Union

# Optional means the value can be None
def find_user(user_id: int) -> Optional[str]:
    users = {1: "Alice", 2: "Bob"}
    return users.get(user_id)  # Returns str or None

# Union allows multiple types
def process_id(id: Union[int, str]) -> str:
    return str(id)

# Python 3.10+ union syntax
def process_id_new(id: int | str) -> str:
    return str(id)

# Optional is equivalent to Union with None
# Optional[str] == Union[str, None] == str | None
```

---

## Advanced Type Hints

### Callable Types

```python
from typing import Callable

# Function that takes specific arguments
def apply_operation(
    x: int,
    y: int,
    operation: Callable[[int, int], int]
) -> int:
    return operation(x, y)

# Usage
result = apply_operation(5, 3, lambda a, b: a + b)

# More complex callable
Handler = Callable[[str, Dict[str, Any]], bool]

def register_handler(event: str, handler: Handler) -> None:
    pass
```

### TypeVar for Generics

```python
from typing import TypeVar, List

# Generic type variable
T = TypeVar('T')

def first_item(items: List[T]) -> T:
    """Return first item, maintaining type."""
    return items[0]

# Usage preserves type
names: List[str] = ["Alice", "Bob"]
first: str = first_item(names)  # Type is str

numbers: List[int] = [1, 2, 3]
first_num: int = first_item(numbers)  # Type is int

# Bounded TypeVar
Number = TypeVar('Number', int, float)

def add_numbers(a: Number, b: Number) -> Number:
    return a + b
```

### Generic Classes

```python
from typing import Generic, TypeVar

T = TypeVar('T')

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

# Usage with type inference
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
value: int = int_stack.pop()

str_stack: Stack[str] = Stack()
str_stack.push("hello")
```

### TypedDict for Structured Dictionaries

```python
from typing import TypedDict

class UserDict(TypedDict):
    name: str
    age: int
    email: str

def create_user(data: UserDict) -> None:
    print(f"Creating user: {data['name']}")

# Type checker knows the structure
user: UserDict = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com"
}
create_user(user)

# Optional fields with total=False
class PartialUser(TypedDict, total=False):
    name: str
    age: int
    nickname: str  # Optional
```

### Literal Types

```python
from typing import Literal

def set_status(status: Literal["active", "inactive", "pending"]) -> None:
    print(f"Status set to: {status}")

set_status("active")   # OK
set_status("invalid")  # Type error!

# Combining with Union
Mode = Literal["read", "write", "append"]

def open_file(path: str, mode: Mode) -> None:
    pass
```

### Protocol (Structural Subtyping)

```python
from typing import Protocol

class Drawable(Protocol):
    """Any object with a draw method."""

    def draw(self) -> None:
        ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

def render(shape: Drawable) -> None:
    """Works with any object that has a draw method."""
    shape.draw()

# Both work because they have draw()
render(Circle())
render(Square())
```

---

## Type Aliases

```python
from typing import Dict, List, Tuple, Union

# Simple aliases
UserId = int
Username = str

# Complex aliases
UserData = Dict[str, Union[str, int, bool]]
Coordinate = Tuple[float, float]
Matrix = List[List[float]]

def get_user(user_id: UserId) -> UserData:
    return {"name": "Alice", "age": 30, "active": True}

def calculate_distance(p1: Coordinate, p2: Coordinate) -> float:
    return ((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)**0.5

# Python 3.10+ TypeAlias
from typing import TypeAlias

Vector: TypeAlias = List[float]
```

---

## Function Overloading

```python
from typing import overload, Union

@overload
def process(value: str) -> str: ...

@overload
def process(value: int) -> int: ...

@overload
def process(value: list) -> list: ...

def process(value: Union[str, int, list]) -> Union[str, int, list]:
    """Process different types appropriately."""
    if isinstance(value, str):
        return value.upper()
    elif isinstance(value, int):
        return value * 2
    else:
        return [x * 2 for x in value]

# Type checker knows the return type
s: str = process("hello")  # str
n: int = process(5)        # int
l: list = process([1, 2])  # list
```

---

## Using mypy for Static Type Checking

### Installation and Basic Usage

```bash
# Install mypy
pip install mypy

# Check a file
mypy script.py

# Check a directory
mypy src/

# Strict mode
mypy --strict script.py
```

### Configuration in mypy.ini

```ini
[mypy]
python_version = 3.10
warn_return_any = True
warn_unused_ignores = True
disallow_untyped_defs = True

# Per-module settings
[mypy-tests.*]
disallow_untyped_defs = False

[mypy-third_party_lib.*]
ignore_missing_imports = True
```

### Common mypy Errors and Fixes

```python
# Error: Incompatible return value type
def get_name() -> str:
    return None  # Error!

# Fix: Use Optional
from typing import Optional

def get_name() -> Optional[str]:
    return None  # OK

# Error: Need type annotation
def process(data):  # Error with --disallow-untyped-defs
    pass

# Fix: Add annotations
def process(data: list) -> None:
    pass

# Ignore specific lines
result = unsafe_function()  # type: ignore
```

---

## Practical Examples

### API Response Types

```python
from typing import TypedDict, List, Optional

class Address(TypedDict):
    street: str
    city: str
    country: str
    postal_code: Optional[str]

class User(TypedDict):
    id: int
    name: str
    email: str
    address: Address
    tags: List[str]

class APIResponse(TypedDict):
    data: User
    success: bool
    error: Optional[str]

def parse_response(response: dict) -> APIResponse:
    # Type checker ensures we return correct structure
    return {
        "data": response["user"],
        "success": True,
        "error": None
    }
```

### Configuration with Dataclasses

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class DatabaseConfig:
    host: str
    port: int
    database: str
    username: Optional[str] = None
    password: Optional[str] = None

@dataclass
class AppConfig:
    debug: bool
    database: DatabaseConfig
    allowed_hosts: List[str]

# Type-safe configuration
config = AppConfig(
    debug=True,
    database=DatabaseConfig(
        host="localhost",
        port=5432,
        database="myapp"
    ),
    allowed_hosts=["localhost", "example.com"]
)
```

### Decorator Types

```python
from typing import TypeVar, Callable, Any
from functools import wraps

F = TypeVar('F', bound=Callable[..., Any])

def log_calls(func: F) -> F:
    """Decorator that logs function calls."""
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper  # type: ignore

@log_calls
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

---

## Best Practices

### 1. Start Gradually

```python
# Start with function signatures
def process_data(data: List[Dict[str, Any]]) -> List[str]:
    pass

# Add variable annotations where helpful
result: List[str] = []
```

### 2. Use Type Aliases for Readability

```python
# Instead of
def process(data: Dict[str, List[Tuple[int, str]]]) -> None:
    pass

# Use aliases
Record = Tuple[int, str]
DataStore = Dict[str, List[Record]]

def process(data: DataStore) -> None:
    pass
```

### 3. Prefer Protocols Over ABCs for Duck Typing

```python
from typing import Protocol

class Closeable(Protocol):
    def close(self) -> None: ...

def cleanup(resource: Closeable) -> None:
    resource.close()
```

### 4. Document Complex Types

```python
from typing import Dict, List, TypedDict

class UserProfile(TypedDict):
    """
    User profile data structure.

    Attributes:
        name: User's display name
        email: Primary email address
        roles: List of assigned role names
    """
    name: str
    email: str
    roles: List[str]
```

---

## Summary

Type hints provide:
- Better documentation
- IDE autocompletion and error detection
- Static analysis with mypy
- Clearer function contracts

Key types:
- Basic: `int`, `str`, `float`, `bool`, `None`
- Collections: `list[T]`, `dict[K, V]`, `set[T]`, `tuple[T, ...]`
- Optional: `Optional[T]` or `T | None`
- Callable: `Callable[[Args], Return]`
- Generic: `TypeVar`, `Generic[T]`

Type hints are optional but valuable. Start with function signatures and gradually add more as your project grows.
