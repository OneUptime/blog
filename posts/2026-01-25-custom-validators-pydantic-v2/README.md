# How to Create Custom Validators in Pydantic v2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pydantic, Validation, Data Models, FastAPI, Type Safety

Description: Learn how to create custom validators in Pydantic v2 to enforce business rules, transform data, and build robust data validation pipelines. This guide covers field validators, model validators, and advanced patterns.

---

> Pydantic v2 introduced a completely rewritten validation system that is faster and more flexible than its predecessor. Understanding how to create custom validators allows you to enforce complex business rules while keeping your code clean and maintainable.

Data validation is one of those tasks that seems simple until you have real business requirements. Email format checking? Easy. But what about validating that a discount code exists in your database, or ensuring two date fields are in the correct order? This is where custom validators shine.

---

## Understanding Pydantic v2 Validators

Pydantic v2 provides several types of validators, each suited for different use cases:

| Validator Type | Decorator | Use Case |
|---------------|-----------|----------|
| Field Validator | `@field_validator` | Validate or transform a single field |
| Model Validator | `@model_validator` | Validate relationships between fields |
| Annotated Validator | `Annotated[..., AfterValidator(...)]` | Reusable field-level validation |

---

## Basic Field Validators

Field validators let you validate and transform individual fields. The `@field_validator` decorator replaces the v1 `@validator` decorator with clearer semantics.

### Simple Value Validation

This example shows a validator that ensures a username follows specific rules. The validator runs after Pydantic's built-in type coercion.

```python
# validators.py
# Basic field validators in Pydantic v2
from pydantic import BaseModel, field_validator, ValidationError

class User(BaseModel):
    username: str
    email: str
    age: int

    @field_validator('username')
    @classmethod
    def validate_username(cls, value: str) -> str:
        """
        Validate username format and normalize it.
        Field validators receive the value after type coercion.
        """
        # Check minimum length
        if len(value) < 3:
            raise ValueError('Username must be at least 3 characters')

        # Check for valid characters
        if not value.replace('_', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, and underscores')

        # Normalize to lowercase for consistency
        return value.lower()

    @field_validator('email')
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Basic email validation with domain check"""
        # Basic format check
        if '@' not in value or '.' not in value.split('@')[-1]:
            raise ValueError('Invalid email format')

        # Block disposable email domains
        disposable_domains = {'tempmail.com', 'throwaway.com', 'mailinator.com'}
        domain = value.split('@')[-1].lower()

        if domain in disposable_domains:
            raise ValueError('Disposable email addresses are not allowed')

        return value.lower()

    @field_validator('age')
    @classmethod
    def validate_age(cls, value: int) -> int:
        """Ensure age is within reasonable bounds"""
        if value < 0:
            raise ValueError('Age cannot be negative')
        if value > 150:
            raise ValueError('Age seems unrealistic')
        return value


# Usage example
try:
    user = User(username='John_Doe', email='john@example.com', age=25)
    print(f"Created user: {user.username}")  # Output: john_doe (normalized)
except ValidationError as e:
    print(f"Validation failed: {e}")
```

### Validating Multiple Fields with One Validator

You can apply the same validator to multiple fields by passing multiple field names.

```python
# multi_field_validator.py
# Apply one validator to multiple fields
from pydantic import BaseModel, field_validator
from datetime import date

class Event(BaseModel):
    name: str
    start_date: date
    end_date: date
    description: str

    @field_validator('name', 'description')
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        """Remove leading/trailing whitespace from string fields"""
        return value.strip()

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_not_in_past(cls, value: date) -> date:
        """Ensure dates are not in the past"""
        if value < date.today():
            raise ValueError('Date cannot be in the past')
        return value
```

---

## Model Validators

Model validators run on the entire model, allowing you to validate relationships between fields. Pydantic v2 offers `before` and `after` modes for model validators.

### Validating Field Relationships

This example ensures that an end date comes after a start date. The `after` mode means the validator runs after all field validators have completed.

```python
# model_validators.py
# Cross-field validation with model validators
from pydantic import BaseModel, model_validator, field_validator
from datetime import date, timedelta
from typing import Self

class Reservation(BaseModel):
    guest_name: str
    check_in: date
    check_out: date
    room_type: str
    guests: int

    @field_validator('guests')
    @classmethod
    def validate_guest_count(cls, value: int) -> int:
        """Validate guest count is reasonable"""
        if value < 1:
            raise ValueError('At least one guest required')
        if value > 10:
            raise ValueError('Maximum 10 guests per reservation')
        return value

    @model_validator(mode='after')
    def validate_dates(self) -> Self:
        """
        Validate date relationships after all fields are set.
        Mode 'after' means we have access to the fully constructed model.
        """
        # Check that check-out is after check-in
        if self.check_out <= self.check_in:
            raise ValueError('Check-out must be after check-in')

        # Enforce maximum stay duration
        max_stay = timedelta(days=30)
        if self.check_out - self.check_in > max_stay:
            raise ValueError('Maximum stay is 30 days')

        # Validate room capacity
        room_capacity = {
            'single': 1,
            'double': 2,
            'suite': 4,
            'penthouse': 6
        }

        max_guests = room_capacity.get(self.room_type, 2)
        if self.guests > max_guests:
            raise ValueError(
                f'{self.room_type.title()} room accommodates max {max_guests} guests'
            )

        return self


# Usage
reservation = Reservation(
    guest_name='Alice Smith',
    check_in=date(2026, 2, 1),
    check_out=date(2026, 2, 5),
    room_type='double',
    guests=2
)
print(f"Reservation for {reservation.guests} guests confirmed")
```

### Before Mode Validators

Before validators run before Pydantic does any type coercion. This is useful for preprocessing raw input data.

```python
# before_validators.py
# Pre-processing data before validation
from pydantic import BaseModel, model_validator
from typing import Any

class FlexibleConfig(BaseModel):
    """
    A config model that accepts various input formats.
    Before validators normalize the input before standard validation.
    """
    host: str
    port: int
    debug: bool

    @model_validator(mode='before')
    @classmethod
    def preprocess_input(cls, data: Any) -> dict:
        """
        Normalize input data before field validation.
        Mode 'before' receives raw input data.
        """
        # Handle case where data might be a string (JSON-like)
        if isinstance(data, str):
            # Simple key=value format parsing
            result = {}
            for pair in data.split(','):
                key, value = pair.split('=')
                result[key.strip()] = value.strip()
            return result

        # Handle environment variable style input
        if isinstance(data, dict):
            normalized = {}
            for key, value in data.items():
                # Convert env var style (APP_HOST) to model field (host)
                clean_key = key.lower().replace('app_', '')
                normalized[clean_key] = value
            return normalized

        return data


# Both of these work now
config1 = FlexibleConfig(host='localhost', port=8080, debug=True)
config2 = FlexibleConfig(**{'APP_HOST': 'localhost', 'APP_PORT': 8080, 'APP_DEBUG': True})
```

---

## Reusable Validators with Annotated Types

Pydantic v2 encourages using `Annotated` types for reusable validation logic. This approach is cleaner than repeating validators across models.

```python
# annotated_validators.py
# Create reusable validators using Annotated types
from typing import Annotated
from pydantic import BaseModel, AfterValidator, BeforeValidator, Field
import re

# Define reusable validation functions
def normalize_phone(value: str) -> str:
    """Remove all non-digit characters from phone number"""
    digits = re.sub(r'\D', '', value)
    if len(digits) == 10:
        return f"+1{digits}"  # Add US country code
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    else:
        raise ValueError('Phone must be 10 digits (or 11 with country code)')

def validate_phone_format(value: str) -> str:
    """Ensure phone is in expected format after normalization"""
    if not value.startswith('+'):
        raise ValueError('Phone must start with country code')
    return value

def capitalize_name(value: str) -> str:
    """Capitalize each word in a name"""
    return ' '.join(word.capitalize() for word in value.split())

def validate_non_empty(value: str) -> str:
    """Ensure string is not empty or whitespace"""
    if not value or not value.strip():
        raise ValueError('Field cannot be empty')
    return value.strip()

# Create reusable annotated types
# BeforeValidator runs before type coercion
# AfterValidator runs after type coercion
PhoneNumber = Annotated[
    str,
    BeforeValidator(normalize_phone),  # Clean up input first
    AfterValidator(validate_phone_format)  # Verify final format
]

PersonName = Annotated[
    str,
    BeforeValidator(validate_non_empty),  # Check not empty
    AfterValidator(capitalize_name)  # Normalize capitalization
]

# Use annotated types in multiple models
class Customer(BaseModel):
    name: PersonName
    phone: PhoneNumber
    email: str

class Employee(BaseModel):
    name: PersonName
    phone: PhoneNumber
    department: str

class Contact(BaseModel):
    name: PersonName
    phone: PhoneNumber
    company: str


# All models now share the same validation logic
customer = Customer(
    name='john doe',
    phone='555-123-4567',
    email='john@example.com'
)
print(f"Customer: {customer.name}, Phone: {customer.phone}")
# Output: Customer: John Doe, Phone: +15551234567
```

---

## Async Validators

When your validation requires async operations (like database lookups), you need a different approach since Pydantic validators are synchronous.

```python
# async_validation.py
# Pattern for async validation with Pydantic models
from pydantic import BaseModel, field_validator
from typing import Optional
import asyncio

class Order(BaseModel):
    """
    Order model with deferred async validation.
    Pydantic validators are sync, so we validate in two steps.
    """
    product_id: str
    quantity: int
    customer_id: str
    discount_code: Optional[str] = None

    # Sync validation happens here
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, value: int) -> int:
        if value < 1:
            raise ValueError('Quantity must be at least 1')
        if value > 100:
            raise ValueError('Maximum quantity is 100 per order')
        return value


class OrderValidator:
    """
    Separate validator class for async business rule validation.
    Call this after Pydantic validation.
    """

    def __init__(self, db_connection):
        self.db = db_connection

    async def validate(self, order: Order) -> Order:
        """Run all async validations and return validated order"""
        # Check product exists and is in stock
        await self._validate_product(order.product_id, order.quantity)

        # Check customer exists and can place orders
        await self._validate_customer(order.customer_id)

        # Validate discount code if provided
        if order.discount_code:
            await self._validate_discount(order.discount_code)

        return order

    async def _validate_product(self, product_id: str, quantity: int):
        """Verify product exists and has sufficient stock"""
        product = await self.db.fetch_one(
            "SELECT id, stock FROM products WHERE id = $1",
            product_id
        )

        if not product:
            raise ValueError(f'Product {product_id} not found')

        if product['stock'] < quantity:
            raise ValueError(f'Insufficient stock. Available: {product["stock"]}')

    async def _validate_customer(self, customer_id: str):
        """Verify customer exists and is not blocked"""
        customer = await self.db.fetch_one(
            "SELECT id, status FROM customers WHERE id = $1",
            customer_id
        )

        if not customer:
            raise ValueError(f'Customer {customer_id} not found')

        if customer['status'] == 'blocked':
            raise ValueError('Customer account is blocked')

    async def _validate_discount(self, code: str):
        """Verify discount code is valid and not expired"""
        discount = await self.db.fetch_one(
            "SELECT code, expires_at FROM discounts WHERE code = $1",
            code
        )

        if not discount:
            raise ValueError(f'Invalid discount code: {code}')


# Usage pattern
async def create_order(data: dict, db) -> Order:
    # Step 1: Pydantic validation (sync)
    order = Order(**data)

    # Step 2: Async business validation
    validator = OrderValidator(db)
    validated_order = await validator.validate(order)

    return validated_order
```

---

## Custom Validation Error Messages

Pydantic v2 allows customizing error messages for better user feedback.

```python
# custom_errors.py
# Custom error messages and error types
from pydantic import BaseModel, field_validator, ValidationError
from pydantic_core import PydanticCustomError

class Registration(BaseModel):
    username: str
    password: str
    confirm_password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Validate password meets security requirements"""
        errors = []

        if len(value) < 8:
            errors.append('at least 8 characters')
        if not any(c.isupper() for c in value):
            errors.append('one uppercase letter')
        if not any(c.islower() for c in value):
            errors.append('one lowercase letter')
        if not any(c.isdigit() for c in value):
            errors.append('one digit')

        if errors:
            # Create a custom error with specific type and message
            raise PydanticCustomError(
                'password_strength',  # Error type for programmatic handling
                'Password must contain: {requirements}',  # Message template
                {'requirements': ', '.join(errors)}  # Context variables
            )

        return value

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        """Ensure confirmation matches password"""
        # Access other field values via info.data
        password = info.data.get('password')

        if password and value != password:
            raise PydanticCustomError(
                'password_mismatch',
                'Passwords do not match'
            )

        return value


# Handle validation errors
try:
    reg = Registration(
        username='newuser',
        password='weak',
        confirm_password='weak'
    )
except ValidationError as e:
    for error in e.errors():
        print(f"Field: {error['loc'][0]}")
        print(f"Type: {error['type']}")
        print(f"Message: {error['msg']}")
```

---

## Conditional Validation

Sometimes validation rules depend on other field values. Here is how to implement conditional logic.

```python
# conditional_validation.py
# Validation rules that depend on other fields
from pydantic import BaseModel, model_validator
from typing import Optional, Literal, Self
from datetime import date

class Payment(BaseModel):
    """
    Payment model with conditional validation based on payment method.
    Different payment types require different fields.
    """
    amount: float
    currency: str
    method: Literal['credit_card', 'bank_transfer', 'paypal']

    # Credit card fields (required if method is credit_card)
    card_number: Optional[str] = None
    card_expiry: Optional[str] = None
    card_cvv: Optional[str] = None

    # Bank transfer fields (required if method is bank_transfer)
    bank_account: Optional[str] = None
    routing_number: Optional[str] = None

    # PayPal fields (required if method is paypal)
    paypal_email: Optional[str] = None

    @model_validator(mode='after')
    def validate_payment_method_fields(self) -> Self:
        """Validate that required fields are present based on payment method"""

        if self.method == 'credit_card':
            # All card fields are required
            missing = []
            if not self.card_number:
                missing.append('card_number')
            if not self.card_expiry:
                missing.append('card_expiry')
            if not self.card_cvv:
                missing.append('card_cvv')

            if missing:
                raise ValueError(
                    f'Credit card payment requires: {", ".join(missing)}'
                )

            # Validate card number format (simple Luhn check)
            if not self._is_valid_card_number(self.card_number):
                raise ValueError('Invalid card number')

        elif self.method == 'bank_transfer':
            if not self.bank_account or not self.routing_number:
                raise ValueError(
                    'Bank transfer requires bank_account and routing_number'
                )

        elif self.method == 'paypal':
            if not self.paypal_email:
                raise ValueError('PayPal payment requires paypal_email')
            if '@' not in self.paypal_email:
                raise ValueError('Invalid PayPal email format')

        return self

    def _is_valid_card_number(self, number: str) -> bool:
        """Simple card number validation using Luhn algorithm"""
        digits = [int(d) for d in number if d.isdigit()]
        if len(digits) < 13 or len(digits) > 19:
            return False

        # Luhn checksum
        checksum = 0
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit

        return checksum % 10 == 0
```

---

## Best Practices

1. **Keep validators focused** - Each validator should do one thing well
2. **Use Annotated types** - For reusable validation logic across models
3. **Prefer model validators for cross-field validation** - Use field validators only for single-field rules
4. **Return the value** - Validators must return the (possibly transformed) value
5. **Use meaningful error messages** - Help users understand what went wrong
6. **Separate sync and async validation** - Pydantic is sync; use a separate layer for async

---

## Conclusion

Pydantic v2 validators give you the tools to enforce any validation rule your application needs. Field validators handle single-field transformations and checks, while model validators handle cross-field business rules. The Annotated type pattern makes validators reusable across your codebase.

The key is understanding when to use each type: field validators for individual field rules, model validators for relationships between fields, and separate async validators when you need to check external systems.

---

*Want to monitor validation errors in your Python applications? [OneUptime](https://oneuptime.com) provides comprehensive error tracking and alerting for production systems.*

**Related Reading:**
- [How to Build a Data Validation Framework in Python](https://oneuptime.com/blog/post/2026-01-25-data-validation-framework-python/view)
- [How to Build Health Checks and Readiness Probes in Python](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
