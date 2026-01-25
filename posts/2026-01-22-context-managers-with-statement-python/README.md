# How to Use Context Managers (with statement) in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Context Managers, with Statement, Resource Management, Best Practices

Description: Master Python context managers for safe resource handling. Learn to use the with statement, create custom context managers, and avoid resource leaks.

---

> Context managers ensure resources are properly cleaned up, even when errors occur. Whether you are working with files, database connections, or locks, the with statement provides a clean and reliable way to manage resources.

Python's context managers handle setup and teardown automatically. They are the foundation of the `with` statement and are essential for writing robust code that does not leak resources.

---

## Basic Usage

### File Handling

```python
# Without context manager - error prone
f = open('data.txt', 'r')
try:
    content = f.read()
finally:
    f.close()  # Must remember to close!

# With context manager - clean and safe
with open('data.txt', 'r') as f:
    content = f.read()
# File is automatically closed, even if an exception occurs
```

### Multiple Resources

```python
# Multiple context managers
with open('input.txt', 'r') as infile, open('output.txt', 'w') as outfile:
    for line in infile:
        outfile.write(line.upper())

# Equivalent (more readable for many resources)
with open('input.txt', 'r') as infile:
    with open('output.txt', 'w') as outfile:
        for line in infile:
            outfile.write(line.upper())

# Python 3.10+ parenthesized context managers
with (
    open('input.txt', 'r') as infile,
    open('output.txt', 'w') as outfile,
    open('log.txt', 'a') as logfile
):
    # Work with all three files
    pass
```

---

## Built-in Context Managers

### Thread Locks

```python
import threading

lock = threading.Lock()

# Manual lock management - risky
lock.acquire()
try:
    # Critical section
    shared_resource += 1
finally:
    lock.release()

# With context manager - safe
with lock:
    # Critical section
    shared_resource += 1
# Lock is always released
```

### Database Connections

```python
import sqlite3

# Connection closes automatically
with sqlite3.connect('database.db') as conn:
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users')
    results = cursor.fetchall()
# Connection closed here
```

### Temporary Files

```python
import tempfile

# File is deleted when context exits
with tempfile.NamedTemporaryFile(mode='w', delete=True) as f:
    f.write('temporary data')
    f.flush()
    # Use the temporary file
    process_file(f.name)
# File is automatically deleted
```

### Changing Directory

```python
import os
from contextlib import chdir  # Python 3.11+

# Automatically returns to original directory
with chdir('/tmp'):
    # Working in /tmp
    print(os.getcwd())  # /tmp
# Back to original directory
```

---

## Creating Custom Context Managers

### Using a Class

```python
class Timer:
    """Context manager to measure execution time."""

    def __enter__(self):
        """Called when entering the with block."""
        import time
        self.start = time.time()
        return self  # Value assigned to 'as' variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Called when exiting the with block."""
        import time
        self.end = time.time()
        self.elapsed = self.end - self.start
        print(f"Elapsed time: {self.elapsed:.4f} seconds")

        # Return False to propagate exceptions
        # Return True to suppress exceptions
        return False

# Usage
with Timer() as t:
    # Code to time
    sum(range(1000000))

print(f"Total time was: {t.elapsed:.4f}s")
```

### Exception Handling in __exit__

```python
class DatabaseTransaction:
    """Context manager for database transactions."""

    def __init__(self, connection):
        self.connection = connection

    def __enter__(self):
        """Start transaction."""
        self.connection.begin()
        return self.connection

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Commit or rollback based on whether exception occurred."""
        if exc_type is None:
            # No exception - commit
            self.connection.commit()
            print("Transaction committed")
        else:
            # Exception occurred - rollback
            self.connection.rollback()
            print(f"Transaction rolled back due to: {exc_val}")

        # Return False to propagate the exception
        return False

# Usage
with DatabaseTransaction(conn) as db:
    db.execute("INSERT INTO users VALUES ('Alice')")
    db.execute("INSERT INTO users VALUES ('Bob')")
    # If any error occurs, entire transaction is rolled back
```

---

## Using contextlib

### @contextmanager Decorator

The simplest way to create a context manager:

```python
from contextlib import contextmanager

@contextmanager
def timer():
    """Context manager using decorator."""
    import time
    start = time.time()
    try:
        yield  # Control transfers to the with block here
    finally:
        elapsed = time.time() - start
        print(f"Elapsed: {elapsed:.4f}s")

# Usage
with timer():
    sum(range(1000000))
```

### Yielding a Value

```python
from contextlib import contextmanager

@contextmanager
def open_file(path, mode='r'):
    """Custom file opener with logging."""
    print(f"Opening {path}")
    f = open(path, mode)
    try:
        yield f  # The file is passed to the with block
    finally:
        f.close()
        print(f"Closed {path}")

# Usage
with open_file('data.txt') as f:
    content = f.read()
```

### Exception Handling with @contextmanager

```python
from contextlib import contextmanager

@contextmanager
def error_handler(operation_name):
    """Context manager that logs errors."""
    try:
        yield
    except Exception as e:
        print(f"Error in {operation_name}: {e}")
        raise  # Re-raise the exception
    else:
        print(f"{operation_name} completed successfully")

# Usage
with error_handler("data processing"):
    process_data()
```

---

## Practical Examples

### Temporary Environment Variables

```python
from contextlib import contextmanager
import os

@contextmanager
def temporary_env(**env_vars):
    """Temporarily set environment variables."""
    old_values = {}
    for key, value in env_vars.items():
        old_values[key] = os.environ.get(key)
        os.environ[key] = value

    try:
        yield
    finally:
        for key, old_value in old_values.items():
            if old_value is None:
                del os.environ[key]
            else:
                os.environ[key] = old_value

# Usage
print(os.environ.get('DEBUG'))  # None

with temporary_env(DEBUG='true', LOG_LEVEL='debug'):
    print(os.environ.get('DEBUG'))  # true

print(os.environ.get('DEBUG'))  # None
```

### Redirect stdout

```python
from contextlib import contextmanager
import sys
from io import StringIO

@contextmanager
def capture_output():
    """Capture stdout for testing."""
    old_stdout = sys.stdout
    sys.stdout = StringIO()
    try:
        yield sys.stdout
    finally:
        sys.stdout = old_stdout

# Usage
with capture_output() as output:
    print("This is captured")
    print("So is this")

captured = output.getvalue()
print(f"Captured: {captured!r}")
```

### Database Connection Pool

```python
from contextlib import contextmanager
from queue import Queue

class ConnectionPool:
    def __init__(self, create_connection, max_size=5):
        self.create_connection = create_connection
        self.pool = Queue(maxsize=max_size)
        self.max_size = max_size
        self.size = 0

    @contextmanager
    def connection(self):
        """Get a connection from the pool."""
        # Try to get from pool
        if not self.pool.empty():
            conn = self.pool.get()
        elif self.size < self.max_size:
            conn = self.create_connection()
            self.size += 1
        else:
            conn = self.pool.get()  # Block until available

        try:
            yield conn
        finally:
            # Return to pool
            self.pool.put(conn)

# Usage
pool = ConnectionPool(create_database_connection, max_size=10)

with pool.connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
# Connection returned to pool
```

### Profiling Context

```python
from contextlib import contextmanager
import cProfile
import pstats
from io import StringIO

@contextmanager
def profile(sort_by='cumulative', lines=20):
    """Profile code block."""
    profiler = cProfile.Profile()
    profiler.enable()

    try:
        yield profiler
    finally:
        profiler.disable()
        stream = StringIO()
        stats = pstats.Stats(profiler, stream=stream)
        stats.sort_stats(sort_by)
        stats.print_stats(lines)
        print(stream.getvalue())

# Usage
with profile():
    # Code to profile
    expensive_operation()
```

---

## contextlib Utilities

### suppress - Ignore Specific Exceptions

```python
from contextlib import suppress

# Without suppress
try:
    os.remove('nonexistent.txt')
except FileNotFoundError:
    pass

# With suppress
with suppress(FileNotFoundError):
    os.remove('nonexistent.txt')

# Multiple exception types
with suppress(FileNotFoundError, PermissionError):
    os.remove('file.txt')
```

### closing - Add close() to Objects

```python
from contextlib import closing
from urllib.request import urlopen

# urlopen returns an object with close() but is not a context manager (old Python)
with closing(urlopen('http://example.com')) as page:
    content = page.read()
```

### redirect_stdout and redirect_stderr

```python
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Capture stdout
f = StringIO()
with redirect_stdout(f):
    print("This goes to f")

output = f.getvalue()

# Redirect to file
with open('output.log', 'w') as f:
    with redirect_stdout(f):
        print("This goes to file")
```

### ExitStack - Dynamic Context Management

```python
from contextlib import ExitStack

def process_files(filenames):
    """Process multiple files, number not known in advance."""
    with ExitStack() as stack:
        files = [
            stack.enter_context(open(fname))
            for fname in filenames
        ]
        # All files are open here
        for f in files:
            print(f.read())
    # All files are closed here

# Also useful for conditional contexts
with ExitStack() as stack:
    if condition:
        db = stack.enter_context(database_connection())
    # Use or do not use db based on condition
```

---

## Async Context Managers

```python
import asyncio

class AsyncTimer:
    async def __aenter__(self):
        self.start = asyncio.get_event_loop().time()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        elapsed = asyncio.get_event_loop().time() - self.start
        print(f"Async elapsed: {elapsed:.4f}s")
        return False

# Usage
async def main():
    async with AsyncTimer():
        await asyncio.sleep(1)

asyncio.run(main())

# Using contextlib for async
from contextlib import asynccontextmanager

@asynccontextmanager
async def async_resource():
    print("Acquiring resource")
    resource = await acquire_async_resource()
    try:
        yield resource
    finally:
        await release_async_resource(resource)
        print("Released resource")
```

---

## Best Practices

### Always Use Context Managers for Resources

```python
# Files
with open('file.txt') as f:
    pass

# Locks
with threading.Lock():
    pass

# Database connections
with db.connect() as conn:
    pass
```

### Prefer @contextmanager for Simple Cases

```python
# Simple and readable
@contextmanager
def timed_section(name):
    start = time.time()
    try:
        yield
    finally:
        print(f"{name}: {time.time() - start:.2f}s")
```

### Use Classes for Stateful Context Managers

```python
# When you need to access state after the with block
class QueryTimer:
    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, *args):
        self.elapsed = time.time() - self.start
        return False

with QueryTimer() as qt:
    execute_query()

# Can access qt.elapsed after the block
log_metric('query_time', qt.elapsed)
```

---

## Summary

Context managers provide:

- **Automatic cleanup** - resources released even on exceptions
- **Cleaner code** - no try/finally boilerplate
- **Reliable patterns** - hard to forget cleanup

Create them using:
- **Classes** with `__enter__` and `__exit__`
- **@contextmanager** decorator for simple cases
- **ExitStack** for dynamic resource management

Use them for:
- Files, sockets, connections
- Locks and synchronization
- Transactions
- Temporary state changes
- Timing and profiling
