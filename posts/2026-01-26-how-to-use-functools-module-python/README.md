# How to Use functools Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, functools, Functional Programming, Decorators, Caching, Performance

Description: Master Python's functools module for functional programming patterns. Learn to use lru_cache, partial, reduce, wraps, and other powerful tools with practical examples.

---

> The functools module provides higher-order functions and operations on callable objects. It is one of Python's most useful standard library modules, offering tools for caching, partial function application, and decorator creation.

This guide covers the most important functools functions with practical examples you can use in your projects.

---

## lru_cache: Memoization Made Easy

The `lru_cache` decorator caches function results based on arguments, dramatically speeding up expensive computations.

```python
# lru_cache_examples.py
# Caching expensive function calls with lru_cache
from functools import lru_cache
import time

# Basic usage - caches up to 128 results by default
@lru_cache(maxsize=128)
def fibonacci(n):
    """Calculate the nth Fibonacci number with caching."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Without caching, fibonacci(35) takes several seconds
# With caching, it is nearly instant
start = time.time()
result = fibonacci(35)
print(f"fibonacci(35) = {result}, took {time.time() - start:.4f}s")

# Check cache statistics
print(f"Cache info: {fibonacci.cache_info()}")
# Output: CacheInfo(hits=33, misses=36, maxsize=128, currsize=36)

# Clear the cache when needed
fibonacci.cache_clear()


# Unlimited cache (be careful with memory)
@lru_cache(maxsize=None)
def factorial(n):
    """Calculate factorial with unlimited caching."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)


# Cache with typed arguments
@lru_cache(maxsize=128, typed=True)
def process_data(value):
    """Process data - typed=True treats 3 and 3.0 as different keys."""
    print(f"Processing {value} (type: {type(value).__name__})")
    return value * 2

process_data(3)    # Calls the function
process_data(3)    # Returns cached result
process_data(3.0)  # Calls the function again (different type)
```

### Practical Caching Example

```python
# api_cache.py
# Caching API responses
from functools import lru_cache
import requests
import hashlib

@lru_cache(maxsize=100)
def fetch_user_data(user_id: int) -> dict:
    """Fetch user data from API with caching."""
    print(f"Fetching user {user_id} from API...")
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

# First call hits the API
user = fetch_user_data(123)

# Second call returns cached result
user = fetch_user_data(123)  # No API call made


# For more complex cache keys, create a hashable representation
def cached_query(func):
    """Decorator to cache database query results."""
    cache = {}

    def wrapper(query: str, params: tuple = ()):
        # Create a cache key from query and params
        key = hashlib.md5(f"{query}:{params}".encode()).hexdigest()

        if key not in cache:
            cache[key] = func(query, params)

        return cache[key]

    wrapper.cache = cache
    wrapper.clear_cache = cache.clear
    return wrapper
```

---

## partial: Pre-fill Function Arguments

```python
# partial_examples.py
# Creating specialized functions with partial
from functools import partial

# Basic partial - pre-fill some arguments
def power(base, exponent):
    """Raise base to the power of exponent."""
    return base ** exponent

# Create specialized functions
square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(5))  # 25
print(cube(3))    # 27


# Practical example: HTTP client with base URL
import requests

def make_request(method, url, base_url, **kwargs):
    """Make an HTTP request with a base URL."""
    full_url = f"{base_url}{url}"
    return requests.request(method, full_url, **kwargs)

# Create an API client with a fixed base URL
api_get = partial(make_request, 'GET', base_url='https://api.example.com')
api_post = partial(make_request, 'POST', base_url='https://api.example.com')

# Usage
response = api_get('/users')
response = api_post('/users', json={'name': 'Alice'})


# Partial with callback patterns
def log_event(event_type, message, timestamp):
    """Log an event with type, message, and timestamp."""
    print(f"[{timestamp}] {event_type}: {message}")

# Pre-configure loggers for different event types
from datetime import datetime

log_error = partial(log_event, 'ERROR')
log_info = partial(log_event, 'INFO')

log_error("Connection failed", datetime.now())
log_info("User logged in", datetime.now())
```

---

## wraps: Preserve Function Metadata in Decorators

```python
# wraps_examples.py
# Creating proper decorators with wraps
from functools import wraps
import time

# BAD: Decorator without wraps loses function metadata
def bad_timer(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Took {time.time() - start:.4f}s")
        return result
    return wrapper

@bad_timer
def bad_example():
    """This docstring will be lost."""
    pass

print(bad_example.__name__)  # Output: wrapper (wrong!)
print(bad_example.__doc__)   # Output: None (wrong!)


# GOOD: Decorator with wraps preserves metadata
def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer
def good_example():
    """This docstring is preserved."""
    pass

print(good_example.__name__)  # Output: good_example (correct!)
print(good_example.__doc__)   # Output: This docstring is preserved. (correct!)


# Decorator with arguments
def retry(max_attempts=3, delay=1.0):
    """Retry a function on failure."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    print(f"Attempt {attempt + 1} failed: {e}")
                    if attempt < max_attempts - 1:
                        time.sleep(delay)
            raise last_error
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def unreliable_api_call():
    """Call an unreliable API."""
    import random
    if random.random() < 0.7:
        raise ConnectionError("API unavailable")
    return "Success!"
```

---

## reduce: Cumulative Operations

```python
# reduce_examples.py
# Accumulating values with reduce
from functools import reduce
from operator import add, mul

# Basic reduce - sum of numbers
numbers = [1, 2, 3, 4, 5]
total = reduce(add, numbers)
print(f"Sum: {total}")  # 15

# Product of numbers
product = reduce(mul, numbers)
print(f"Product: {product}")  # 120

# With custom function
def find_max(a, b):
    """Return the larger of two values."""
    return a if a > b else b

maximum = reduce(find_max, numbers)
print(f"Max: {maximum}")  # 5


# Practical examples
# Flatten a list of lists
nested = [[1, 2], [3, 4], [5, 6]]
flat = reduce(lambda acc, lst: acc + lst, nested, [])
print(f"Flattened: {flat}")  # [1, 2, 3, 4, 5, 6]

# Build a dictionary from pairs
pairs = [('a', 1), ('b', 2), ('c', 3)]
dictionary = reduce(lambda d, pair: {**d, pair[0]: pair[1]}, pairs, {})
print(f"Dictionary: {dictionary}")  # {'a': 1, 'b': 2, 'c': 3}

# Compose multiple functions
def compose(*functions):
    """Compose multiple functions into one."""
    def composed(x):
        return reduce(lambda acc, f: f(acc), functions, x)
    return composed

# Create a pipeline
add_one = lambda x: x + 1
double = lambda x: x * 2
square = lambda x: x ** 2

pipeline = compose(add_one, double, square)
print(pipeline(3))  # ((3 + 1) * 2) ** 2 = 64
```

---

## total_ordering: Complete Comparison Methods

```python
# total_ordering_examples.py
# Automatically generate comparison methods
from functools import total_ordering

@total_ordering
class Version:
    """Software version with complete comparison support."""

    def __init__(self, major, minor, patch):
        self.major = major
        self.minor = minor
        self.patch = patch

    def __eq__(self, other):
        """Check equality - required for total_ordering."""
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) == \
               (other.major, other.minor, other.patch)

    def __lt__(self, other):
        """Check less than - one comparison method required."""
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) < \
               (other.major, other.minor, other.patch)

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"

# total_ordering generates __le__, __gt__, __ge__ automatically
v1 = Version(1, 0, 0)
v2 = Version(1, 2, 0)
v3 = Version(2, 0, 0)

print(f"{v1} < {v2}: {v1 < v2}")   # True
print(f"{v2} <= {v2}: {v2 <= v2}") # True
print(f"{v3} > {v1}: {v3 > v1}")   # True
print(f"{v2} >= {v1}: {v2 >= v1}") # True

# Can now sort versions
versions = [v3, v1, v2]
sorted_versions = sorted(versions)
print([str(v) for v in sorted_versions])  # ['1.0.0', '1.2.0', '2.0.0']
```

---

## singledispatch: Generic Functions

```python
# singledispatch_examples.py
# Single dispatch generic functions
from functools import singledispatch
from datetime import datetime, date
from decimal import Decimal

@singledispatch
def format_value(value):
    """Format a value for display - default implementation."""
    return str(value)

@format_value.register(int)
def _(value):
    """Format integers with thousands separators."""
    return f"{value:,}"

@format_value.register(float)
def _(value):
    """Format floats with 2 decimal places."""
    return f"{value:,.2f}"

@format_value.register(Decimal)
def _(value):
    """Format Decimals with currency symbol."""
    return f"${value:,.2f}"

@format_value.register(datetime)
def _(value):
    """Format datetime as ISO string."""
    return value.isoformat()

@format_value.register(date)
def _(value):
    """Format date in readable format."""
    return value.strftime("%B %d, %Y")

@format_value.register(list)
def _(value):
    """Format lists by formatting each element."""
    return "[" + ", ".join(format_value(item) for item in value) + "]"

# Usage - dispatch based on argument type
print(format_value(1000000))           # "1,000,000"
print(format_value(3.14159))           # "3.14"
print(format_value(Decimal("99.99")))  # "$99.99"
print(format_value(datetime.now()))    # ISO format
print(format_value(date.today()))      # "January 25, 2026"
print(format_value([1, 2.5, "hello"])) # "[1, 2.50, hello]"
```

---

## cached_property: Lazy Computed Properties

```python
# cached_property_examples.py
# Lazy evaluation with cached_property (Python 3.8+)
from functools import cached_property
import time

class DataAnalyzer:
    """Analyze data with expensive computed properties."""

    def __init__(self, data):
        self.data = data

    @cached_property
    def statistics(self):
        """Compute statistics - expensive operation, cached after first access."""
        print("Computing statistics...")
        time.sleep(1)  # Simulate expensive computation

        return {
            'mean': sum(self.data) / len(self.data),
            'min': min(self.data),
            'max': max(self.data),
            'count': len(self.data)
        }

    @cached_property
    def sorted_data(self):
        """Sort the data - cached after first access."""
        print("Sorting data...")
        return sorted(self.data)

# Usage
analyzer = DataAnalyzer([5, 2, 8, 1, 9, 3, 7])

# First access computes the value
print(analyzer.statistics)  # "Computing statistics..." then result

# Second access returns cached value instantly
print(analyzer.statistics)  # No computation message

# To recompute, delete the cached value
del analyzer.statistics
print(analyzer.statistics)  # "Computing statistics..." again
```

---

## Practical Patterns

### Retry Decorator with Exponential Backoff

```python
from functools import wraps
import time

def retry_with_backoff(max_retries=3, base_delay=1, max_delay=60):
    """Retry decorator with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        sleep_time = min(delay, max_delay)
                        print(f"Attempt {attempt + 1} failed, retrying in {sleep_time}s")
                        time.sleep(sleep_time)
                        delay *= 2

            raise last_exception

        return wrapper
    return decorator
```

---

## Conclusion

The functools module provides essential tools for Python developers:

- **lru_cache**: Memoize expensive function calls
- **partial**: Create specialized functions with pre-filled arguments
- **wraps**: Preserve function metadata in decorators
- **reduce**: Apply cumulative operations to sequences
- **total_ordering**: Generate comparison methods automatically
- **singledispatch**: Create type-based generic functions
- **cached_property**: Lazy evaluation with caching

These tools enable cleaner, more efficient, and more maintainable Python code.

---

*Building Python applications? [OneUptime](https://oneuptime.com) helps you monitor performance, track cache hit rates, and optimize your application's efficiency.*

