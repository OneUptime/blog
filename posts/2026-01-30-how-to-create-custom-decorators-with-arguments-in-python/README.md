# How to Create Custom Decorators with Arguments in Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Decorators, Metaprogramming, Functions

Description: Learn how to create Python decorators that accept arguments using nested functions and functools.wraps for flexible behavior.

---

Decorators are one of Python's most powerful features for modifying function behavior without changing the function itself. While simple decorators are straightforward, creating decorators that accept arguments requires understanding a deeper pattern. This guide walks you through building flexible, parameterized decorators.

## Decorator Basics Review

Before diving into decorators with arguments, let's recall how a basic decorator works:

```python
def simple_decorator(func):
    def wrapper(*args, **kwargs):
        print("Before function call")
        result = func(*args, **kwargs)
        print("After function call")
        return result
    return wrapper

@simple_decorator
def greet(name):
    return f"Hello, {name}!"
```

The `@simple_decorator` syntax is equivalent to `greet = simple_decorator(greet)`. The decorator receives the function and returns a wrapper.

## Triple Nested Functions for Arguments

When you need a decorator that accepts arguments, you add another layer of nesting. The outer function receives the decorator arguments, the middle function receives the decorated function, and the inner function is the actual wrapper:

```python
def repeat(times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(times=3)
def say_hello(name):
    return f"Hello, {name}!"

# Equivalent to: say_hello = repeat(times=3)(say_hello)
print(say_hello("World"))
# Output: ['Hello, World!', 'Hello, World!', 'Hello, World!']
```

The key insight is that `repeat(times=3)` returns the actual decorator, which then receives the function.

## Using functools.wraps

Without `functools.wraps`, decorated functions lose their metadata like `__name__`, `__doc__`, and `__annotations__`. Always use `functools.wraps` to preserve this information:

```python
from functools import wraps

def log_calls(level="INFO"):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            print(f"[{level}] Calling {func.__name__}")
            result = func(*args, **kwargs)
            print(f"[{level}] {func.__name__} returned {result}")
            return result
        return wrapper
    return decorator

@log_calls(level="DEBUG")
def calculate_sum(a, b):
    """Calculate the sum of two numbers."""
    return a + b

print(calculate_sum.__name__)  # Output: calculate_sum
print(calculate_sum.__doc__)   # Output: Calculate the sum of two numbers.
```

## Class-Based Decorators

For complex decorators with state, a class-based approach can be cleaner:

```python
from functools import wraps

class RateLimiter:
    def __init__(self, max_calls, period):
        self.max_calls = max_calls
        self.period = period
        self.calls = []

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            now = time.time()
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                raise Exception("Rate limit exceeded")

            self.calls.append(now)
            return func(*args, **kwargs)
        return wrapper

@RateLimiter(max_calls=5, period=60)
def api_request(endpoint):
    return f"Requesting {endpoint}"
```

The `__init__` method receives decorator arguments, and `__call__` makes the instance callable to receive the function.

## Optional Arguments Pattern

Sometimes you want a decorator that works both with and without arguments. Here's the pattern:

```python
from functools import wraps

def cache(func=None, *, maxsize=128):
    def decorator(f):
        storage = {}

        @wraps(f)
        def wrapper(*args):
            if args not in storage:
                if len(storage) >= maxsize:
                    storage.pop(next(iter(storage)))
                storage[args] = f(*args)
            return storage[args]
        return wrapper

    if func is not None:
        return decorator(func)
    return decorator

# Both usages work:
@cache
def fibonacci(n):
    return n if n < 2 else fibonacci(n-1) + fibonacci(n-2)

@cache(maxsize=256)
def factorial(n):
    return 1 if n <= 1 else n * factorial(n-1)
```

The trick is checking if `func` is `None`. When called with arguments, `func` is `None` and we return the decorator. When called without parentheses, `func` is the decorated function itself.

## Practical Example: Retry Decorator

Here's a production-ready retry decorator combining these concepts:

```python
from functools import wraps
import time

def retry(max_attempts=3, delay=1, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        time.sleep(delay * (attempt + 1))
            raise last_exception
        return wrapper
    return decorator

@retry(max_attempts=5, delay=2, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url):
    # Simulated API call
    import random
    if random.random() < 0.7:
        raise ConnectionError("Network error")
    return {"data": "success"}
```

## Conclusion

Creating decorators with arguments requires understanding the triple-nested function pattern or using class-based approaches. Always use `functools.wraps` to preserve function metadata, and consider the optional arguments pattern when flexibility is needed. These techniques enable you to build powerful, reusable function modifiers that make your Python code more expressive and maintainable.
