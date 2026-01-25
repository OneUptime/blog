# How to Handle Exceptions Properly in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Exception Handling, Error Handling, Best Practices, Debugging

Description: Learn Python exception handling best practices including try/except patterns, custom exceptions, context managers, and strategies for building robust applications.

---

> Exception handling is not just about preventing crashes. It is about building reliable software that fails gracefully, provides meaningful error messages, and makes debugging easier. This guide covers Python's exception system and patterns for handling errors effectively.

Proper exception handling separates robust applications from fragile ones. Python's exception system is powerful but requires understanding to use effectively. Let us explore the patterns that make your code reliable.

---

## Basic Try/Except Syntax

```python
# Basic exception handling
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero!")

# Catching multiple exception types
try:
    value = int("not a number")
except (ValueError, TypeError) as e:
    print(f"Conversion error: {e}")

# Multiple except blocks
try:
    file = open("missing.txt")
    data = file.read()
except FileNotFoundError:
    print("File not found")
except PermissionError:
    print("Permission denied")
except IOError as e:
    print(f"IO error: {e}")
```

---

## The Full Try/Except/Else/Finally Pattern

```python
def read_config(filepath):
    """Read configuration with full exception handling."""

    try:
        # Code that might raise exceptions
        with open(filepath, 'r') as f:
            config = json.load(f)

    except FileNotFoundError:
        # Handle specific exception
        print(f"Config file not found: {filepath}")
        config = {}

    except json.JSONDecodeError as e:
        # Handle another specific exception
        print(f"Invalid JSON in config: {e}")
        config = {}

    else:
        # Runs only if no exception occurred
        print("Config loaded successfully")

    finally:
        # Always runs, even if exception was raised
        print("Config loading complete")

    return config
```

### When to Use Each Block

- **try**: Code that might raise an exception
- **except**: Handle specific exceptions
- **else**: Code that should run only if no exception occurred
- **finally**: Cleanup code that must always run

---

## Catching the Right Exceptions

### Be Specific, Not Broad

```python
# BAD: Catches everything, including bugs
try:
    process_data(data)
except Exception:  # Too broad!
    pass

# BAD: Bare except catches even keyboard interrupts
try:
    process_data(data)
except:  # Never do this!
    pass

# GOOD: Catch specific exceptions you expect
try:
    result = json.loads(data)
except json.JSONDecodeError as e:
    logger.error(f"Invalid JSON: {e}")
    result = None
```

### Exception Hierarchy

Python exceptions form a hierarchy. Catch specific exceptions first:

```python
try:
    value = my_dict[key]
except KeyError:
    # Catches KeyError
    pass
except LookupError:
    # Would also catch KeyError if above did not exist
    pass
except Exception:
    # Catches almost everything
    pass
```

Common hierarchy branches:
- `BaseException` > `Exception` > `ValueError` / `TypeError` / `KeyError` ...
- `BaseException` > `KeyboardInterrupt` (not under Exception!)
- `BaseException` > `SystemExit` (not under Exception!)

---

## Raising Exceptions

### Basic Raising

```python
def validate_age(age):
    if not isinstance(age, int):
        raise TypeError("Age must be an integer")

    if age < 0:
        raise ValueError("Age cannot be negative")

    if age > 150:
        raise ValueError("Age seems unrealistic")

    return True
```

### Re-raising Exceptions

```python
def process_file(filepath):
    try:
        with open(filepath) as f:
            return process_content(f.read())
    except FileNotFoundError:
        logger.error(f"File not found: {filepath}")
        raise  # Re-raise the same exception

# Or raise a different exception
def get_user(user_id):
    try:
        return database.fetch_user(user_id)
    except DatabaseError as e:
        raise UserNotFoundError(f"Could not fetch user {user_id}") from e
```

### Exception Chaining

```python
try:
    fetch_data()
except ConnectionError as e:
    # 'from e' chains the exceptions
    raise DataFetchError("Failed to fetch data") from e

# In the traceback, you will see:
# ConnectionError: ...
# The above exception was the direct cause of:
# DataFetchError: Failed to fetch data
```

---

## Creating Custom Exceptions

### Simple Custom Exception

```python
class ValidationError(Exception):
    """Raised when data validation fails."""
    pass

class ConfigurationError(Exception):
    """Raised when configuration is invalid."""
    pass

# Usage
def validate_config(config):
    if 'database_url' not in config:
        raise ConfigurationError("Missing database_url")
```

### Custom Exception with Additional Data

```python
class APIError(Exception):
    """Exception for API-related errors."""

    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response

    def __str__(self):
        if self.status_code:
            return f"[{self.status_code}] {self.args[0]}"
        return self.args[0]

# Usage
try:
    response = api_client.fetch('/users')
    if response.status_code != 200:
        raise APIError(
            "Failed to fetch users",
            status_code=response.status_code,
            response=response
        )
except APIError as e:
    print(f"API Error: {e}")
    print(f"Status: {e.status_code}")
```

### Exception Hierarchy for Your Application

```python
# Base exception for your application
class AppError(Exception):
    """Base exception for the application."""
    pass

# Specific error categories
class ValidationError(AppError):
    """Data validation errors."""
    pass

class AuthenticationError(AppError):
    """Authentication failures."""
    pass

class DatabaseError(AppError):
    """Database operation errors."""
    pass

# Now you can catch all app errors or specific ones
try:
    process_request(request)
except ValidationError:
    return {"error": "Invalid input"}, 400
except AuthenticationError:
    return {"error": "Unauthorized"}, 401
except AppError:
    return {"error": "Server error"}, 500
```

---

## Context Managers for Resource Cleanup

```python
from contextlib import contextmanager

@contextmanager
def managed_resource():
    """Context manager ensures cleanup even if exception occurs."""
    resource = acquire_resource()
    try:
        yield resource
    finally:
        release_resource(resource)

# Usage
with managed_resource() as resource:
    process(resource)
# Resource is released even if process() raises
```

### Database Transaction Example

```python
@contextmanager
def database_transaction(connection):
    """Manage database transaction with automatic rollback on error."""
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise

# Usage
with database_transaction(conn) as db:
    db.execute("INSERT INTO users ...")
    db.execute("UPDATE accounts ...")
# Commits if successful, rolls back if exception
```

---

## Practical Patterns

### Retry Pattern

```python
import time

def retry(max_attempts=3, delay=1, exceptions=(Exception,)):
    """Decorator to retry a function on failure."""

    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        print(f"Attempt {attempt + 1} failed, retrying...")
                        time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator

# Usage
@retry(max_attempts=3, delay=2, exceptions=(ConnectionError,))
def fetch_data(url):
    return requests.get(url)
```

### Graceful Degradation

```python
def get_user_data(user_id):
    """Get user data with fallbacks."""

    # Try primary source
    try:
        return primary_database.get_user(user_id)
    except DatabaseError:
        logger.warning("Primary database unavailable, trying replica")

    # Fallback to replica
    try:
        return replica_database.get_user(user_id)
    except DatabaseError:
        logger.warning("Replica unavailable, trying cache")

    # Fallback to cache
    try:
        return cache.get(f"user:{user_id}")
    except CacheError:
        logger.error("All data sources unavailable")
        raise ServiceUnavailableError("Could not fetch user data")
```

### Null Object Pattern

```python
class NullUser:
    """Null object to avoid None checks."""

    id = None
    name = "Anonymous"
    email = None

    def has_permission(self, permission):
        return False

def get_user(user_id):
    """Return user or null object, never None."""
    try:
        return database.fetch_user(user_id)
    except UserNotFoundError:
        return NullUser()

# Usage - no need to check for None
user = get_user(123)
print(user.name)  # Works even if user not found
```

---

## Logging Exceptions

```python
import logging
import traceback

logger = logging.getLogger(__name__)

def process_request(request):
    try:
        return handle_request(request)

    except ValidationError as e:
        # Log at warning level for expected errors
        logger.warning(f"Validation failed: {e}")
        raise

    except Exception as e:
        # Log full traceback for unexpected errors
        logger.error(
            f"Unexpected error processing request: {e}\n"
            f"Traceback:\n{traceback.format_exc()}"
        )
        raise

# Or use exc_info=True
try:
    risky_operation()
except Exception:
    logger.exception("Operation failed")  # Automatically includes traceback
```

---

## Assertions vs Exceptions

```python
# Assertions are for catching programming errors (bugs)
def calculate_average(numbers):
    assert len(numbers) > 0, "Cannot calculate average of empty list"
    return sum(numbers) / len(numbers)

# Exceptions are for runtime errors (expected failures)
def load_config(filepath):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Config not found: {filepath}")
    return json.load(open(filepath))

# Assertions can be disabled with python -O
# Never use assertions for input validation!
```

---

## Best Practices Summary

### Do

```python
# Be specific about exceptions
except ValueError as e:
    handle_value_error(e)

# Use context managers for cleanup
with open(filepath) as f:
    data = f.read()

# Log exceptions with context
logger.error(f"Failed to process {item_id}: {e}")

# Raise meaningful exceptions
raise ValidationError(f"Invalid email: {email}")

# Chain exceptions to preserve context
raise ProcessingError("Failed") from original_error
```

### Do Not

```python
# Don't catch and ignore silently
except Exception:
    pass  # BAD!

# Don't use bare except
except:  # BAD!
    pass

# Don't catch too broadly
except Exception:  # Usually too broad
    return None

# Don't swallow exceptions in finally
finally:
    try:
        cleanup()  # If this raises, original exception is lost
    except:
        pass
```

---

## Summary

Effective exception handling:

1. **Catch specific exceptions** - not `Exception` or bare `except`
2. **Use try/except/else/finally** appropriately
3. **Create custom exceptions** for your domain
4. **Chain exceptions** with `from` to preserve context
5. **Log exceptions** with appropriate levels and context
6. **Use context managers** for resource cleanup
7. **Fail fast** for programming errors, recover gracefully for runtime errors

Remember: Exceptions should be exceptional. Use them for error conditions, not for normal control flow.
