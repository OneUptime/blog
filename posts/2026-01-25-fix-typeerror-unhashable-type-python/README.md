# How to Fix 'TypeError: unhashable type' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Debugging, Error Handling, Common Errors, Data Structures

Description: Learn how to fix the TypeError unhashable type error in Python. Understand what hashability means, why lists and dicts cannot be dictionary keys or set members, and how to solve this common problem.

---

The error `TypeError: unhashable type: 'list'` (or `'dict'`, `'set'`) occurs when you try to use a mutable object where Python requires a hashable object. This typically happens when using lists as dictionary keys or adding lists to sets. This guide explains why this happens and how to fix it.

## What is Hashability?

In Python, a hash is a fixed-size integer that uniquely identifies an object's value. Hashable objects can be used as dictionary keys and set members. For an object to be hashable, it must:

1. Have a hash value that never changes during its lifetime
2. Be comparable to other objects

Mutable objects like lists, dictionaries, and sets cannot be hashed because their contents can change.

```python
# Hashable types
hash(42)           # Works - integers are hashable
hash("hello")      # Works - strings are hashable
hash((1, 2, 3))    # Works - tuples are hashable (if contents are hashable)
hash(frozenset([1, 2]))  # Works - frozensets are hashable

# Unhashable types
hash([1, 2, 3])    # TypeError: unhashable type: 'list'
hash({"a": 1})     # TypeError: unhashable type: 'dict'
hash({1, 2, 3})    # TypeError: unhashable type: 'set'
```

## Common Scenarios and Solutions

### 1. Using a List as a Dictionary Key

```python
# Problem: Lists cannot be dictionary keys
coordinates = {}
point = [10, 20]
coordinates[point] = "Point A"  # TypeError: unhashable type: 'list'

# Solution: Convert to tuple
coordinates = {}
point = (10, 20)  # Tuple instead of list
coordinates[point] = "Point A"  # Works!

# Or convert when using as key
point = [10, 20]
coordinates[tuple(point)] = "Point A"  # Also works
```

### 2. Adding a List to a Set

```python
# Problem: Sets can only contain hashable items
seen = set()
item = [1, 2, 3]
seen.add(item)  # TypeError: unhashable type: 'list'

# Solution: Convert to tuple
seen = set()
item = (1, 2, 3)
seen.add(item)  # Works!

# Or convert when adding
seen = set()
item = [1, 2, 3]
seen.add(tuple(item))  # Also works
```

### 3. Creating a Set from a List of Lists

```python
# Problem: Cannot create set from list of lists
data = [[1, 2], [3, 4], [1, 2]]
unique = set(data)  # TypeError: unhashable type: 'list'

# Solution: Convert inner lists to tuples
data = [[1, 2], [3, 4], [1, 2]]
unique = set(tuple(item) for item in data)
print(unique)  # {(1, 2), (3, 4)}

# Convert back to lists if needed
unique_lists = [list(item) for item in unique]
```

### 4. Using a Dictionary as a Key

```python
# Problem: Dictionaries cannot be dictionary keys
cache = {}
config = {"host": "localhost", "port": 5432}
cache[config] = "cached_result"  # TypeError: unhashable type: 'dict'

# Solution 1: Use frozenset of items
cache = {}
config = {"host": "localhost", "port": 5432}
key = frozenset(config.items())
cache[key] = "cached_result"  # Works!

# Solution 2: Use JSON string as key
import json
cache = {}
key = json.dumps(config, sort_keys=True)
cache[key] = "cached_result"  # Works!

# Solution 3: Use a named tuple
from collections import namedtuple

Config = namedtuple("Config", ["host", "port"])
config = Config(host="localhost", port=5432)
cache[config] = "cached_result"  # Works!
```

### 5. Nested Unhashable Types

```python
# Problem: Tuple containing a list is not hashable
data = (1, 2, [3, 4])
hash(data)  # TypeError: unhashable type: 'list'

# Solution: Convert all nested structures
def make_hashable(obj):
    """Recursively convert to hashable types."""
    if isinstance(obj, list):
        return tuple(make_hashable(item) for item in obj)
    elif isinstance(obj, dict):
        return frozenset((k, make_hashable(v)) for k, v in obj.items())
    elif isinstance(obj, set):
        return frozenset(make_hashable(item) for item in obj)
    return obj

data = (1, 2, [3, 4])
hashable_data = make_hashable(data)  # (1, 2, (3, 4))
hash(hashable_data)  # Works!
```

## Working with DataFrames and Records

When working with data that needs to be deduplicated or indexed:

```python
# Problem: Cannot use list of values as dictionary key
records = [
    {"id": 1, "tags": ["python", "coding"]},
    {"id": 2, "tags": ["java", "backend"]},
]

# Try to index by tags
index = {}
for record in records:
    index[record["tags"]] = record  # TypeError!

# Solution 1: Convert tags to tuple for indexing
index = {}
for record in records:
    key = tuple(record["tags"])
    index[key] = record

# Solution 2: Use a different key strategy
index = {}
for record in records:
    key = ",".join(sorted(record["tags"]))
    index[key] = record
```

## Custom Hashable Classes

You can make your own classes hashable by implementing `__hash__` and `__eq__`:

```python
class Point:
    """A hashable 2D point."""

    def __init__(self, x, y):
        self._x = x
        self._y = y

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __hash__(self):
        # Hash based on immutable attributes
        return hash((self._x, self._y))

    def __eq__(self, other):
        if not isinstance(other, Point):
            return False
        return self._x == other._x and self._y == other._y

    def __repr__(self):
        return f"Point({self._x}, {self._y})"

# Now Point objects can be used as dict keys and set members
points = {Point(0, 0): "origin", Point(1, 1): "diagonal"}
unique_points = {Point(0, 0), Point(1, 1), Point(0, 0)}
print(len(unique_points))  # 2
```

## Using dataclasses with Frozen Option

```python
from dataclasses import dataclass

# Frozen dataclasses are hashable
@dataclass(frozen=True)
class Config:
    host: str
    port: int
    debug: bool = False

config1 = Config("localhost", 5432)
config2 = Config("localhost", 5432)

# Can use as dict keys
cache = {config1: "cached_data"}

# Can use in sets
configs = {config1, config2}
print(len(configs))  # 1 (they are equal)
```

## Real World Example: Memoization Cache

```python
from functools import wraps

def hashable_args(args, kwargs):
    """Convert function arguments to hashable form."""
    def make_hashable(obj):
        if isinstance(obj, list):
            return tuple(make_hashable(x) for x in obj)
        if isinstance(obj, dict):
            return frozenset((k, make_hashable(v)) for k, v in obj.items())
        if isinstance(obj, set):
            return frozenset(make_hashable(x) for x in obj)
        return obj

    hashable_args = tuple(make_hashable(arg) for arg in args)
    hashable_kwargs = frozenset(
        (k, make_hashable(v)) for k, v in kwargs.items()
    )
    return (hashable_args, hashable_kwargs)

def memoize(func):
    """Cache function results, handling unhashable arguments."""
    cache = {}

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            key = (args, frozenset(kwargs.items()))
            if key in cache:
                return cache[key]
        except TypeError:
            # Arguments are unhashable, convert them
            key = hashable_args(args, kwargs)

        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    return wrapper

@memoize
def process_data(items, config):
    """Process data - can accept lists and dicts."""
    print(f"Processing {items} with {config}")
    return sum(items) * config.get("multiplier", 1)

# Works with unhashable arguments
result1 = process_data([1, 2, 3], {"multiplier": 2})  # Computed
result2 = process_data([1, 2, 3], {"multiplier": 2})  # Cached
```

## Summary

| Unhashable Type | Hashable Alternative |
|-----------------|---------------------|
| `list` | `tuple` |
| `dict` | `frozenset(dict.items())` or JSON string |
| `set` | `frozenset` |
| Nested structures | Recursively convert |
| Custom class | Implement `__hash__` and `__eq__` |
| dataclass | Use `@dataclass(frozen=True)` |

The key insight is that Python needs hashable objects for dictionary keys and set members because it uses hashing for fast lookups. When you encounter this error, convert your mutable objects to their immutable equivalents.
