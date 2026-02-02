# How to Use Protocol Classes for Type Safety in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Type Safety, Protocols, typing, Static Analysis

Description: Learn how to use Python's Protocol classes for structural subtyping, enabling duck typing with static type checking for more robust and maintainable code.

---

> Python's duck typing philosophy - "if it walks like a duck and quacks like a duck, it's a duck" - is powerful but can lead to runtime errors that are hard to track down. Protocol classes let you keep the flexibility of duck typing while adding static type checking that catches bugs before your code runs.

Introduced in Python 3.8 through PEP 544, Protocol classes enable structural subtyping. Unlike traditional inheritance where you explicitly declare relationships, Protocols define interfaces implicitly - any class that implements the required methods is automatically compatible, no inheritance needed.

---

## Protocol Basics

Let's start with a simple example. Say you want to write a function that works with anything that has a `read()` method:

```python
# protocols_basics.py
from typing import Protocol

# Define a Protocol that specifies the interface we expect
class Readable(Protocol):
    def read(self) -> str:
        """Any object with a read() method returning str satisfies this Protocol"""
        ...

# This function accepts anything that matches the Readable Protocol
def process_content(source: Readable) -> str:
    """Read and process content from any readable source"""
    content = source.read()
    return content.upper()

# A file-like class - no inheritance from Readable needed
class FileReader:
    def __init__(self, path: str):
        self.path = path

    def read(self) -> str:
        with open(self.path) as f:
            return f.read()

# A string wrapper - also satisfies Readable without inheriting
class StringReader:
    def __init__(self, data: str):
        self.data = data

    def read(self) -> str:
        return self.data

# Both work with process_content because they have matching read() methods
file_reader = FileReader("config.txt")
string_reader = StringReader("Hello, Protocol!")

# Type checkers (mypy, pyright) verify these calls are valid
result1 = process_content(file_reader)   # Works - FileReader has read() -> str
result2 = process_content(string_reader) # Works - StringReader has read() -> str
```

The key insight here is that `FileReader` and `StringReader` never mention `Readable` in their definitions. They're compatible simply because they have the right method signature. This is structural subtyping in action.

---

## Runtime Checkable Protocols

By default, Protocols are only checked by static type checkers. If you want to use `isinstance()` checks at runtime, you need to add the `@runtime_checkable` decorator:

```python
# runtime_protocols.py
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closeable(Protocol):
    """Protocol for objects that can be closed"""
    def close(self) -> None:
        ...

class DatabaseConnection:
    def __init__(self, url: str):
        self.url = url
        self.connected = True

    def close(self) -> None:
        self.connected = False
        print(f"Closed connection to {self.url}")

class NetworkSocket:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.open = True

    def close(self) -> None:
        self.open = False
        print(f"Closed socket {self.host}:{self.port}")

# Runtime isinstance checks work with @runtime_checkable
def cleanup(resource):
    """Safely close any Closeable resource"""
    if isinstance(resource, Closeable):
        resource.close()
        return True
    return False

# Both pass the isinstance check
db = DatabaseConnection("postgres://localhost/mydb")
sock = NetworkSocket("api.example.com", 443)

cleanup(db)    # Output: Closed connection to postgres://localhost/mydb
cleanup(sock)  # Output: Closed socket api.example.com:443
cleanup("not closeable")  # Returns False, no error
```

**Important caveat**: Runtime Protocol checks only verify method existence, not signatures. The type checker does full signature validation, but `isinstance()` just looks for attribute names.

---

## Combining Protocols

You can compose complex interfaces by inheriting from multiple Protocols:

```python
# composed_protocols.py
from typing import Protocol

class Readable(Protocol):
    def read(self) -> str:
        ...

class Writable(Protocol):
    def write(self, data: str) -> None:
        ...

class Seekable(Protocol):
    def seek(self, position: int) -> None:
        ...

# Combine Protocols through inheritance
class ReadWriteSeekable(Readable, Writable, Seekable, Protocol):
    """Interface for fully-featured file-like objects"""
    pass

class InMemoryFile:
    """A simple in-memory file that implements all three interfaces"""
    def __init__(self):
        self.buffer = ""
        self.position = 0

    def read(self) -> str:
        return self.buffer[self.position:]

    def write(self, data: str) -> None:
        self.buffer = self.buffer[:self.position] + data
        self.position += len(data)

    def seek(self, position: int) -> None:
        self.position = max(0, min(position, len(self.buffer)))

def copy_with_rewind(source: ReadWriteSeekable, dest: Writable) -> None:
    """Copy from source to dest, then rewind source to start"""
    content = source.read()
    dest.write(content)
    source.seek(0)

mem_file = InMemoryFile()
mem_file.write("Hello, Protocols!")
mem_file.seek(0)

output = InMemoryFile()
copy_with_rewind(mem_file, output)
```

---

## Protocol vs ABC: When to Use Which

| Aspect | Protocol | ABC (Abstract Base Class) |
|--------|----------|---------------------------|
| Relationship | Implicit (structural) | Explicit (nominal) |
| Inheritance Required | No | Yes |
| Third-party Classes | Works automatically | Requires registration |
| Runtime Checks | Opt-in with decorator | Built-in |
| Best For | Duck typing with types | Enforcing contracts |

Use **Protocol** when:
- You want to type-hint existing code without modifying it
- Working with third-party classes you can't change
- You prefer composition over inheritance
- The interface is simple and implementation-agnostic

Use **ABC** when:
- You need to enforce that subclasses implement methods
- You want to provide default implementations
- The relationship between types is inherently hierarchical
- You need reliable runtime checks with full signature validation

---

## Practical Use Case: Repository Pattern

Here's a real-world example using Protocols for a repository abstraction:

```python
# repository_pattern.py
from typing import Protocol, TypeVar, Generic, Optional
from dataclasses import dataclass

# Generic type for entities
T = TypeVar('T')

@dataclass
class User:
    id: int
    email: str
    name: str

# Define the repository interface as a Protocol
class Repository(Protocol[T]):
    """Generic repository interface for CRUD operations"""

    def get(self, id: int) -> Optional[T]:
        """Retrieve entity by ID"""
        ...

    def save(self, entity: T) -> T:
        """Save entity and return it with any updates (like generated ID)"""
        ...

    def delete(self, id: int) -> bool:
        """Delete entity by ID, return True if deleted"""
        ...

# PostgreSQL implementation - no inheritance declaration needed
class PostgresUserRepository:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    def get(self, id: int) -> Optional[User]:
        # Real implementation would query database
        print(f"Postgres: SELECT * FROM users WHERE id = {id}")
        return User(id=id, email="user@example.com", name="John")

    def save(self, entity: User) -> User:
        print(f"Postgres: INSERT/UPDATE users SET email='{entity.email}'")
        return entity

    def delete(self, id: int) -> bool:
        print(f"Postgres: DELETE FROM users WHERE id = {id}")
        return True

# In-memory implementation for testing
class InMemoryUserRepository:
    def __init__(self):
        self.store: dict[int, User] = {}
        self.next_id = 1

    def get(self, id: int) -> Optional[User]:
        return self.store.get(id)

    def save(self, entity: User) -> User:
        if entity.id == 0:
            entity.id = self.next_id
            self.next_id += 1
        self.store[entity.id] = entity
        return entity

    def delete(self, id: int) -> bool:
        if id in self.store:
            del self.store[id]
            return True
        return False

# Service that depends on the Protocol, not concrete implementations
class UserService:
    def __init__(self, repo: Repository[User]):
        self.repo = repo

    def register_user(self, email: str, name: str) -> User:
        user = User(id=0, email=email, name=name)
        return self.repo.save(user)

# Easy to swap implementations
prod_repo = PostgresUserRepository("postgres://localhost/prod")
test_repo = InMemoryUserRepository()

prod_service = UserService(prod_repo)  # Type checker validates compatibility
test_service = UserService(test_repo)  # Both implementations work

new_user = test_service.register_user("alice@test.com", "Alice")
print(f"Created user with ID: {new_user.id}")
```

This pattern makes testing trivial - swap the production database repository for an in-memory one without changing any service code.

---

## Key Takeaways

1. **Protocols enable duck typing with type safety** - get the best of both worlds
2. **No inheritance required** - existing classes automatically satisfy Protocols if they have matching methods
3. **Use `@runtime_checkable`** for isinstance checks, but remember it only validates attribute existence
4. **Combine Protocols** through inheritance to build complex interfaces from simple ones
5. **Prefer Protocols over ABCs** when you want flexibility and don't control all the classes involved

Protocol classes are one of Python's most powerful typing features. They let you write generic, reusable code that works with any object having the right shape, while still catching type errors before runtime. Start using them in your projects - your future self debugging production issues will thank you.
