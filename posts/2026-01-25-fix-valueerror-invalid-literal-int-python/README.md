# How to Fix 'ValueError: invalid literal for int()' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Debugging, Error Handling, Common Errors, Type Conversion

Description: Learn how to fix the ValueError invalid literal for int() error in Python. Understand why this happens when converting strings to integers and implement robust input validation.

---

The error `ValueError: invalid literal for int() with base 10` occurs when you try to convert a string to an integer, but the string contains characters that cannot be interpreted as a number. This guide explains common causes and provides solutions for handling this error.

## Understanding the Error

The `int()` function expects a string that represents a valid integer:

```python
# Valid conversions
print(int("42"))     # 42
print(int("-17"))    # -17
print(int("  123 "))  # 123 (whitespace is OK)

# Invalid conversions - raise ValueError
int("hello")        # ValueError: invalid literal for int() with base 10: 'hello'
int("3.14")         # ValueError: invalid literal for int() with base 10: '3.14'
int("12abc")        # ValueError: invalid literal for int() with base 10: '12abc'
int("")             # ValueError: invalid literal for int() with base 10: ''
```

## Common Causes and Solutions

### 1. User Input Contains Non-Numeric Characters

```python
# Problem: User types non-numeric input
age = input("Enter your age: ")
age_int = int(age)  # Crashes if user types "twenty"

# Solution: Validate input
age = input("Enter your age: ")

try:
    age_int = int(age)
except ValueError:
    print(f"'{age}' is not a valid number")
    age_int = None

# Better solution: Loop until valid input
while True:
    age = input("Enter your age: ")
    try:
        age_int = int(age)
        if age_int < 0:
            print("Age cannot be negative")
            continue
        break
    except ValueError:
        print("Please enter a valid number")
```

### 2. String Contains Decimal Point

```python
# Problem: String has decimal point
value = "3.14"
result = int(value)  # ValueError!

# Solution 1: Convert through float first
value = "3.14"
result = int(float(value))  # 3 (truncates)

# Solution 2: Use Decimal for precision
from decimal import Decimal, ROUND_DOWN
value = "3.99"
result = int(Decimal(value).to_integral_value(rounding=ROUND_DOWN))  # 3
```

### 3. Empty String

```python
# Problem: Empty string
value = ""
result = int(value)  # ValueError!

# Solution: Check for empty string
value = ""
if value.strip():  # Check if non-empty after stripping whitespace
    result = int(value)
else:
    result = 0  # Default value
```

### 4. String Contains Currency Symbols or Commas

```python
# Problem: Formatted numbers
price = "$1,234"
quantity = "1,000"
amount = int(price)     # ValueError!
count = int(quantity)   # ValueError!

# Solution: Clean the string first
def clean_number(s):
    """Remove common formatting from number strings."""
    # Remove currency symbols and whitespace
    cleaned = s.strip().replace("$", "").replace(",", "")
    return cleaned

price = "$1,234"
result = int(clean_number(price))  # 1234

# More robust cleaning
import re

def extract_int(s):
    """Extract integer from string, handling various formats."""
    # Remove everything except digits and minus sign
    cleaned = re.sub(r"[^\d-]", "", s)
    if cleaned and cleaned != "-":
        return int(cleaned)
    return None

print(extract_int("$1,234.56"))  # 123456 (removes decimal too)
print(extract_int("Price: 99"))   # 99
```

### 5. Reading from Files or APIs

```python
# Problem: File data may be malformed
# data.txt contains:
# 100
# 200
# invalid
# 300

with open("data.txt") as f:
    numbers = []
    for line_num, line in enumerate(f, 1):
        try:
            numbers.append(int(line.strip()))
        except ValueError:
            print(f"Warning: Line {line_num} is not a valid integer: {line.strip()!r}")

# Process valid numbers
print(f"Valid numbers: {numbers}")
```

### 6. CSV Data with Mixed Types

```python
import csv

# Problem: CSV column may contain non-integers
# data.csv:
# name,age,score
# Alice,30,95
# Bob,N/A,88
# Carol,25,N/A

def safe_int(value, default=None):
    """Safely convert to int with default for invalid values."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default

with open("data.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        age = safe_int(row["age"], default=-1)
        score = safe_int(row["score"], default=0)
        print(f"{row['name']}: age={age}, score={score}")
```

## Validation Functions

### Check if String is Integer

```python
def is_integer(s):
    """Check if string represents a valid integer."""
    try:
        int(s)
        return True
    except (ValueError, TypeError):
        return False

print(is_integer("42"))      # True
print(is_integer("-17"))     # True
print(is_integer("3.14"))    # False
print(is_integer("hello"))   # False
print(is_integer(None))      # False
```

### Parse with Validation

```python
def parse_int(value, default=0, min_val=None, max_val=None):
    """Parse integer with validation and constraints."""
    try:
        result = int(value)

        if min_val is not None and result < min_val:
            return default
        if max_val is not None and result > max_val:
            return default

        return result
    except (ValueError, TypeError):
        return default

# Examples
print(parse_int("42"))                    # 42
print(parse_int("invalid", default=-1))   # -1
print(parse_int("150", max_val=100))      # 0 (over max)
print(parse_int("-5", min_val=0))         # 0 (under min)
```

### Batch Conversion

```python
def convert_to_ints(values, on_error="skip"):
    """Convert list of values to integers.

    on_error options:
        'skip' - Skip invalid values
        'zero' - Replace with 0
        'raise' - Raise ValueError
    """
    results = []
    for v in values:
        try:
            results.append(int(v))
        except (ValueError, TypeError) as e:
            if on_error == "skip":
                continue
            elif on_error == "zero":
                results.append(0)
            elif on_error == "raise":
                raise ValueError(f"Cannot convert {v!r} to int") from e
    return results

data = ["1", "2", "invalid", "4", None, "5"]
print(convert_to_ints(data, on_error="skip"))  # [1, 2, 4, 5]
print(convert_to_ints(data, on_error="zero"))  # [1, 2, 0, 4, 0, 5]
```

## Handling Different Number Bases

```python
# int() can parse different bases
print(int("42"))        # 42 (decimal, base 10)
print(int("2A", 16))    # 42 (hexadecimal, base 16)
print(int("52", 8))     # 42 (octal, base 8)
print(int("101010", 2)) # 42 (binary, base 2)

# Auto-detect base with prefix
print(int("0x2A", 0))   # 42 (hex with 0x prefix)
print(int("0o52", 0))   # 42 (octal with 0o prefix)
print(int("0b101010", 0))  # 42 (binary with 0b prefix)

def parse_any_int(s):
    """Parse integer in any common format."""
    s = s.strip().lower()

    # Try to detect format
    try:
        if s.startswith(("0x", "-0x")):
            return int(s, 16)
        elif s.startswith(("0b", "-0b")):
            return int(s, 2)
        elif s.startswith(("0o", "-0o")):
            return int(s, 8)
        else:
            return int(s)
    except ValueError:
        return None
```

## Real World Example: Form Data Processor

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class ValidationError:
    field: str
    message: str

def process_form_data(form_data: dict) -> tuple[dict, list]:
    """Process form data with integer fields.

    Returns (cleaned_data, errors).
    """
    cleaned = {}
    errors = []

    # Required integer field
    age = form_data.get("age", "")
    if not age:
        errors.append(ValidationError("age", "Age is required"))
    else:
        try:
            age_int = int(age)
            if age_int < 0 or age_int > 150:
                errors.append(ValidationError("age", "Age must be between 0 and 150"))
            else:
                cleaned["age"] = age_int
        except ValueError:
            errors.append(ValidationError("age", "Age must be a valid number"))

    # Optional integer field with default
    quantity = form_data.get("quantity", "1")
    try:
        quantity_int = int(quantity) if quantity else 1
        if quantity_int < 1:
            errors.append(ValidationError("quantity", "Quantity must be at least 1"))
        else:
            cleaned["quantity"] = quantity_int
    except ValueError:
        errors.append(ValidationError("quantity", "Quantity must be a valid number"))

    return cleaned, errors

# Usage
form_data = {
    "age": "25",
    "quantity": "3"
}
cleaned, errors = process_form_data(form_data)

if errors:
    for e in errors:
        print(f"Error in {e.field}: {e.message}")
else:
    print(f"Valid data: {cleaned}")
```

## Summary

| Cause | Solution |
|-------|----------|
| Non-numeric string | Use try/except with ValueError |
| Decimal string | Convert through float() first |
| Empty string | Check for empty before converting |
| Formatted numbers | Clean string (remove $, commas) |
| Mixed data | Use safe conversion function |
| User input | Validate in loop until valid |

Always wrap `int()` conversion in try/except when dealing with external data like user input, files, or APIs. Never trust that input will be valid.
