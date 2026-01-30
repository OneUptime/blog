# How to Build Generic Types with TypeVar in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Type Hints, Generics, Static Analysis

Description: Create flexible, type-safe generic functions and classes in Python using TypeVar, Generic, and ParamSpec for better IDE support and static analysis.

---

Python's type system has evolved significantly since PEP 484 introduced type hints. One of the most powerful features for writing reusable, type-safe code is generics through `TypeVar`. This guide walks through everything you need to know to build generic types in Python.

## Why Generics Matter

Consider a simple function that returns the first element of a list:

```python
def first(items: list) -> object:
    return items[0]

result = first([1, 2, 3])
# result is typed as 'object', not 'int'
```

The problem here is that we lose type information. The caller knows they passed a list of integers, but the return type is just `object`. Generics solve this by preserving type relationships.

## TypeVar Basics

`TypeVar` creates a type variable that represents "some type" which gets determined at usage time.

```python
from typing import TypeVar, List

# Define a type variable named 'T'
T = TypeVar('T')

def first(items: List[T]) -> T:
    """Return the first element of a list, preserving the element type."""
    return items[0]

# Now the type checker knows:
numbers = first([1, 2, 3])       # int
strings = first(["a", "b", "c"]) # str
```

The type variable `T` acts as a placeholder. When you call `first([1, 2, 3])`, the type checker substitutes `T` with `int` throughout the function signature.

### Naming Conventions for TypeVars

The Python community follows these conventions:

| TypeVar Name | Usage |
|-------------|-------|
| `T` | General purpose single type |
| `T_co` | Covariant type (output positions) |
| `T_contra` | Contravariant type (input positions) |
| `K, V` | Key and value types for mappings |
| `T1, T2, T3` | Multiple unrelated type variables |
| `AnyStr` | Built-in for `str` or `bytes` |

### Multiple Type Variables

You can use multiple type variables when types need to vary independently:

```python
from typing import TypeVar, Tuple

K = TypeVar('K')
V = TypeVar('V')

def swap(pair: Tuple[K, V]) -> Tuple[V, K]:
    """Swap the elements of a tuple, preserving individual types."""
    return (pair[1], pair[0])

# Type checker tracks both types through the transformation
result = swap(("hello", 42))  # Tuple[int, str]
```

## Bound Constraints

Sometimes you need a type variable that only accepts certain types. The `bound` parameter restricts the type variable to a specific type or its subclasses.

```python
from typing import TypeVar

# T must be a subclass of (or exactly) 'Comparable'
class Comparable:
    def __lt__(self, other: 'Comparable') -> bool:
        raise NotImplementedError

T = TypeVar('T', bound=Comparable)

def min_value(a: T, b: T) -> T:
    """Return the smaller of two comparable values."""
    return a if a < b else b
```

A more practical example with numbers:

```python
from typing import TypeVar
from numbers import Number

NumericT = TypeVar('NumericT', bound=Number)

def safe_divide(a: NumericT, b: NumericT, default: NumericT) -> NumericT:
    """Divide a by b, returning default if b is zero."""
    if b == 0:
        return default
    return a / b  # type: ignore (division result type)
```

### Constrained Type Variables

For a type variable that can only be one of a specific set of types (not their subclasses), pass the types directly:

```python
from typing import TypeVar

# StringOrBytes can ONLY be str or bytes, nothing else
StringOrBytes = TypeVar('StringOrBytes', str, bytes)

def concat(a: StringOrBytes, b: StringOrBytes) -> StringOrBytes:
    """Concatenate two strings or two byte sequences."""
    return a + b

# Valid calls
concat("hello", " world")  # str
concat(b"hello", b" world")  # bytes

# Invalid - mixing types
# concat("hello", b" world")  # Type error!
```

The difference between `bound` and constraints:

| Feature | `bound=BaseType` | `TypeVar('T', Type1, Type2)` |
|---------|------------------|------------------------------|
| Accepts subclasses | Yes | No |
| Number of allowed types | Unlimited (any subclass) | Fixed set only |
| Use case | Polymorphism with inheritance | Union-like but consistent |

## Variance: Covariant and Contravariant

Variance describes how type relationships work with generics. This matters when you have container types or callbacks.

### Invariance (Default)

By default, type variables are invariant. A `List[Dog]` is NOT a subtype of `List[Animal]`, even if `Dog` is a subtype of `Animal`.

```python
from typing import List

class Animal:
    pass

class Dog(Animal):
    def bark(self) -> str:
        return "woof"

def process_animals(animals: List[Animal]) -> None:
    animals.append(Animal())  # This is why invariance matters

dogs: List[Dog] = [Dog()]
# process_animals(dogs)  # Type error! Would allow adding non-Dog Animals
```

### Covariance (Output Positions)

Covariant type variables work for read-only containers where you only get values out:

```python
from typing import TypeVar, Generic, Iterator

T_co = TypeVar('T_co', covariant=True)

class ImmutableList(Generic[T_co]):
    """A read-only list that supports covariance."""

    def __init__(self, items: list[T_co]) -> None:
        self._items = tuple(items)  # Store as tuple for immutability

    def __getitem__(self, index: int) -> T_co:
        return self._items[index]

    def __iter__(self) -> Iterator[T_co]:
        return iter(self._items)

    def __len__(self) -> int:
        return len(self._items)

# With covariance, ImmutableList[Dog] IS a subtype of ImmutableList[Animal]
def count_animals(animals: ImmutableList[Animal]) -> int:
    return len(animals)

dogs = ImmutableList([Dog(), Dog()])
count = count_animals(dogs)  # This works!
```

### Contravariance (Input Positions)

Contravariant type variables work for callback or consumer types where you only put values in:

```python
from typing import TypeVar, Generic, Callable

T_contra = TypeVar('T_contra', contravariant=True)

class Handler(Generic[T_contra]):
    """A handler that processes items of a specific type."""

    def __init__(self, callback: Callable[[T_contra], None]) -> None:
        self._callback = callback

    def handle(self, item: T_contra) -> None:
        self._callback(item)

# A Handler[Animal] can be used where Handler[Dog] is expected
# because if something can handle any Animal, it can handle Dogs

def process_dog_with_handler(handler: Handler[Dog]) -> None:
    handler.handle(Dog())

animal_handler: Handler[Animal] = Handler(lambda a: print(f"Got {type(a)}"))
process_dog_with_handler(animal_handler)  # This works!
```

Quick reference for variance:

| Variance | Keyword | Direction | Example |
|----------|---------|-----------|---------|
| Invariant | (default) | Neither | Mutable containers |
| Covariant | `covariant=True` | Output only | Iterators, read-only views |
| Contravariant | `contravariant=True` | Input only | Callbacks, sinks |

## The Generic Base Class

To create generic classes, inherit from `Generic` with your type variables:

```python
from typing import TypeVar, Generic, Optional

T = TypeVar('T')

class Stack(Generic[T]):
    """A type-safe stack implementation."""

    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        """Add an item to the top of the stack."""
        self._items.append(item)

    def pop(self) -> T:
        """Remove and return the top item."""
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self) -> Optional[T]:
        """Return the top item without removing it."""
        if not self._items:
            return None
        return self._items[-1]

    def is_empty(self) -> bool:
        """Check if the stack is empty."""
        return len(self._items) == 0

# Usage with type inference
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
value = int_stack.pop()  # Typed as 'int'

str_stack: Stack[str] = Stack()
str_stack.push("hello")
# str_stack.push(42)  # Type error!
```

### Multiple Type Parameters

Classes can have multiple type parameters:

```python
from typing import TypeVar, Generic, Optional

K = TypeVar('K')
V = TypeVar('V')

class Pair(Generic[K, V]):
    """An immutable pair of two values with different types."""

    def __init__(self, first: K, second: V) -> None:
        self._first = first
        self._second = second

    @property
    def first(self) -> K:
        return self._first

    @property
    def second(self) -> V:
        return self._second

    def swap(self) -> 'Pair[V, K]':
        """Return a new pair with swapped elements."""
        return Pair(self._second, self._first)

    def map_first(self, func: 'Callable[[K], K]') -> 'Pair[K, V]':
        """Apply a function to the first element."""
        return Pair(func(self._first), self._second)

from typing import Callable

pair: Pair[str, int] = Pair("age", 30)
print(pair.first)   # "age" (str)
print(pair.second)  # 30 (int)

swapped = pair.swap()  # Pair[int, str]
```

## ParamSpec for Decorator Types

Python 3.10 introduced `ParamSpec` for preserving function signatures in decorators. This was a game changer for writing properly typed decorators.

```python
from typing import TypeVar, Callable, ParamSpec
from functools import wraps
import time

P = ParamSpec('P')
R = TypeVar('R')

def timing_decorator(func: Callable[P, R]) -> Callable[P, R]:
    """Measure and print execution time of a function."""
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f} seconds")
        return result
    return wrapper

@timing_decorator
def calculate_sum(numbers: list[int], multiplier: int = 1) -> int:
    """Sum numbers with an optional multiplier."""
    return sum(numbers) * multiplier

# The decorated function preserves its original signature
result = calculate_sum([1, 2, 3, 4, 5], multiplier=2)  # Fully typed!
```

### Combining ParamSpec with Additional Arguments

For decorators that add parameters:

```python
from typing import TypeVar, Callable, ParamSpec, Concatenate
from functools import wraps

P = ParamSpec('P')
R = TypeVar('R')

def with_logging(
    logger_name: str
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Decorator factory that adds logging to a function."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            print(f"[{logger_name}] Calling {func.__name__}")
            try:
                result = func(*args, **kwargs)
                print(f"[{logger_name}] {func.__name__} returned successfully")
                return result
            except Exception as e:
                print(f"[{logger_name}] {func.__name__} raised {type(e).__name__}")
                raise
        return wrapper
    return decorator

@with_logging("UserService")
def create_user(name: str, email: str) -> dict[str, str]:
    """Create a new user."""
    return {"name": name, "email": email}

user = create_user("Alice", "alice@example.com")
```

### Using Concatenate for Prepended Arguments

When a decorator modifies the function signature:

```python
from typing import TypeVar, Callable, ParamSpec, Concatenate
from functools import wraps

P = ParamSpec('P')
R = TypeVar('R')

class DatabaseConnection:
    """Simulated database connection."""
    def execute(self, query: str) -> list[dict]:
        return [{"result": "data"}]

def with_db_connection(
    func: Callable[Concatenate[DatabaseConnection, P], R]
) -> Callable[P, R]:
    """Inject a database connection as the first argument."""
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        conn = DatabaseConnection()
        return func(conn, *args, **kwargs)
    return wrapper

@with_db_connection
def fetch_users(conn: DatabaseConnection, limit: int = 10) -> list[dict]:
    """Fetch users from the database."""
    return conn.execute(f"SELECT * FROM users LIMIT {limit}")

# Caller doesn't need to provide the connection
users = fetch_users(limit=5)  # Type-safe, no connection argument needed
```

## Practical Example: Repository Pattern

The repository pattern is a perfect use case for generics. Here's a complete implementation:

```python
from typing import TypeVar, Generic, Optional, Protocol, runtime_checkable
from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID, uuid4

# Define what entities must look like
@runtime_checkable
class Entity(Protocol):
    """Protocol for all database entities."""
    id: UUID

T = TypeVar('T', bound=Entity)

class Repository(ABC, Generic[T]):
    """Abstract base repository with common CRUD operations."""

    @abstractmethod
    def find_by_id(self, entity_id: UUID) -> Optional[T]:
        """Find an entity by its ID."""
        pass

    @abstractmethod
    def find_all(self) -> list[T]:
        """Return all entities."""
        pass

    @abstractmethod
    def save(self, entity: T) -> T:
        """Save an entity (insert or update)."""
        pass

    @abstractmethod
    def delete(self, entity_id: UUID) -> bool:
        """Delete an entity by ID. Returns True if deleted."""
        pass

class InMemoryRepository(Repository[T]):
    """In-memory implementation for testing."""

    def __init__(self) -> None:
        self._storage: dict[UUID, T] = {}

    def find_by_id(self, entity_id: UUID) -> Optional[T]:
        return self._storage.get(entity_id)

    def find_all(self) -> list[T]:
        return list(self._storage.values())

    def save(self, entity: T) -> T:
        self._storage[entity.id] = entity
        return entity

    def delete(self, entity_id: UUID) -> bool:
        if entity_id in self._storage:
            del self._storage[entity_id]
            return True
        return False

# Concrete entity and repository
@dataclass
class User:
    id: UUID
    name: str
    email: str

    @classmethod
    def create(cls, name: str, email: str) -> 'User':
        return cls(id=uuid4(), name=name, email=email)

class UserRepository(InMemoryRepository[User]):
    """User-specific repository with additional methods."""

    def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by email address."""
        for user in self._storage.values():
            if user.email == email:
                return user
        return None

    def find_by_name_prefix(self, prefix: str) -> list[User]:
        """Find all users whose name starts with the given prefix."""
        return [
            user for user in self._storage.values()
            if user.name.startswith(prefix)
        ]

# Usage
repo = UserRepository()
alice = repo.save(User.create("Alice", "alice@example.com"))
bob = repo.save(User.create("Bob", "bob@example.com"))

found = repo.find_by_email("alice@example.com")
if found:
    print(f"Found: {found.name}")  # found is typed as User
```

## Practical Example: Result Types

Result types (also known as Either types) are great for error handling without exceptions:

```python
from typing import TypeVar, Generic, Union, Callable, NoReturn
from dataclasses import dataclass

T = TypeVar('T')
E = TypeVar('E')
U = TypeVar('U')

@dataclass(frozen=True)
class Ok(Generic[T]):
    """Represents a successful result."""
    value: T

    def is_ok(self) -> bool:
        return True

    def is_err(self) -> bool:
        return False

@dataclass(frozen=True)
class Err(Generic[E]):
    """Represents a failed result."""
    error: E

    def is_ok(self) -> bool:
        return False

    def is_err(self) -> bool:
        return True

# Result is either Ok[T] or Err[E]
Result = Union[Ok[T], Err[E]]

class ResultOps(Generic[T, E]):
    """Operations on Result types using class methods."""

    @staticmethod
    def map(result: Result[T, E], func: Callable[[T], U]) -> Result[U, E]:
        """Apply a function to the success value, if present."""
        if isinstance(result, Ok):
            return Ok(func(result.value))
        return result  # type: ignore

    @staticmethod
    def map_err(result: Result[T, E], func: Callable[[E], U]) -> Result[T, U]:
        """Apply a function to the error value, if present."""
        if isinstance(result, Err):
            return Err(func(result.error))
        return result  # type: ignore

    @staticmethod
    def and_then(
        result: Result[T, E],
        func: Callable[[T], Result[U, E]]
    ) -> Result[U, E]:
        """Chain operations that might fail."""
        if isinstance(result, Ok):
            return func(result.value)
        return result  # type: ignore

    @staticmethod
    def unwrap_or(result: Result[T, E], default: T) -> T:
        """Get the value or return a default."""
        if isinstance(result, Ok):
            return result.value
        return default

# Example usage with validation
@dataclass
class ValidationError:
    field: str
    message: str

def parse_age(value: str) -> Result[int, ValidationError]:
    """Parse a string as an age value."""
    try:
        age = int(value)
        if age < 0:
            return Err(ValidationError("age", "Age cannot be negative"))
        if age > 150:
            return Err(ValidationError("age", "Age seems unrealistic"))
        return Ok(age)
    except ValueError:
        return Err(ValidationError("age", f"'{value}' is not a valid number"))

def parse_email(value: str) -> Result[str, ValidationError]:
    """Validate an email address (simplified)."""
    if "@" not in value:
        return Err(ValidationError("email", "Invalid email format"))
    return Ok(value.lower().strip())

# Chaining validations
def validate_user_input(
    age_str: str,
    email: str
) -> Result[tuple[int, str], ValidationError]:
    """Validate multiple fields, failing on first error."""
    age_result = parse_age(age_str)
    if isinstance(age_result, Err):
        return age_result

    email_result = parse_email(email)
    if isinstance(email_result, Err):
        return email_result

    return Ok((age_result.value, email_result.value))

# Test it out
result = validate_user_input("25", "user@example.com")
if isinstance(result, Ok):
    age, email = result.value
    print(f"Valid: age={age}, email={email}")
else:
    print(f"Error in {result.error.field}: {result.error.message}")
```

## Mypy Validation

Always validate your generic types with mypy. Here's a configuration and examples:

### mypy.ini Configuration

```ini
[mypy]
python_version = 3.11
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
```

### Common Mypy Errors with Generics

Here are typical errors and how to fix them:

```python
from typing import TypeVar, Generic, List

T = TypeVar('T')

# Error: Type variable "T" is unbound
# def bad_function() -> T:  # Wrong!
#     pass

# Fix: T must appear in arguments to be bound
def good_function(items: List[T]) -> T:
    return items[0]

# Error: Incompatible return value type
class Container(Generic[T]):
    def __init__(self, value: T) -> None:
        self._value = value

    # def get(self) -> str:  # Wrong if T is not str!
    #     return self._value

    # Fix: Return type must match type variable
    def get(self) -> T:
        return self._value

# Error: Cannot use a covariant type variable in argument position
T_co = TypeVar('T_co', covariant=True)

class ReadOnlyBox(Generic[T_co]):
    def __init__(self, value: T_co) -> None:  # This is fine (constructor)
        self._value = value

    def get(self) -> T_co:
        return self._value

    # def set(self, value: T_co) -> None:  # Error! Can't use T_co here
    #     self._value = value
```

### Running Mypy Checks

```bash
# Check a single file
mypy your_module.py

# Check with verbose output
mypy --verbose your_module.py

# Show error codes for easier fixing
mypy --show-error-codes your_module.py

# Generate a report
mypy --html-report ./mypy-report your_module.py
```

### Type Narrowing with Generics

Mypy understands type narrowing in generic contexts:

```python
from typing import TypeVar, Optional, Union

T = TypeVar('T')

def process_optional(value: Optional[T]) -> T:
    """Process an optional value, raising if None."""
    if value is None:
        raise ValueError("Value cannot be None")
    # Mypy knows value is T here, not Optional[T]
    return value

def process_union(value: Union[str, int]) -> str:
    """Convert a union type to string."""
    if isinstance(value, str):
        # Mypy knows value is str here
        return value.upper()
    else:
        # Mypy knows value is int here
        return str(value)
```

## Python 3.12+ Syntax Improvements

Python 3.12 introduced a cleaner syntax for generics:

```python
# Python 3.11 and earlier
from typing import TypeVar, Generic

T = TypeVar('T')

class OldStack(Generic[T]):
    def push(self, item: T) -> None:
        pass

def old_first[T](items: list[T]) -> T:
    ...

# Python 3.12+ - cleaner syntax
class NewStack[T]:
    """No need to inherit from Generic or define TypeVar separately."""

    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

def new_first[T](items: list[T]) -> T:
    """Generic function with inline type parameter."""
    return items[0]

# Bounded types in the new syntax
class NumberContainer[T: (int, float)]:
    """T is constrained to int or float."""

    def __init__(self, value: T) -> None:
        self.value = value

    def doubled(self) -> T:
        return self.value * 2  # type: ignore
```

## Best Practices Summary

1. **Start Simple**: Only use generics when you need type relationships. A simple function doesn't need TypeVar.

2. **Name TypeVars Clearly**: Use `T` for general types, descriptive names like `EntityT` for domain-specific variables.

3. **Prefer Bound Over Constraints**: Use `bound=SomeClass` when you need polymorphism with inheritance. Use constraints (`TypeVar('T', str, bytes)`) only when you need exactly those types.

4. **Understand Variance**: Default (invariant) is usually correct. Use covariance for read-only types, contravariance for write-only types.

5. **Test with Mypy**: Run mypy in strict mode during development to catch type errors early.

6. **Document Generic Classes**: Explain what the type parameters represent in docstrings.

```python
from typing import TypeVar, Generic

K = TypeVar('K')
V = TypeVar('V')

class Cache(Generic[K, V]):
    """
    A simple cache with typed keys and values.

    Type Parameters:
        K: The type of cache keys (must be hashable)
        V: The type of cached values

    Example:
        cache: Cache[str, User] = Cache(max_size=100)
        cache.set("user:123", user)
    """
    pass
```

## Conclusion

Generics with TypeVar give you the tools to write reusable, type-safe code in Python. The key points to remember:

- TypeVar creates placeholder types that get filled in at usage time
- Use `bound` for inheritance hierarchies, constraints for specific type sets
- Covariant types work for outputs, contravariant for inputs
- ParamSpec preserves function signatures in decorators
- Always validate your generics with mypy

Start with simple use cases like generic containers and result types. As you get comfortable, you can build more sophisticated patterns like the repository pattern or typed decorators. The type checker will guide you when you make mistakes, making generics one of the safest features to experiment with.
