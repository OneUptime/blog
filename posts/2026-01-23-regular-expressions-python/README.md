# How to Use Regular Expressions in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Regex, Regular Expressions, Text Processing, Pattern Matching

Description: Master Python's re module for pattern matching, text extraction, and validation. Learn regex syntax with practical examples for common tasks.

---

> Regular expressions are a powerful tool for text processing, but they can seem cryptic at first. This guide breaks down Python's re module with clear examples, from basic pattern matching to advanced text manipulation.

Regular expressions (regex) describe patterns in text. Python's `re` module provides functions to search, match, and manipulate strings using these patterns. Learning regex opens up efficient solutions to many text processing problems.

---

## Basic Pattern Matching

### Using re.search()

```python
import re

text = "Contact us at support@example.com for help"

# Search for a pattern
match = re.search(r'support@\w+\.com', text)

if match:
    print(f"Found: {match.group()}")  # support@example.com
    print(f"Position: {match.start()}-{match.end()}")  # 14-34
```

### Using re.match()

`match()` only matches at the beginning of the string:

```python
text = "Python is great"

# match() checks from the start
result = re.match(r'Python', text)
print(result.group() if result else "No match")  # Python

# This fails because "is" is not at the start
result = re.match(r'is', text)
print(result)  # None
```

### Using re.findall()

Find all occurrences:

```python
text = "Prices: $10, $25, $99, and $150"

# Find all prices
prices = re.findall(r'\$\d+', text)
print(prices)  # ['$10', '$25', '$99', '$150']

# With groups, returns tuples
pattern = r'(\w+)@(\w+)\.(\w+)'
text = "Emails: alice@gmail.com, bob@yahoo.com"
matches = re.findall(pattern, text)
print(matches)  # [('alice', 'gmail', 'com'), ('bob', 'yahoo', 'com')]
```

---

## Essential Regex Syntax

### Character Classes

```python
import re

# \d - digit [0-9]
re.findall(r'\d+', "abc123def456")  # ['123', '456']

# \w - word character [a-zA-Z0-9_]
re.findall(r'\w+', "hello_world 123")  # ['hello_world', '123']

# \s - whitespace [ \t\n\r\f\v]
re.split(r'\s+', "split   on    whitespace")  # ['split', 'on', 'whitespace']

# . - any character except newline
re.findall(r'a.c', "abc aXc a c a\nc")  # ['abc', 'aXc', 'a c']

# Custom character class [abc]
re.findall(r'[aeiou]', "hello world")  # ['e', 'o', 'o']

# Negated class [^abc]
re.findall(r'[^aeiou\s]', "hello")  # ['h', 'l', 'l']
```

### Quantifiers

```python
# * - zero or more
re.findall(r'ab*', "a ab abb abbb")  # ['a', 'ab', 'abb', 'abbb']

# + - one or more
re.findall(r'ab+', "a ab abb abbb")  # ['ab', 'abb', 'abbb']

# ? - zero or one
re.findall(r'colou?r', "color colour")  # ['color', 'colour']

# {n} - exactly n
re.findall(r'\d{3}', "12 123 1234")  # ['123', '123']

# {n,m} - between n and m
re.findall(r'\d{2,4}', "1 12 123 1234 12345")  # ['12', '123', '1234', '1234']
```

### Anchors

```python
# ^ - start of string
re.findall(r'^Hello', "Hello World\nHello There")  # ['Hello']

# $ - end of string
re.findall(r'World$', "Hello World")  # ['World']

# \b - word boundary
re.findall(r'\bcat\b', "cat category concatenate")  # ['cat']
```

---

## Groups and Capturing

### Basic Groups

```python
# Parentheses create groups
pattern = r'(\d{3})-(\d{4})'
text = "Phone: 555-1234"

match = re.search(pattern, text)
if match:
    print(match.group())   # 555-1234 (full match)
    print(match.group(1))  # 555 (first group)
    print(match.group(2))  # 1234 (second group)
    print(match.groups())  # ('555', '1234')
```

### Named Groups

```python
# Use (?P<name>...) for named groups
pattern = r'(?P<area>\d{3})-(?P<number>\d{4})'
text = "Phone: 555-1234"

match = re.search(pattern, text)
if match:
    print(match.group('area'))    # 555
    print(match.group('number'))  # 1234
    print(match.groupdict())      # {'area': '555', 'number': '1234'}
```

### Non-Capturing Groups

```python
# Use (?:...) when you need grouping but not capturing
pattern = r'(?:Mr|Mrs|Ms)\.?\s+(\w+)'
text = "Mr. Smith and Mrs. Jones"

# Only captures the names, not the titles
names = re.findall(pattern, text)
print(names)  # ['Smith', 'Jones']
```

---

## Search and Replace

### Using re.sub()

```python
# Basic replacement
text = "Hello World"
result = re.sub(r'World', 'Python', text)
print(result)  # Hello Python

# Replace multiple occurrences
text = "cat cat cat"
result = re.sub(r'cat', 'dog', text)
print(result)  # dog dog dog

# Limit replacements
result = re.sub(r'cat', 'dog', text, count=2)
print(result)  # dog dog cat
```

### Using Groups in Replacement

```python
# Reference groups with \1, \2 or \g<name>
text = "John Smith, Jane Doe"
# Swap first and last names
result = re.sub(r'(\w+)\s+(\w+)', r'\2 \1', text)
print(result)  # Smith John, Doe Jane

# Named groups
pattern = r'(?P<first>\w+)\s+(?P<last>\w+)'
result = re.sub(pattern, r'\g<last>, \g<first>', text)
print(result)  # Smith, John, Doe, Jane
```

### Using Functions for Replacement

```python
def uppercase_match(match):
    return match.group().upper()

text = "hello world python"
result = re.sub(r'\b\w', uppercase_match, text)
print(result)  # Hello World Python

# More complex logic
def censor_word(match):
    word = match.group()
    return word[0] + '*' * (len(word) - 1)

text = "This contains bad words"
bad_words = r'\b(bad|ugly|horrible)\b'
result = re.sub(bad_words, censor_word, text)
print(result)  # This contains b** words
```

---

## Practical Examples

### Email Validation

```python
def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

print(is_valid_email("user@example.com"))     # True
print(is_valid_email("invalid.email"))        # False
print(is_valid_email("user+tag@domain.org"))  # True
```

### Phone Number Extraction

```python
def extract_phone_numbers(text):
    # Matches various US phone formats
    pattern = r'''
        (?:
            \+?1[\s.-]?        # Optional country code
        )?
        \(?                    # Optional opening paren
        (\d{3})               # Area code
        \)?                    # Optional closing paren
        [\s.-]?               # Separator
        (\d{3})               # Exchange
        [\s.-]?               # Separator
        (\d{4})               # Number
    '''
    matches = re.findall(pattern, text, re.VERBOSE)
    return [f"({a}) {e}-{n}" for a, e, n in matches]

text = """
    Call us: 555-123-4567
    Or: (555) 987-6543
    International: +1 555.111.2222
"""
print(extract_phone_numbers(text))
# ['(555) 123-4567', '(555) 987-6543', '(555) 111-2222']
```

### URL Parsing

```python
def parse_url(url):
    pattern = r'''
        ^
        (?P<protocol>https?://)?
        (?P<domain>[a-zA-Z0-9.-]+)
        (?::(?P<port>\d+))?
        (?P<path>/[^?#]*)?
        (?:\?(?P<query>[^#]*))?
        (?:\#(?P<fragment>.*))?
        $
    '''
    match = re.match(pattern, url, re.VERBOSE)
    if match:
        return match.groupdict()
    return None

url = "https://example.com:8080/path/to/page?name=value#section"
print(parse_url(url))
# {'protocol': 'https://', 'domain': 'example.com', 'port': '8080',
#  'path': '/path/to/page', 'query': 'name=value', 'fragment': 'section'}
```

### Log File Parsing

```python
def parse_log_line(line):
    pattern = r'''
        ^
        (?P<ip>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+
        -\s+-\s+
        \[(?P<timestamp>[^\]]+)\]\s+
        "(?P<method>\w+)\s+(?P<path>[^\s]+)\s+HTTP/[^"]+"\s+
        (?P<status>\d{3})\s+
        (?P<size>\d+)
    '''
    match = re.match(pattern, line, re.VERBOSE)
    if match:
        return match.groupdict()
    return None

log_line = '192.168.1.1 - - [25/Jan/2024:10:15:30 +0000] "GET /api/users HTTP/1.1" 200 1234'
print(parse_log_line(log_line))
```

### Password Validation

```python
def validate_password(password):
    """
    Password must have:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    checks = [
        (r'.{8,}', "at least 8 characters"),
        (r'[A-Z]', "an uppercase letter"),
        (r'[a-z]', "a lowercase letter"),
        (r'\d', "a digit"),
        (r'[!@#$%^&*(),.?":{}|<>]', "a special character"),
    ]

    errors = []
    for pattern, message in checks:
        if not re.search(pattern, password):
            errors.append(f"Missing {message}")

    return len(errors) == 0, errors

valid, errors = validate_password("WeakPass")
print(f"Valid: {valid}, Errors: {errors}")
# Valid: False, Errors: ['Missing a digit', 'Missing a special character']
```

---

## Compiling Patterns

For patterns used multiple times, compile for efficiency:

```python
# Compile pattern once
email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# Reuse compiled pattern
emails = ["user@example.com", "invalid", "another@test.org"]
valid_emails = [e for e in emails if email_pattern.match(e)]
print(valid_emails)
```

---

## Flags and Modifiers

```python
# re.IGNORECASE (re.I) - case insensitive
re.findall(r'python', "Python PYTHON python", re.IGNORECASE)
# ['Python', 'PYTHON', 'python']

# re.MULTILINE (re.M) - ^ and $ match line boundaries
text = "Line 1\nLine 2\nLine 3"
re.findall(r'^Line', text, re.MULTILINE)
# ['Line', 'Line', 'Line']

# re.DOTALL (re.S) - . matches newlines
text = "Hello\nWorld"
re.findall(r'Hello.World', text, re.DOTALL)
# ['Hello\nWorld']

# re.VERBOSE (re.X) - allow comments and whitespace
pattern = re.compile(r'''
    \d{3}    # Area code
    [-.]     # Separator
    \d{4}    # Number
''', re.VERBOSE)

# Combine flags
re.findall(r'hello', "Hello HELLO", re.IGNORECASE | re.MULTILINE)
```

---

## Common Pitfalls

### Greedy vs Non-Greedy

```python
text = '<div>content</div><div>more</div>'

# Greedy (default) - matches as much as possible
re.findall(r'<div>.*</div>', text)
# ['<div>content</div><div>more</div>']

# Non-greedy (*?) - matches as little as possible
re.findall(r'<div>.*?</div>', text)
# ['<div>content</div>', '<div>more</div>']
```

### Escaping Special Characters

```python
# These characters have special meaning: . ^ $ * + ? { } [ ] \ | ( )
# Use re.escape() or backslash

text = "Price: $5.00 (USD)"

# Wrong - . matches any character
re.findall(r'$5.00', text)  # []

# Correct - escape special characters
re.findall(r'\$5\.00', text)  # ['$5.00']

# Or use re.escape()
price = "$5.00"
re.findall(re.escape(price), text)  # ['$5.00']
```

---

## Summary

Key `re` module functions:

- `re.search()` - find first match anywhere
- `re.match()` - match at string start
- `re.findall()` - find all matches
- `re.sub()` - search and replace
- `re.split()` - split by pattern
- `re.compile()` - compile pattern for reuse

Essential patterns:

- `\d` digits, `\w` word characters, `\s` whitespace
- `*` zero+, `+` one+, `?` zero/one, `{n,m}` specific count
- `^` start, `$` end, `\b` word boundary
- `()` groups, `(?:)` non-capturing, `(?P<name>)` named

Regex is powerful but can be hard to read. Comment complex patterns with `re.VERBOSE` and consider simpler string methods when they suffice.
