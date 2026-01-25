# How to Avoid Mutable Default Arguments Bug in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Debugging, Best Practices, Functions, Common Pitfalls

Description: Learn why mutable default arguments in Python cause unexpected behavior and how to fix this common bug with the None pattern.

---

One of Python's most notorious gotchas is mutable default arguments. This bug has bitten every Python developer at least once. A function that works perfectly the first time starts behaving strangely on subsequent calls. Understanding why this happens and how to prevent it will save you hours of debugging.

## The Problem Demonstrated

Here is a function that looks perfectly reasonable but contains a subtle bug.

```python
def add_item(item, shopping_list=[]):
    """Add an item to a shopping list - BUGGY VERSION"""
    shopping_list.append(item)
    return shopping_list

# First call - works as expected
result1 = add_item('apples')
print(result1)  # ['apples']

# Second call - wait, where did 'apples' come from?
result2 = add_item('bananas')
print(result2)  # ['apples', 'bananas']

# Third call - the list keeps growing!
result3 = add_item('oranges')
print(result3)  # ['apples', 'bananas', 'oranges']
```

You might expect each call to start with an empty list, but instead the list persists between calls. This is not a bug in Python - it is working exactly as designed. The issue is that the design surprises most people.

## Why This Happens

In Python, default argument values are evaluated once when the function is defined, not each time the function is called. The default list `[]` is created when Python first reads the function definition, and that same list object is used for every call.

```python
def add_item(item, shopping_list=[]):
    # This shows the same object ID every time
    print(f"List object ID: {id(shopping_list)}")
    shopping_list.append(item)
    return shopping_list

# All calls reference the same list object
add_item('apples')   # List object ID: 140234567890
add_item('bananas')  # List object ID: 140234567890  (same!)
add_item('oranges')  # List object ID: 140234567890  (same!)
```

You can even see the default value stored on the function object.

```python
def buggy_function(items=[]):
    items.append(1)
    return items

# Python stores defaults in __defaults__
print(buggy_function.__defaults__)  # ([],)

buggy_function()
print(buggy_function.__defaults__)  # ([1],)

buggy_function()
print(buggy_function.__defaults__)  # ([1, 1],)
```

## The Fix: Use None as Default

The standard solution is to use `None` as the default value and create a new mutable object inside the function.

```python
def add_item(item, shopping_list=None):
    """Add an item to a shopping list - CORRECT VERSION"""
    # Create a new list if none was provided
    if shopping_list is None:
        shopping_list = []
    shopping_list.append(item)
    return shopping_list

# Now each call works independently
result1 = add_item('apples')
print(result1)  # ['apples']

result2 = add_item('bananas')
print(result2)  # ['bananas']

result3 = add_item('oranges')
print(result3)  # ['oranges']

# Can still pass an existing list
my_list = ['milk']
result4 = add_item('eggs', my_list)
print(result4)  # ['milk', 'eggs']
```

## Other Mutable Types to Watch

This bug affects all mutable default arguments, not just lists.

### Dictionaries

```python
# BUGGY: Dictionary default
def add_config(key, value, config={}):
    config[key] = value
    return config

result1 = add_config('host', 'localhost')
print(result1)  # {'host': 'localhost'}

result2 = add_config('port', 8080)
print(result2)  # {'host': 'localhost', 'port': 8080}  # Oops!

# FIXED: Use None
def add_config(key, value, config=None):
    if config is None:
        config = {}
    config[key] = value
    return config
```

### Sets

```python
# BUGGY: Set default
def add_tag(tag, tags=set()):
    tags.add(tag)
    return tags

# FIXED: Use None
def add_tag(tag, tags=None):
    if tags is None:
        tags = set()
    tags.add(tag)
    return tags
```

### Custom Objects

```python
class Counter:
    def __init__(self):
        self.count = 0

# BUGGY: Object default
def increment(counter=Counter()):
    counter.count += 1
    return counter.count

print(increment())  # 1
print(increment())  # 2 - same object!

# FIXED: Use None
def increment(counter=None):
    if counter is None:
        counter = Counter()
    counter.count += 1
    return counter.count
```

## Alternative Patterns

### Using a Sentinel Object

Sometimes `None` is a valid argument value. In these cases, use a sentinel object.

```python
# Create a unique sentinel that cannot be passed by callers
_UNSET = object()

def process_data(data, default=_UNSET):
    """Process data with an optional default.

    Args:
        data: The data to process
        default: Default value if data is empty.
                 Pass None explicitly if needed.
    """
    if default is _UNSET:
        # No default was provided
        default = []

    if not data:
        return default
    return data

# Now None can be a valid explicit default
result = process_data([], default=None)
print(result)  # None
```

### Using Dataclasses with field()

Python's dataclasses handle this correctly with `field(default_factory=...)`.

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class ShoppingCart:
    # WRONG: items: List[str] = []  # This would cause the same bug

    # CORRECT: Use default_factory for mutable defaults
    items: List[str] = field(default_factory=list)

    def add_item(self, item: str):
        self.items.append(item)

# Each instance gets its own list
cart1 = ShoppingCart()
cart1.add_item('apples')
print(cart1.items)  # ['apples']

cart2 = ShoppingCart()
cart2.add_item('bananas')
print(cart2.items)  # ['bananas']
```

### Using Type Hints with Optional

Modern Python code often uses type hints, which work well with the None pattern.

```python
from typing import Optional, List

def add_item(item: str, shopping_list: Optional[List[str]] = None) -> List[str]:
    """Add an item to a shopping list.

    Args:
        item: Item to add
        shopping_list: Existing list to add to, or None for new list

    Returns:
        The shopping list with the item added
    """
    if shopping_list is None:
        shopping_list = []
    shopping_list.append(item)
    return shopping_list
```

## When Mutable Defaults Are Actually Useful

In rare cases, you might intentionally use mutable defaults for caching or memoization.

```python
def fibonacci(n, cache={0: 0, 1: 1}):
    """Calculate Fibonacci number with memoization.

    Note: The mutable default is intentional here.
    The cache persists between calls for performance.
    """
    if n not in cache:
        cache[n] = fibonacci(n - 1) + fibonacci(n - 2)
    return cache[n]

# Fast because results are cached
print(fibonacci(100))  # 354224848179261915075

# You can see the cache grew
print(len(fibonacci.__defaults__[0]))  # 101 entries
```

However, this pattern is unusual and should be clearly documented. For most caching needs, use `functools.lru_cache` instead.

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fibonacci(n):
    """Calculate Fibonacci number with automatic caching."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## How Linters Help

Modern Python linters catch this bug. Pylint, for example, warns about mutable default arguments.

```python
# Pylint warning: W0102 dangerous-default-value
def buggy(items=[]):
    pass

# No warning with the correct pattern
def fixed(items=None):
    if items is None:
        items = []
```

Configure your editor or CI pipeline to run linters. The few minutes of setup will prevent this class of bugs entirely.

## Summary

The mutable default argument bug occurs because default values are evaluated once at function definition time, not at each call. The fix is simple: use `None` as the default and create new mutable objects inside the function body.

Key points:
- Default arguments are evaluated when the function is defined
- Lists, dictionaries, sets, and custom objects are all mutable
- Use `None` as default and create new objects inside the function
- Use `field(default_factory=...)` in dataclasses
- Linters can catch this bug automatically

This is one of Python's most common pitfalls, but once you understand it, you will never be bitten by it again.
