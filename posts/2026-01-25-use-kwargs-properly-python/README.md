# How to Use **kwargs Properly in Python Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Functions, Arguments, Best Practices, Advanced Python

Description: Master the use of **kwargs in Python functions for flexible argument handling, configuration patterns, and building extensible APIs.

---

The `**kwargs` syntax in Python allows functions to accept arbitrary keyword arguments. It is a powerful feature for building flexible APIs, forwarding arguments to other functions, and handling configuration dictionaries. This guide covers how to use `**kwargs` effectively and avoid common pitfalls.

## Basic Usage

The `**kwargs` collects extra keyword arguments into a dictionary.

```python
def greet(**kwargs):
    """Accept any keyword arguments."""
    for key, value in kwargs.items():
        print(f"{key}: {value}")

greet(name="Alice", age=25, city="NYC")
# Output:
# name: Alice
# age: 25
# city: NYC
```

The name `kwargs` is a convention. You can use any name after `**`.

```python
def process(**options):
    """'options' works the same as 'kwargs'."""
    return options

result = process(debug=True, verbose=False)
print(result)  # {'debug': True, 'verbose': False}
```

## Combining with Regular Arguments

Functions can have regular parameters alongside `**kwargs`. The order matters: regular arguments first, then `*args`, then `**kwargs`.

```python
def create_user(name, email, **kwargs):
    """Create a user with required and optional fields.

    Args:
        name: User's name (required)
        email: User's email (required)
        **kwargs: Optional fields like age, city, phone
    """
    user = {
        'name': name,
        'email': email,
    }
    # Add any extra fields
    user.update(kwargs)
    return user

# Required arguments must be provided
user = create_user('Alice', 'alice@example.com', age=25, city='NYC')
print(user)
# {'name': 'Alice', 'email': 'alice@example.com', 'age': 25, 'city': 'NYC'}
```

## The Full Argument Order

Python functions can combine all argument types. Here is the complete order:

```python
def full_example(
    positional,           # 1. Regular positional
    default='value',      # 2. With default values
    *args,                # 3. Variable positional (*args)
    keyword_only,         # 4. Keyword-only (after *args)
    kw_default='kw',      # 5. Keyword-only with default
    **kwargs              # 6. Variable keyword (**kwargs)
):
    """Demonstrates all argument types in order."""
    print(f"positional: {positional}")
    print(f"default: {default}")
    print(f"args: {args}")
    print(f"keyword_only: {keyword_only}")
    print(f"kw_default: {kw_default}")
    print(f"kwargs: {kwargs}")

full_example(
    'pos_val',
    'default_val',
    1, 2, 3,                    # Goes to *args
    keyword_only='required',   # Must be keyword
    extra='value'              # Goes to **kwargs
)
```

## Forwarding Arguments to Other Functions

A common pattern uses `**kwargs` to forward arguments to wrapped functions.

```python
def wrapper_function(x, y, **kwargs):
    """Perform some preprocessing, then call inner function."""
    print(f"Preprocessing x={x}, y={y}")

    # Forward remaining kwargs to the inner function
    return inner_function(**kwargs)

def inner_function(debug=False, timeout=30, retries=3):
    """The function being wrapped."""
    print(f"debug={debug}, timeout={timeout}, retries={retries}")

# kwargs forwarded to inner_function
wrapper_function(1, 2, debug=True, timeout=60)
# Output:
# Preprocessing x=1, y=2
# debug=True, timeout=60, retries=3
```

### Forwarding to Parent Class

```python
class Animal:
    def __init__(self, name, species):
        self.name = name
        self.species = species

class Dog(Animal):
    def __init__(self, breed, **kwargs):
        # Forward kwargs to parent __init__
        super().__init__(**kwargs)
        self.breed = breed

dog = Dog(name='Rex', species='Canine', breed='German Shepherd')
print(f"{dog.name} is a {dog.breed}")  # Rex is a German Shepherd
```

## Extracting Known Keys with Defaults

Use `.get()` or `.pop()` to extract known keys from kwargs.

```python
def configure(**kwargs):
    """Extract configuration with defaults."""
    # .get() retrieves value without removing from dict
    debug = kwargs.get('debug', False)
    verbose = kwargs.get('verbose', False)

    # .pop() retrieves and removes from dict
    timeout = kwargs.pop('timeout', 30)

    # Remaining kwargs can be passed elsewhere
    remaining = kwargs

    print(f"debug={debug}, verbose={verbose}, timeout={timeout}")
    print(f"remaining: {remaining}")

configure(debug=True, timeout=60, custom_option='value')
# debug=True, verbose=False, timeout=60
# remaining: {'debug': True, 'verbose': False, 'custom_option': 'value'}
```

## Validating kwargs

Catch typos by checking for unexpected keys.

```python
def process_data(data, **kwargs):
    """Process data with validated options."""
    valid_options = {'normalize', 'fill_missing', 'drop_duplicates'}

    # Check for unexpected kwargs
    unexpected = set(kwargs.keys()) - valid_options
    if unexpected:
        raise TypeError(f"Unexpected keyword arguments: {unexpected}")

    # Process with validated options
    if kwargs.get('normalize'):
        data = normalize(data)
    if kwargs.get('fill_missing'):
        data = fill_missing(data)
    if kwargs.get('drop_duplicates'):
        data = drop_duplicates(data)

    return data

# This raises TypeError
# process_data([1, 2, 3], normilize=True)  # Typo caught!
```

## Building Configuration Objects

Use `**kwargs` to create flexible configuration patterns.

```python
class DatabaseConfig:
    """Database configuration with sensible defaults."""

    DEFAULTS = {
        'host': 'localhost',
        'port': 5432,
        'database': 'myapp',
        'user': 'postgres',
        'password': '',
        'pool_size': 5,
        'timeout': 30,
    }

    def __init__(self, **kwargs):
        # Start with defaults
        config = self.DEFAULTS.copy()

        # Check for invalid options
        invalid = set(kwargs.keys()) - set(self.DEFAULTS.keys())
        if invalid:
            raise ValueError(f"Invalid config options: {invalid}")

        # Override with provided values
        config.update(kwargs)

        # Set as attributes
        for key, value in config.items():
            setattr(self, key, value)

# Usage with partial overrides
db = DatabaseConfig(
    host='db.example.com',
    password='secret',
    pool_size=10
)

print(f"Connecting to {db.host}:{db.port}")  # db.example.com:5432
```

## Unpacking Dictionaries into Function Calls

The `**` operator works both ways - packing in function definitions and unpacking in function calls.

```python
def send_email(to, subject, body, cc=None, bcc=None):
    """Send an email."""
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    if cc:
        print(f"CC: {cc}")

# Configuration stored in a dictionary
email_config = {
    'to': 'user@example.com',
    'subject': 'Hello',
    'body': 'This is a test message.',
    'cc': 'manager@example.com'
}

# Unpack dictionary into function call
send_email(**email_config)
```

### Combining Static and Dynamic Arguments

```python
def api_request(endpoint, method='GET', **kwargs):
    """Make an API request."""
    print(f"{method} {endpoint}")
    print(f"Options: {kwargs}")

# Base configuration
base_config = {
    'timeout': 30,
    'headers': {'Authorization': 'Bearer token'}
}

# Call with base config plus overrides
api_request(
    '/users',
    method='POST',
    **base_config,
    body={'name': 'Alice'}  # Additional argument
)
```

## Common Patterns

### Decorator with Argument Forwarding

```python
import functools
import time

def timing_decorator(func):
    """Decorator that times function execution."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)  # Forward all arguments
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f} seconds")
        return result
    return wrapper

@timing_decorator
def slow_function(n, multiplier=1):
    """A slow function for demonstration."""
    time.sleep(0.1)
    return n * multiplier

result = slow_function(5, multiplier=3)
# slow_function took 0.1001 seconds
```

### Factory Functions

```python
def create_logger(name, **kwargs):
    """Factory function for creating configured loggers."""
    import logging

    logger = logging.getLogger(name)

    # Extract logger-specific options
    level = kwargs.pop('level', logging.INFO)
    format_str = kwargs.pop('format', '%(name)s - %(levelname)s - %(message)s')

    logger.setLevel(level)

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(format_str))
    logger.addHandler(handler)

    return logger

# Create loggers with different configurations
app_logger = create_logger('app', level=logging.DEBUG)
error_logger = create_logger('errors', format='%(asctime)s - %(message)s')
```

### Method Chaining with Configuration

```python
class QueryBuilder:
    """SQL query builder with chainable methods."""

    def __init__(self, table):
        self.table = table
        self.conditions = []
        self.options = {}

    def where(self, **kwargs):
        """Add WHERE conditions."""
        for column, value in kwargs.items():
            self.conditions.append(f"{column} = '{value}'")
        return self  # Enable chaining

    def configure(self, **kwargs):
        """Add query options."""
        self.options.update(kwargs)
        return self

    def build(self):
        """Build the SQL query."""
        query = f"SELECT * FROM {self.table}"
        if self.conditions:
            query += " WHERE " + " AND ".join(self.conditions)
        if self.options.get('limit'):
            query += f" LIMIT {self.options['limit']}"
        return query

# Chainable API
query = (QueryBuilder('users')
         .where(status='active', role='admin')
         .configure(limit=10)
         .build())

print(query)
# SELECT * FROM users WHERE status = 'active' AND role = 'admin' LIMIT 10
```

## Common Mistakes

### Mistake 1: Mutable Default in kwargs Processing

```python
# BAD - mutable default
def add_item(item, items={}):  # Default dict shared!
    items[item] = True
    return items

# GOOD - use kwargs properly
def add_item(item, **kwargs):
    items = kwargs.get('items', {})
    items[item] = True
    return items
```

### Mistake 2: Modifying kwargs Unintentionally

```python
def process(**kwargs):
    # BAD - modifies caller's dict if passed with **
    kwargs['processed'] = True
    return kwargs

# GOOD - work with a copy
def process(**kwargs):
    result = kwargs.copy()
    result['processed'] = True
    return result
```

## Summary

The `**kwargs` pattern provides flexibility for:

- Accepting arbitrary keyword arguments
- Forwarding arguments to wrapped functions
- Building configuration objects with defaults
- Creating extensible APIs

Key practices:

- Validate unexpected keys to catch typos
- Use `.get()` with defaults for optional values
- Document expected kwargs in docstrings
- Consider explicit parameters for commonly used options

When used thoughtfully, `**kwargs` creates clean, flexible interfaces that are easy to extend without breaking existing code.
