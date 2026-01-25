# How to Use Decorators in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Decorators, Functions, Advanced Python, Clean Code

Description: Learn how to create and use decorators in Python to modify function behavior, implement logging, authentication, caching, and write cleaner, more maintainable code.

---

Decorators are one of Python's most powerful features. They let you modify or extend the behavior of functions and methods without changing their source code. Once you understand decorators, you will find yourself using them everywhere to write cleaner, more maintainable code.

## What is a Decorator?

A decorator is simply a function that takes another function as an argument and returns a new function. The new function usually extends or modifies the behavior of the original function.

```python
# A decorator is just a function that wraps another function
def my_decorator(func):
    def wrapper():
        print("Something before the function runs")
        func()
        print("Something after the function runs")
    return wrapper

# Without @ syntax
def say_hello():
    print("Hello!")

say_hello = my_decorator(say_hello)
say_hello()

# Output:
# Something before the function runs
# Hello!
# Something after the function runs
```

The `@` syntax is just syntactic sugar for the same operation:

```python
# With @ syntax - cleaner and more readable
@my_decorator
def say_hello():
    print("Hello!")

say_hello()
# Same output as above
```

## Preserving Function Metadata with functools.wraps

When you wrap a function, you lose its original name, docstring, and other metadata. The `functools.wraps` decorator fixes this:

```python
from functools import wraps

def my_decorator(func):
    @wraps(func)  # Preserves the original function's metadata
    def wrapper(*args, **kwargs):
        print("Before function call")
        result = func(*args, **kwargs)
        print("After function call")
        return result
    return wrapper

@my_decorator
def greet(name):
    """Return a greeting message."""
    return f"Hello, {name}!"

# Without @wraps, this would show 'wrapper' instead of 'greet'
print(greet.__name__)  # Output: greet
print(greet.__doc__)   # Output: Return a greeting message.
```

## Decorators with Arguments

Sometimes you need decorators that accept their own arguments. This requires an extra layer of nesting:

```python
from functools import wraps

def repeat(times):
    """Decorator that repeats function execution."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = None
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def say_hi():
    print("Hi!")

say_hi()
# Output:
# Hi!
# Hi!
# Hi!
```

## Practical Decorator Examples

### Timing Decorator

Measure how long a function takes to execute:

```python
import time
from functools import wraps

def timer(func):
    """Measure and print execution time of a function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        elapsed = end_time - start_time
        print(f"{func.__name__} took {elapsed:.4f} seconds")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Done"

slow_function()
# Output: slow_function took 1.0012 seconds
```

### Logging Decorator

Log function calls with their arguments and return values:

```python
import logging
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_calls(func):
    """Log function calls with arguments and return values."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        args_repr = [repr(a) for a in args]
        kwargs_repr = [f"{k}={v!r}" for k, v in kwargs.items()]
        signature = ", ".join(args_repr + kwargs_repr)
        logger.info(f"Calling {func.__name__}({signature})")

        result = func(*args, **kwargs)

        logger.info(f"{func.__name__} returned {result!r}")
        return result
    return wrapper

@log_calls
def add_numbers(a, b):
    return a + b

add_numbers(5, 3)
# INFO:__main__:Calling add_numbers(5, 3)
# INFO:__main__:add_numbers returned 8
```

### Retry Decorator

Automatically retry a function on failure:

```python
import time
from functools import wraps

def retry(max_attempts=3, delay=1.0):
    """Retry a function if it raises an exception."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    print(f"Attempt {attempt} failed: {e}")
                    if attempt < max_attempts:
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def unstable_api_call():
    import random
    if random.random() < 0.7:
        raise ConnectionError("API unavailable")
    return "Success"

# Will retry up to 3 times before giving up
result = unstable_api_call()
```

### Caching Decorator

Cache function results to avoid redundant computations:

```python
from functools import wraps

def memoize(func):
    """Cache function results based on arguments."""
    cache = {}

    @wraps(func)
    def wrapper(*args, **kwargs):
        # Create a hashable key from arguments
        key = (args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]
    return wrapper

@memoize
def fibonacci(n):
    """Calculate fibonacci number recursively."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Without memoization, this would be extremely slow
print(fibonacci(100))  # Instant result
```

Note: Python 3.9+ has `functools.cache` and earlier versions have `functools.lru_cache` built in.

### Authentication Decorator

Check permissions before allowing function execution:

```python
from functools import wraps

# Simple user context for demonstration
current_user = {"name": "admin", "role": "admin"}

def require_role(role):
    """Restrict function access to users with specific role."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if current_user.get("role") != role:
                raise PermissionError(
                    f"User must have '{role}' role to access {func.__name__}"
                )
            return func(*args, **kwargs)
        return wrapper
    return decorator

@require_role("admin")
def delete_database():
    print("Database deleted!")
    return True

delete_database()  # Works for admin

current_user = {"name": "guest", "role": "viewer"}
# delete_database()  # Raises PermissionError
```

## Class-Based Decorators

You can also create decorators using classes. This is useful when you need to maintain state:

```python
from functools import wraps

class CountCalls:
    """Decorator class that counts function calls."""

    def __init__(self, func):
        wraps(func)(self)
        self.func = func
        self.call_count = 0

    def __call__(self, *args, **kwargs):
        self.call_count += 1
        print(f"Call {self.call_count} of {self.func.__name__}")
        return self.func(*args, **kwargs)

@CountCalls
def process_data(data):
    return data.upper()

process_data("hello")  # Call 1 of process_data
process_data("world")  # Call 2 of process_data
print(process_data.call_count)  # 2
```

## Decorating Methods in Classes

When decorating methods, be careful with `self`:

```python
from functools import wraps

def validate_positive(func):
    """Ensure first argument (after self) is positive."""
    @wraps(func)
    def wrapper(self, value, *args, **kwargs):
        if value < 0:
            raise ValueError(f"Value must be positive, got {value}")
        return func(self, value, *args, **kwargs)
    return wrapper

class BankAccount:
    def __init__(self, balance=0):
        self.balance = balance

    @validate_positive
    def deposit(self, amount):
        self.balance += amount
        return self.balance

    @validate_positive
    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        return self.balance

account = BankAccount(100)
account.deposit(50)   # Works fine
# account.deposit(-50)  # Raises ValueError
```

## Stacking Multiple Decorators

Decorators can be stacked. They execute from bottom to top:

```python
@timer
@log_calls
def compute(x, y):
    return x * y

# Equivalent to:
# compute = timer(log_calls(compute))
```

## Summary

| Pattern | Use Case |
|---------|----------|
| Basic decorator | Wrap function with before/after behavior |
| @wraps | Preserve original function metadata |
| Decorator with arguments | Configurable decorator behavior |
| Class-based decorator | When you need to maintain state |
| Stacked decorators | Combine multiple behaviors |

Decorators are a fundamental Python pattern used extensively in web frameworks like Flask and Django, testing tools like pytest, and many libraries. Master them, and you will write more elegant, reusable code.
