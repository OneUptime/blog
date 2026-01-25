# How to Use f-strings for String Formatting in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Strings, f-strings, Formatting, String Interpolation

Description: Master Python f-strings for clean, readable string formatting. Learn formatting specifications, expressions, alignment, and advanced techniques for producing well-formatted output.

---

F-strings, introduced in Python 3.6, are the most readable and efficient way to format strings in Python. They allow you to embed expressions directly inside string literals, making your code cleaner and easier to understand.

## Basic f-string Syntax

An f-string starts with `f` or `F` before the opening quote. Variables and expressions go inside curly braces:

```python
name = "Alice"
age = 30

# Basic variable interpolation
greeting = f"Hello, {name}!"
print(greeting)  # Hello, Alice!

# Multiple variables
message = f"{name} is {age} years old."
print(message)  # Alice is 30 years old.

# Works with all quote styles
single = f'Single quotes: {name}'
double = f"Double quotes: {name}"
triple = f"""Triple quotes: {name}"""
```

## Expressions in f-strings

F-strings can contain any valid Python expression:

```python
x = 10
y = 5

# Arithmetic operations
print(f"{x} + {y} = {x + y}")  # 10 + 5 = 15
print(f"{x} * {y} = {x * y}")  # 10 * 5 = 50

# Method calls
name = "alice"
print(f"Name: {name.upper()}")  # Name: ALICE

# Function calls
numbers = [1, 2, 3, 4, 5]
print(f"Sum: {sum(numbers)}")  # Sum: 15
print(f"Length: {len(numbers)}")  # Length: 5

# Conditional expressions
status = "adult" if age >= 18 else "minor"
print(f"{name} is an {status}")  # Alice is an adult
```

## Number Formatting

F-strings provide powerful number formatting options:

```python
# Integer formatting
num = 42
print(f"Binary: {num:b}")   # Binary: 101010
print(f"Octal: {num:o}")    # Octal: 52
print(f"Hex: {num:x}")      # Hex: 2a
print(f"Hex upper: {num:X}")  # Hex upper: 2A

# Padding with zeros
print(f"Padded: {num:05d}")  # Padded: 00042

# Float formatting
pi = 3.14159265359

print(f"Default: {pi}")       # Default: 3.14159265359
print(f"2 decimals: {pi:.2f}")  # 2 decimals: 3.14
print(f"5 decimals: {pi:.5f}")  # 5 decimals: 3.14159

# Scientific notation
large = 1234567890
print(f"Scientific: {large:e}")   # Scientific: 1.234568e+09
print(f"Scientific: {large:.2e}")  # Scientific: 1.23e+09

# Percentage
ratio = 0.756
print(f"Percentage: {ratio:.1%}")  # Percentage: 75.6%
```

## Thousands Separators

```python
population = 7900000000

# Comma separator
print(f"Population: {population:,}")  # Population: 7,900,000,000

# Underscore separator (Python 3.6+)
print(f"Population: {population:_}")  # Population: 7_900_000_000

# Combined with decimals
gdp = 21427000000000.50
print(f"GDP: ${gdp:,.2f}")  # GDP: $21,427,000,000,000.50
```

## String Alignment and Padding

```python
text = "Python"

# Minimum width with alignment
print(f"|{text:10}|")   # |Python    | (left, default for strings)
print(f"|{text:<10}|")  # |Python    | (left)
print(f"|{text:>10}|")  # |    Python| (right)
print(f"|{text:^10}|")  # |  Python  | (center)

# Custom fill character
print(f"|{text:*<10}|")  # |Python****|
print(f"|{text:*>10}|")  # |****Python|
print(f"|{text:*^10}|")  # |**Python**|

# Numbers are right-aligned by default
num = 42
print(f"|{num:10}|")   # |        42|
print(f"|{num:<10}|")  # |42        |
```

## Working with Dictionaries and Objects

```python
# Dictionary access
person = {"name": "Bob", "age": 25}
print(f"{person['name']} is {person['age']}")  # Bob is 25

# Object attributes
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(10, 20)
print(f"Point: ({p.x}, {p.y})")  # Point: (10, 20)

# List indexing
colors = ["red", "green", "blue"]
print(f"First color: {colors[0]}")  # First color: red
```

## Date and Time Formatting

```python
from datetime import datetime, date

now = datetime.now()

# Default format
print(f"Now: {now}")  # Now: 2026-01-25 14:30:00.123456

# Custom date/time formatting
print(f"Date: {now:%Y-%m-%d}")  # Date: 2026-01-25
print(f"Time: {now:%H:%M:%S}")  # Time: 14:30:00
print(f"Full: {now:%B %d, %Y}")  # Full: January 25, 2026

# Common format specifiers
# %Y - 4-digit year
# %m - 2-digit month
# %d - 2-digit day
# %H - 24-hour hour
# %M - minute
# %S - second
# %B - full month name
# %A - full weekday name

print(f"Day: {now:%A}")  # Day: Saturday
```

## Debugging with f-strings (Python 3.8+)

The `=` specifier shows both the expression and its value:

```python
x = 10
y = 20

# Self-documenting expressions
print(f"{x=}")  # x=10
print(f"{y=}")  # y=20
print(f"{x + y=}")  # x + y=30

# Works with formatting
print(f"{x=:05d}")  # x=00010

# Great for debugging
name = "Alice"
print(f"{name.upper()=}")  # name.upper()='ALICE'
```

## Escaping Braces and Special Characters

```python
# Escape braces by doubling them
print(f"{{curly braces}}")  # {curly braces}

# Backslashes in f-strings (no backslash in expression)
newline = "\n"
print(f"Line1{newline}Line2")

# For complex expressions, use a variable
path = "C:\\Users\\name"
print(f"Path: {path}")  # Path: C:\Users\name
```

## Multiline f-strings

```python
name = "Alice"
age = 30
city = "New York"

# Using triple quotes
message = f"""
User Profile
------------
Name: {name}
Age: {age}
City: {city}
"""
print(message)

# Concatenating f-strings
message = (
    f"Name: {name}\n"
    f"Age: {age}\n"
    f"City: {city}"
)
print(message)
```

## Building Tables with f-strings

```python
# Create aligned table
data = [
    ("Alice", 30, "Engineer"),
    ("Bob", 25, "Designer"),
    ("Charlie", 35, "Manager"),
]

# Print header
print(f"{'Name':<10} {'Age':>5} {'Role':<15}")
print("-" * 32)

# Print rows
for name, age, role in data:
    print(f"{name:<10} {age:>5} {role:<15}")

# Output:
# Name        Age Role
# --------------------------------
# Alice        30 Engineer
# Bob          25 Designer
# Charlie      35 Manager
```

## Real World Example: Log Formatter

```python
from datetime import datetime

def log(level, message, **context):
    """Format log message with context."""
    timestamp = datetime.now()

    # Format context as key=value pairs
    ctx_str = " ".join(f"{k}={v}" for k, v in context.items())

    return f"[{timestamp:%Y-%m-%d %H:%M:%S}] {level:8} | {message} | {ctx_str}"

# Usage
print(log("INFO", "User logged in", user_id=123, ip="192.168.1.1"))
# [2026-01-25 14:30:00] INFO     | User logged in | user_id=123 ip=192.168.1.1

print(log("ERROR", "Connection failed", host="db.example.com", port=5432))
# [2026-01-25 14:30:00] ERROR    | Connection failed | host=db.example.com port=5432
```

## Comparison with Other Methods

```python
name = "Alice"
age = 30

# f-string (preferred)
s1 = f"{name} is {age} years old"

# str.format()
s2 = "{} is {} years old".format(name, age)
s3 = "{name} is {age} years old".format(name=name, age=age)

# % formatting (old style)
s4 = "%s is %d years old" % (name, age)

# String concatenation (avoid)
s5 = name + " is " + str(age) + " years old"

# All produce: "Alice is 30 years old"
```

## Summary

| Format Spec | Description | Example |
|-------------|-------------|---------|
| `{x:.2f}` | 2 decimal places | `3.14` |
| `{x:,}` | Thousands separator | `1,000,000` |
| `{x:10}` | Minimum width 10 | `        42` |
| `{x:<10}` | Left align | `42        ` |
| `{x:>10}` | Right align | `        42` |
| `{x:^10}` | Center align | `    42    ` |
| `{x:05d}` | Zero-padded | `00042` |
| `{x:.1%}` | Percentage | `75.0%` |
| `{x=}` | Debug format | `x=42` |

F-strings are the recommended way to format strings in Python. They are faster than other methods, more readable, and support powerful formatting options. Use them in all your new Python code.
