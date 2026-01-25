# How to Read User Input as Numbers in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Input, User Input, Type Conversion, Beginners

Description: Learn the correct way to read numeric input from users in Python, handle conversion errors, and validate input for robust command-line programs.

---

Python's `input()` function always returns a string, even when the user types a number. This catches many beginners off guard when their arithmetic operations fail or produce unexpected results. This guide covers how to properly convert user input to integers and floats, handle errors gracefully, and validate input.

## The Problem

When you read input with `input()`, you get a string regardless of what the user types.

```python
# This does not work as expected
age = input("Enter your age: ")
print(type(age))  # <class 'str'>

# String concatenation, not addition
next_year = age + 1  # TypeError: can only concatenate str (not "int") to str
```

Even if the user types "25", Python sees the string `"25"`, not the integer `25`.

```python
# String multiplication produces repetition, not math
x = input("Enter a number: ")  # User types: 5
result = x * 3
print(result)  # "555" (string repeated 3 times)
```

## Basic Conversion with int() and float()

The simplest fix is to wrap `input()` with `int()` or `float()`.

```python
# Convert to integer
age = int(input("Enter your age: "))
print(type(age))  # <class 'int'>

next_year_age = age + 1
print(f"Next year you'll be {next_year_age}")

# Convert to float for decimal numbers
price = float(input("Enter the price: "))
tax = price * 0.08
print(f"Tax: ${tax:.2f}")
```

## Handling Invalid Input

Users make mistakes. If someone types "twenty" instead of "20", your program crashes with a `ValueError`. Always handle this possibility.

```python
# Basic error handling
try:
    age = int(input("Enter your age: "))
    print(f"You are {age} years old")
except ValueError:
    print("Please enter a valid number")
```

### Retry Loop Until Valid

A better user experience keeps asking until valid input is provided.

```python
def get_integer(prompt):
    """Keep asking until the user enters a valid integer."""
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            print("Invalid input. Please enter a whole number.")

# Usage
age = get_integer("Enter your age: ")
print(f"You are {age} years old")
```

### Reusable Input Functions

Create utility functions for common input patterns.

```python
def get_int(prompt, min_value=None, max_value=None):
    """Get an integer with optional range validation.

    Args:
        prompt: The message to display
        min_value: Minimum acceptable value (inclusive)
        max_value: Maximum acceptable value (inclusive)

    Returns:
        Valid integer within the specified range
    """
    while True:
        try:
            value = int(input(prompt))

            if min_value is not None and value < min_value:
                print(f"Value must be at least {min_value}")
                continue

            if max_value is not None and value > max_value:
                print(f"Value must be at most {max_value}")
                continue

            return value

        except ValueError:
            print("Please enter a valid whole number")

def get_float(prompt, min_value=None, max_value=None):
    """Get a float with optional range validation."""
    while True:
        try:
            value = float(input(prompt))

            if min_value is not None and value < min_value:
                print(f"Value must be at least {min_value}")
                continue

            if max_value is not None and value > max_value:
                print(f"Value must be at most {max_value}")
                continue

            return value

        except ValueError:
            print("Please enter a valid number")

# Usage examples
age = get_int("Enter your age: ", min_value=0, max_value=150)
temperature = get_float("Enter temperature: ", min_value=-273.15)  # Absolute zero
rating = get_int("Rate 1-5: ", min_value=1, max_value=5)
```

## Reading Multiple Numbers

### Space-Separated Numbers

```python
# Read multiple numbers from one line
user_input = input("Enter three numbers separated by spaces: ")
# User types: 10 20 30

# Split and convert each part
numbers = [int(x) for x in user_input.split()]
print(numbers)  # [10, 20, 30]

# With error handling
def get_numbers(prompt, count=None):
    """Read multiple integers from a single line.

    Args:
        prompt: The message to display
        count: Expected number of values (None for any amount)
    """
    while True:
        try:
            user_input = input(prompt)
            numbers = [int(x) for x in user_input.split()]

            if count is not None and len(numbers) != count:
                print(f"Please enter exactly {count} numbers")
                continue

            return numbers

        except ValueError:
            print("Invalid input. Enter numbers separated by spaces.")

# Usage
x, y, z = get_numbers("Enter x, y, z coordinates: ", count=3)
```

### Comma-Separated Numbers

```python
# Read comma-separated values
user_input = input("Enter numbers separated by commas: ")
# User types: 10, 20, 30

# Split on comma and strip whitespace
numbers = [int(x.strip()) for x in user_input.split(',')]
print(numbers)  # [10, 20, 30]
```

### Reading Numbers Until a Sentinel

```python
def read_numbers_until_done():
    """Read numbers one per line until user types 'done'."""
    numbers = []
    print("Enter numbers one per line (type 'done' to finish):")

    while True:
        user_input = input("> ")

        if user_input.lower() == 'done':
            break

        try:
            numbers.append(int(user_input))
        except ValueError:
            print("Invalid number, try again")

    return numbers

# Usage
nums = read_numbers_until_done()
print(f"You entered {len(nums)} numbers")
print(f"Sum: {sum(nums)}")
```

## Handling Special Number Formats

### Negative Numbers

The basic `int()` conversion handles negative numbers automatically.

```python
value = int(input("Enter a number (can be negative): "))
# User types: -42
print(value)  # -42
```

### Numbers with Commas

Users might enter "1,000" for one thousand. Handle this by removing commas.

```python
def parse_formatted_number(text):
    """Parse a number that might have formatting (commas, spaces)."""
    # Remove commas and spaces
    cleaned = text.replace(',', '').replace(' ', '')
    return int(cleaned)

user_input = input("Enter a number: ")  # User types: 1,000,000
value = parse_formatted_number(user_input)
print(value)  # 1000000
```

### Binary, Octal, and Hexadecimal

```python
# Binary input (base 2)
binary_str = input("Enter a binary number: ")  # User types: 1010
decimal_value = int(binary_str, 2)
print(decimal_value)  # 10

# Hexadecimal input (base 16)
hex_str = input("Enter a hex number: ")  # User types: FF
decimal_value = int(hex_str, 16)
print(decimal_value)  # 255

# Octal input (base 8)
octal_str = input("Enter an octal number: ")  # User types: 77
decimal_value = int(octal_str, 8)
print(decimal_value)  # 63
```

## Complete Example: Calculator Program

Here is a practical example combining these concepts.

```python
def get_number(prompt):
    """Get a number (int or float) from user input."""
    while True:
        user_input = input(prompt).strip()

        if not user_input:
            print("Please enter a number")
            continue

        try:
            # Try integer first
            if '.' not in user_input:
                return int(user_input)
            else:
                return float(user_input)
        except ValueError:
            print(f"'{user_input}' is not a valid number")

def get_operator():
    """Get a valid operator from user input."""
    valid_operators = ['+', '-', '*', '/', '//', '%', '**']

    while True:
        op = input("Enter operator (+, -, *, /, //, %, **): ").strip()
        if op in valid_operators:
            return op
        print(f"Invalid operator. Choose from: {', '.join(valid_operators)}")

def calculate(a, op, b):
    """Perform calculation and handle errors."""
    operations = {
        '+': lambda x, y: x + y,
        '-': lambda x, y: x - y,
        '*': lambda x, y: x * y,
        '/': lambda x, y: x / y,
        '//': lambda x, y: x // y,
        '%': lambda x, y: x % y,
        '**': lambda x, y: x ** y,
    }

    try:
        return operations[op](a, b)
    except ZeroDivisionError:
        return "Error: Division by zero"

def main():
    """Simple calculator program."""
    print("Simple Calculator")
    print("-" * 20)

    while True:
        num1 = get_number("Enter first number: ")
        op = get_operator()
        num2 = get_number("Enter second number: ")

        result = calculate(num1, op, num2)
        print(f"\n{num1} {op} {num2} = {result}\n")

        again = input("Calculate again? (y/n): ").strip().lower()
        if again != 'y':
            break

    print("Goodbye!")

if __name__ == "__main__":
    main()
```

## Summary

Reading numeric input in Python requires explicit conversion from the string returned by `input()`. Key takeaways:

- `input()` always returns a string
- Use `int()` for whole numbers, `float()` for decimals
- Wrap conversions in try/except to handle invalid input
- Create reusable helper functions for common patterns
- Consider range validation for bounded inputs
- Handle special formats (commas, different bases) when needed

With these patterns, your command-line programs will handle user input gracefully and provide a better user experience.
