# How to Fix 'IndentationError' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IndentationError, Debugging, Syntax Errors, Code Style

Description: Understand and fix Python IndentationError messages. Learn about consistent indentation, common causes, and tools to prevent these errors.

---

> Python uses indentation to define code blocks, making it unique among popular languages. While this leads to clean, readable code, it also means whitespace errors can break your program. This guide helps you understand and fix indentation errors quickly.

Unlike languages that use braces for blocks, Python relies on consistent indentation. An IndentationError means Python found unexpected or inconsistent whitespace. The fix is usually simple once you understand what Python expects.

---

## Understanding Python Indentation

```python
# Python uses indentation for code blocks
def greet(name):
    # This is indented - part of the function
    message = f"Hello, {name}!"
    return message
# This is not indented - outside the function

# Each nested block needs another level of indentation
for i in range(3):
    if i > 0:
        print(i)  # Two levels of indentation
```

---

## Common IndentationError Messages

### "expected an indented block"

```python
# WRONG: Missing indentation after colon
def greet(name):
print("Hello")  # IndentationError!

# CORRECT: Add indentation
def greet(name):
    print("Hello")

# WRONG: Empty block
if condition:
# IndentationError: expected an indented block

# CORRECT: Use pass for empty blocks
if condition:
    pass
```

### "unexpected indent"

```python
# WRONG: Random indentation
x = 5
    y = 10  # IndentationError: unexpected indent

# CORRECT: Consistent indentation
x = 5
y = 10

# WRONG: Extra indentation in block
def example():
    x = 1
        y = 2  # IndentationError: unexpected indent

# CORRECT: Same indentation level
def example():
    x = 1
    y = 2
```

### "unindent does not match any outer indentation level"

```python
# WRONG: Inconsistent dedent
def example():
    if True:
        x = 1
      y = 2  # IndentationError: unindent does not match

# CORRECT: Match previous level exactly
def example():
    if True:
        x = 1
    y = 2  # Back to function level
```

---

## Tabs vs Spaces

The most common cause of confusing indentation errors is mixing tabs and spaces.

### The Problem

```python
# This might look correct but uses mixed tabs/spaces
def example():
    x = 1    # Uses spaces
	y = 2    # Uses tab - IndentationError!
```

### The Solution

```python
# Use spaces consistently (PEP 8 recommends 4 spaces)
def example():
    x = 1    # 4 spaces
    y = 2    # 4 spaces
```

### Detecting Mixed Tabs and Spaces

```bash
# In terminal, show whitespace characters
cat -A script.py
# Tabs show as ^I, spaces show as dots or nothing

# Python's tabnanny module
python -m tabnanny script.py
# Reports inconsistent use of tabs and spaces
```

### Configure Your Editor

Most editors can be configured to:
1. Use spaces instead of tabs
2. Show whitespace characters
3. Convert tabs to spaces

**VS Code settings.json:**
```json
{
    "editor.insertSpaces": true,
    "editor.tabSize": 4,
    "editor.detectIndentation": false,
    "editor.renderWhitespace": "all"
}
```

---

## Fixing IndentationError in Common Scenarios

### After Copying Code

```python
# Pasted code often has wrong indentation
def my_function():
    # Existing code
def pasted_function():  # Error if this was meant to be inside

# Fix: Check if pasted code should be indented
def my_function():
    # Existing code
    def nested_function():  # Now properly indented
        pass
```

### Multi-line Statements

```python
# WRONG: Inconsistent continuation indentation
result = some_long_function_name(
    arg1,
  arg2,  # Different indentation
        arg3  # Another different level
)

# CORRECT: Consistent continuation
result = some_long_function_name(
    arg1,
    arg2,
    arg3
)

# Alternative: Align with opening parenthesis
result = some_long_function_name(arg1,
                                  arg2,
                                  arg3)
```

### List, Dict, and Function Arguments

```python
# CORRECT: Items aligned
my_list = [
    "item1",
    "item2",
    "item3",
]

my_dict = {
    "key1": "value1",
    "key2": "value2",
}

def function_with_many_args(
    arg1,
    arg2,
    arg3,
):
    pass
```

### Conditional Statements

```python
# CORRECT: Body indented
if condition1 and condition2:
    do_something()

# Multi-line conditions
if (condition1 and
    condition2 and
    condition3):
    do_something()

# Or with extra indentation for clarity
if (condition1 and
        condition2 and
        condition3):
    do_something()
```

---

## Tools for Prevention

### autopep8

```bash
# Install
pip install autopep8

# Fix indentation automatically
autopep8 --in-place --aggressive script.py
```

### black

```bash
# Install
pip install black

# Format code (opinionated)
black script.py
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
```

---

## Debugging Indentation Issues

### Show Whitespace in Your Editor

Most editors have options to display whitespace:
- Spaces as dots: `....`
- Tabs as arrows: `---->`

### Use Python's -tt Flag

```bash
# Python 3 errors on mixed tabs/spaces by default
# Python 2 needed -tt flag
python -tt script.py
```

### Check Character by Character

```python
# Print the actual characters in a line
line = "    def example():"
for char in line:
    print(f"'{char}' = {ord(char)}")
# Space is 32, tab is 9
```

### Find the Problem Line

```python
# IndentationError gives you the line number
# File "script.py", line 42
#     y = 2
#     ^
# IndentationError: unexpected indent

# Go to line 42 and check:
# 1. Is it using tabs or spaces?
# 2. Does it match the line above?
# 3. Is the previous line complete?
```

---

## Special Cases

### Comments and Empty Lines

```python
# Comments must follow indentation rules within blocks
def example():
    x = 1
    # This comment is fine
    y = 2

# But this causes no error (comments outside function)
```

### Triple-Quoted Strings

```python
# The content of triple quotes is literal
# so this is NOT an indentation error
def example():
    message = """
This text starts at column 0
    but that's fine inside triple quotes
"""
    return message
```

### Pass, Ellipsis, and Docstrings

```python
# Use pass for empty blocks
class EmptyClass:
    pass

# Use ellipsis in protocols
class MyProtocol(Protocol):
    def method(self) -> None: ...

# Docstrings count as the body
def documented():
    """This function does nothing but has a docstring."""
```

---

## PEP 8 Guidelines

Python's style guide (PEP 8) recommends:

1. **Use 4 spaces per indentation level**
2. **Spaces are preferred over tabs**
3. **Never mix tabs and spaces**
4. **Continuation lines should align with opening delimiter or use hanging indent**

```python
# PEP 8 compliant indentation

# Aligned with opening delimiter
foo = long_function_name(var_one, var_two,
                         var_three, var_four)

# Hanging indent should add a level
def long_function_name(
        var_one, var_two, var_three,
        var_four):
    print(var_one)

# The closing brace can be at different positions
my_list = [
    1, 2, 3,
    4, 5, 6,
]  # At first column of last line

my_list = [
    1, 2, 3,
    4, 5, 6,
    ]  # Or lined up under first character
```

---

## Quick Fixes

### Fix Mixed Indentation

```bash
# Convert all tabs to spaces with sed
sed -i 's/\t/    /g' script.py

# Or use Python
python -c "
import sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
content = content.replace('\t', '    ')
with open(sys.argv[1], 'w') as f:
    f.write(content)
" script.py
```

### Find Indentation Issues

```bash
# Use flake8 to find issues
pip install flake8
flake8 --select=E1,W1 script.py

# E101: indentation contains mixed spaces and tabs
# E111: indentation is not a multiple of four
# W191: indentation contains tabs
```

---

## Summary

IndentationError fixes:

1. **Check for mixing tabs and spaces** - use one consistently (prefer spaces)
2. **Verify indentation after colons** - blocks need to be indented
3. **Match indentation levels exactly** - use your editor's whitespace display
4. **Use code formatters** - black or autopep8 fix issues automatically

Configure your editor to:
- Insert spaces instead of tabs
- Use 4 spaces per indent level
- Show whitespace characters
- Run a linter on save

Remember: Python's indentation rules make code readable. Once you set up your editor correctly, these errors become rare.
