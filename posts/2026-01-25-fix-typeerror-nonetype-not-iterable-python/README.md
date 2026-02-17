# How to Fix 'TypeError: 'NoneType' is not iterable' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TypeError, Debugging, Error Handling, NoneType, Common Errors

Description: Learn why the 'TypeError: 'NoneType' is not iterable' error occurs in Python and how to fix it with practical solutions and prevention strategies.

---

> Few errors frustrate Python developers more than "TypeError: 'NoneType' object is not iterable". This error appears when you try to iterate over a variable that unexpectedly contains None instead of a list, tuple, or other iterable.

This guide explains why this error happens, shows common scenarios where it appears, and provides reliable fixes to prevent it in your code.

---

## Understanding the Error

The error occurs when Python tries to iterate over something that is None. Python can only iterate over objects that implement the iterator protocol (lists, tuples, strings, dictionaries, etc.). None is not iterable.

```python
# This causes the error
data = None
for item in data:  # TypeError: 'NoneType' object is not iterable
    print(item)
```

---

## Common Causes and Solutions

### 1. Function Returns None Instead of a List

The most common cause is calling a function that returns None when you expect a list.

```python
# Problem: Function returns None implicitly
def get_users():
    users = fetch_users_from_database()
    if users:
        return users
    # Missing return statement - returns None implicitly

# This will crash if no users are found
for user in get_users():  # TypeError if function returns None
    print(user)

# Solution 1: Always return an empty list
def get_users():
    users = fetch_users_from_database()
    if users:
        return users
    return []  # Return empty list instead of None

# Solution 2: Check before iterating
users = get_users()
if users is not None:
    for user in users:
        print(user)

# Solution 3: Use the or operator for default value
users = get_users() or []
for user in users:
    print(user)
```

### 2. Using List Methods That Return None

Many list methods modify the list in place and return None.

```python
# Problem: sort() returns None
numbers = [3, 1, 4, 1, 5]
sorted_numbers = numbers.sort()  # sort() returns None!

for num in sorted_numbers:  # TypeError: 'NoneType' object is not iterable
    print(num)

# Solution 1: sort() modifies in place, iterate the original list
numbers = [3, 1, 4, 1, 5]
numbers.sort()  # Modifies numbers in place
for num in numbers:  # This works
    print(num)

# Solution 2: Use sorted() which returns a new list
numbers = [3, 1, 4, 1, 5]
sorted_numbers = sorted(numbers)  # Returns a new sorted list
for num in sorted_numbers:
    print(num)

# Other methods that return None:
# list.append() - returns None
# list.extend() - returns None
# list.insert() - returns None
# list.remove() - returns None
# list.reverse() - returns None
# list.clear() - returns None
```

### 3. Unpacking None Values

```python
# Problem: Trying to unpack None
def get_coordinates():
    # Returns None if coordinates not found
    result = database.find_location(user_id)
    return result  # Might be None

# This crashes if get_coordinates() returns None
x, y = get_coordinates()  # TypeError: cannot unpack non-iterable NoneType object

# Solution 1: Return a default tuple
def get_coordinates():
    result = database.find_location(user_id)
    if result is None:
        return (0, 0)  # Default coordinates
    return result

# Solution 2: Check before unpacking
result = get_coordinates()
if result is not None:
    x, y = result
else:
    x, y = 0, 0

# Solution 3: Use try-except
try:
    x, y = get_coordinates()
except TypeError:
    x, y = 0, 0
```

### 4. Dictionary .get() with Iteration

```python
# Problem: .get() returns None if key is missing
config = {
    'servers': ['server1', 'server2'],
    'timeout': 30
}

# If 'databases' key does not exist, .get() returns None
for db in config.get('databases'):  # TypeError
    print(db)

# Solution 1: Provide a default value
for db in config.get('databases', []):  # Returns empty list if key missing
    print(db)

# Solution 2: Check first
databases = config.get('databases')
if databases is not None:
    for db in databases:
        print(db)
```

### 5. API Responses and JSON Parsing

```python
# Problem: API returns None or missing keys
import requests

def get_user_posts(user_id):
    response = requests.get(f'https://api.example.com/users/{user_id}/posts')
    data = response.json()

    # The 'posts' key might not exist or might be None
    for post in data['posts']:  # KeyError or TypeError possible
        print(post['title'])

# Solution: Defensive programming
def get_user_posts(user_id):
    response = requests.get(f'https://api.example.com/users/{user_id}/posts')
    data = response.json()

    # Use .get() with default empty list
    posts = data.get('posts') or []

    for post in posts:
        # Also handle missing 'title' key
        title = post.get('title', 'Untitled')
        print(title)
```

### 6. Regular Expression Matches

```python
import re

# Problem: re.match() and re.search() return None if no match
text = "Hello World"
match = re.search(r'\d+', text)  # No digits in text, returns None

# This crashes
for group in match.groups():  # TypeError: 'NoneType' object is not iterable
    print(group)

# Solution: Check if match exists
match = re.search(r'\d+', text)
if match:
    for group in match.groups():
        print(group)
else:
    print("No match found")

# Or use walrus operator (Python 3.8+)
if match := re.search(r'\d+', text):
    print(match.group())
```

---

## Prevention Strategies

### Type Hints and Static Analysis

```python
# type_hints.py
# Use type hints to catch potential None issues early
from typing import List, Optional

def get_active_users() -> List[dict]:
    """Always returns a list, never None."""
    users = fetch_users_from_database()
    return users if users else []

def get_user_by_id(user_id: int) -> Optional[dict]:
    """May return None if user not found."""
    return database.find_user(user_id)

# Static analysis tools like mypy can catch issues:
# mypy will warn if you iterate over Optional[List] without checking
```

### Defensive Function Design

```python
# defensive_design.py
# Design functions to never return None when a collection is expected

def search_products(query: str) -> list:
    """
    Search for products matching the query.

    Returns:
        List of matching products. Returns empty list if no matches.
    """
    results = database.search(query)

    # Guarantee we return a list
    if results is None:
        return []

    if not isinstance(results, list):
        return [results]

    return results

# Now callers can safely iterate
for product in search_products("laptop"):
    print(product)
```

### Safe Iteration Helper

```python
# safe_iteration.py
# Create a helper function for safe iteration

def safe_iter(obj):
    """
    Safely iterate over an object.
    Returns empty iterator if obj is None.
    """
    if obj is None:
        return iter([])
    return iter(obj)

# Usage
data = get_data_that_might_be_none()
for item in safe_iter(data):
    print(item)

# As a generator function
def safe_iterate(obj, default=None):
    """Yield items from obj, or from default if obj is None."""
    if obj is None:
        obj = default or []

    for item in obj:
        yield item
```

---

## Debugging Tips

### Finding the Source of None

```python
# debugging.py
# Techniques to find where None came from

def process_data(data):
    # Add debugging to trace None values
    print(f"process_data received: {data} (type: {type(data)})")

    if data is None:
        raise ValueError("process_data received None - check the calling code")

    for item in data:
        print(item)

# Use assertions during development
def get_users():
    users = fetch_from_database()
    assert users is not None, "Database returned None for users"
    return users

# Add logging
import logging

def process_api_response(response):
    logging.debug(f"API response: {response}")

    data = response.get('data')
    logging.debug(f"Extracted data: {data}")

    if data is None:
        logging.warning("API returned None for 'data' field")
        data = []

    return data
```

---

## Common Patterns Summary

| Problem | Solution |
|---------|----------|
| Function returns None | Return empty list `[]` by default |
| list.sort() returns None | Use `sorted()` instead |
| dict.get() returns None | Use `dict.get(key, [])` |
| API response missing key | Use `.get(key, [])` or check first |
| re.match returns None | Check `if match:` before using |
| Unpacking might fail | Check for None first or use try-except |

---

## Conclusion

The "TypeError: 'NoneType' object is not iterable" error is preventable with good coding practices:

1. Always return empty collections instead of None from functions
2. Use `.get(key, [])` with dictionaries to provide defaults
3. Check for None before iterating when the source is uncertain
4. Use type hints and static analysis to catch issues early
5. Remember that list methods like `sort()`, `append()`, and `reverse()` return None

By following these patterns, you can eliminate this common error from your Python code.

---

*Tired of debugging Python errors in production? [OneUptime](https://oneuptime.com) provides error tracking and alerting to catch issues before they affect users.*

