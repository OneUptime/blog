# How to Create Custom Exceptions in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Exceptions, Error Handling, Custom Exceptions, Best Practices

Description: Learn to create custom exceptions in Python for clearer error handling and better code organization. Includes patterns for exception hierarchies and practical examples.

---

> Custom exceptions make your code more expressive and easier to debug. Instead of generic errors, you can raise and catch specific exceptions that describe exactly what went wrong in your application's domain.

While Python's built-in exceptions cover many cases, custom exceptions let you communicate domain-specific errors clearly. They make error handling more precise and your codebase more maintainable.

---

## Basic Custom Exception

The simplest custom exception just inherits from Exception:

```python
class ValidationError(Exception):
    """Raised when data validation fails."""
    pass

# Usage
def validate_email(email):
    if '@' not in email:
        raise ValidationError(f"Invalid email: {email}")
    return True

try:
    validate_email("invalid-email")
except ValidationError as e:
    print(f"Validation failed: {e}")
```

---

## Adding Useful Information

### Custom Attributes

```python
class APIError(Exception):
    """Exception for API-related errors with status code."""

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
    response = api_request('/users')
    if response.status_code == 404:
        raise APIError(
            "User not found",
            status_code=404,
            response=response
        )
except APIError as e:
    print(f"API Error: {e}")
    print(f"Status: {e.status_code}")
    if e.response:
        print(f"Body: {e.response.text}")
```

### Multiple Error Details

```python
class DataProcessingError(Exception):
    """Error during data processing with context."""

    def __init__(self, message, record=None, field=None, value=None):
        super().__init__(message)
        self.record = record
        self.field = field
        self.value = value

    def __str__(self):
        parts = [self.args[0]]
        if self.field:
            parts.append(f"Field: {self.field}")
        if self.value is not None:
            parts.append(f"Value: {self.value!r}")
        return " | ".join(parts)

# Usage
def process_record(record):
    if record.get('age') is not None and record['age'] < 0:
        raise DataProcessingError(
            "Age cannot be negative",
            record=record,
            field='age',
            value=record['age']
        )

try:
    process_record({'name': 'Alice', 'age': -5})
except DataProcessingError as e:
    print(f"Error: {e}")
    print(f"Problematic field: {e.field}")
```

---

## Exception Hierarchies

Create a hierarchy for your application's errors:

```python
# Base exception for your application
class AppError(Exception):
    """Base exception for the application."""
    pass

# Category-level exceptions
class DatabaseError(AppError):
    """Database-related errors."""
    pass

class ValidationError(AppError):
    """Validation errors."""
    pass

class AuthenticationError(AppError):
    """Authentication errors."""
    pass

# Specific exceptions
class ConnectionError(DatabaseError):
    """Database connection failed."""
    pass

class QueryError(DatabaseError):
    """Database query failed."""
    pass

class InvalidFieldError(ValidationError):
    """Invalid field value."""
    pass

class MissingFieldError(ValidationError):
    """Required field is missing."""
    pass
```

### Using the Hierarchy

```python
def handle_request(request):
    try:
        validate_request(request)
        user = authenticate(request)
        result = process_query(request.data)
        return result

    except MissingFieldError as e:
        # Specific handling for missing fields
        return {"error": f"Missing required field: {e}"}, 400

    except ValidationError as e:
        # General validation errors
        return {"error": f"Invalid input: {e}"}, 400

    except AuthenticationError as e:
        # Auth failures
        return {"error": "Unauthorized"}, 401

    except DatabaseError as e:
        # Any database error
        logger.error(f"Database error: {e}")
        return {"error": "Service unavailable"}, 503

    except AppError as e:
        # Catch-all for app errors
        logger.error(f"App error: {e}")
        return {"error": "Internal error"}, 500
```

---

## Practical Examples

### REST API Exceptions

```python
class HTTPError(Exception):
    """Base HTTP error."""
    status_code = 500
    default_message = "Internal Server Error"

    def __init__(self, message=None, details=None):
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)

    def to_dict(self):
        result = {
            "error": self.message,
            "status_code": self.status_code
        }
        if self.details:
            result["details"] = self.details
        return result

class BadRequest(HTTPError):
    status_code = 400
    default_message = "Bad Request"

class NotFound(HTTPError):
    status_code = 404
    default_message = "Not Found"

class Unauthorized(HTTPError):
    status_code = 401
    default_message = "Unauthorized"

class Forbidden(HTTPError):
    status_code = 403
    default_message = "Forbidden"

class Conflict(HTTPError):
    status_code = 409
    default_message = "Conflict"

# Usage in a Flask app
@app.errorhandler(HTTPError)
def handle_http_error(error):
    return jsonify(error.to_dict()), error.status_code

@app.route('/users/<user_id>')
def get_user(user_id):
    user = database.get_user(user_id)
    if not user:
        raise NotFound(f"User {user_id} not found")
    return jsonify(user)
```

### Validation Exceptions with Details

```python
class ValidationError(Exception):
    """Validation error with multiple field errors."""

    def __init__(self, message="Validation failed", errors=None):
        super().__init__(message)
        self.errors = errors or {}

    def add_error(self, field, message):
        if field not in self.errors:
            self.errors[field] = []
        self.errors[field].append(message)

    def has_errors(self):
        return bool(self.errors)

    def __str__(self):
        if self.errors:
            error_msgs = [
                f"{field}: {', '.join(msgs)}"
                for field, msgs in self.errors.items()
            ]
            return f"{self.args[0]} - {'; '.join(error_msgs)}"
        return self.args[0]

# Usage
def validate_user(data):
    error = ValidationError()

    if not data.get('email'):
        error.add_error('email', 'Email is required')
    elif '@' not in data['email']:
        error.add_error('email', 'Invalid email format')

    if not data.get('password'):
        error.add_error('password', 'Password is required')
    elif len(data['password']) < 8:
        error.add_error('password', 'Password must be at least 8 characters')

    if error.has_errors():
        raise error

    return True

try:
    validate_user({'email': 'invalid', 'password': '123'})
except ValidationError as e:
    print(f"Validation errors: {e.errors}")
    # {'email': ['Invalid email format'], 'password': ['Password must be at least 8 characters']}
```

### Business Logic Exceptions

```python
class OrderError(Exception):
    """Base exception for order-related errors."""
    pass

class InsufficientInventoryError(OrderError):
    """Raised when inventory is insufficient for an order."""

    def __init__(self, product_id, requested, available):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        message = (
            f"Insufficient inventory for product {product_id}: "
            f"requested {requested}, available {available}"
        )
        super().__init__(message)

class PaymentError(OrderError):
    """Payment processing failed."""

    def __init__(self, message, transaction_id=None, provider_code=None):
        super().__init__(message)
        self.transaction_id = transaction_id
        self.provider_code = provider_code

class OrderAlreadyProcessedError(OrderError):
    """Order has already been processed."""

    def __init__(self, order_id, current_status):
        self.order_id = order_id
        self.current_status = current_status
        message = f"Order {order_id} already processed (status: {current_status})"
        super().__init__(message)

# Usage
def process_order(order):
    if order.status != 'pending':
        raise OrderAlreadyProcessedError(order.id, order.status)

    for item in order.items:
        inventory = get_inventory(item.product_id)
        if inventory < item.quantity:
            raise InsufficientInventoryError(
                item.product_id,
                requested=item.quantity,
                available=inventory
            )

    try:
        charge_customer(order)
    except PaymentGatewayError as e:
        raise PaymentError(
            "Payment failed",
            transaction_id=e.transaction_id,
            provider_code=e.code
        )
```

---

## Exception Chaining

Preserve the original exception context:

```python
class ConfigurationError(Exception):
    """Error in configuration."""
    pass

def load_config(path):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError as e:
        raise ConfigurationError(f"Config file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise ConfigurationError(f"Invalid JSON in config: {path}") from e

try:
    config = load_config('missing.json')
except ConfigurationError as e:
    print(f"Configuration error: {e}")
    print(f"Caused by: {e.__cause__}")
```

---

## Documenting Exceptions

```python
class UserNotFoundError(Exception):
    """
    Raised when a user cannot be found in the database.

    Attributes:
        user_id: The ID that was searched for
        search_field: The field used for searching (default: 'id')

    Example:
        >>> get_user(123)
        Traceback (most recent call last):
            ...
        UserNotFoundError: User not found: id=123
    """

    def __init__(self, user_id, search_field='id'):
        self.user_id = user_id
        self.search_field = search_field
        super().__init__(f"User not found: {search_field}={user_id}")


def get_user(user_id):
    """
    Retrieve a user by ID.

    Args:
        user_id: The user's ID

    Returns:
        User object

    Raises:
        UserNotFoundError: If no user exists with the given ID
        DatabaseError: If database connection fails
    """
    user = database.find_by_id(user_id)
    if not user:
        raise UserNotFoundError(user_id)
    return user
```

---

## Best Practices

### 1. Inherit from Exception, not BaseException

```python
# Good
class MyError(Exception):
    pass

# Bad - catches KeyboardInterrupt and SystemExit
class MyError(BaseException):
    pass
```

### 2. Use Descriptive Names Ending in "Error"

```python
# Good
class InvalidConfigurationError(Exception):
    pass

# Less clear
class InvalidConfiguration(Exception):
    pass

class ConfigFailed(Exception):
    pass
```

### 3. Include Helpful Information

```python
class DatabaseConnectionError(Exception):
    def __init__(self, host, port, reason):
        self.host = host
        self.port = port
        self.reason = reason
        super().__init__(f"Cannot connect to {host}:{port} - {reason}")
```

### 4. Create an Exception Hierarchy for Your Module

```python
# mymodule/exceptions.py

class MyModuleError(Exception):
    """Base exception for mymodule."""
    pass

class ConfigError(MyModuleError):
    """Configuration errors."""
    pass

class ProcessingError(MyModuleError):
    """Processing errors."""
    pass

# Export in __init__.py
from .exceptions import MyModuleError, ConfigError, ProcessingError
```

---

## Summary

Custom exceptions improve your code by:

- Making errors domain-specific and clear
- Enabling precise exception handling
- Including relevant context for debugging
- Creating logical exception hierarchies

Key patterns:

- Inherit from `Exception`
- Add useful attributes
- Implement helpful `__str__`
- Use exception chaining with `from`
- Document what exceptions functions raise

Well-designed exceptions make your code more maintainable and errors easier to diagnose.
