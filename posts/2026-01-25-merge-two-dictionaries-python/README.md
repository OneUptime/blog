# How to Merge Two Dictionaries in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Dictionaries, Data Structures, Best Practices, Python 3

Description: Learn multiple ways to merge dictionaries in Python, from the modern merge operator to traditional update methods, with guidance on handling duplicate keys.

---

Merging dictionaries is a common operation in Python. Whether you are combining configuration settings, aggregating data, or processing API responses, knowing the best way to merge dictionaries makes your code cleaner. Python offers several approaches, with newer versions providing increasingly elegant syntax.

## The Merge Operator | (Python 3.9+)

Python 3.9 introduced the merge operator `|` for dictionaries. This is now the recommended approach.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'c': 3, 'd': 4}

# Merge with | operator
merged = dict1 | dict2

print(merged)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}

# Original dicts are unchanged
print(dict1)  # {'a': 1, 'b': 2}
print(dict2)  # {'c': 3, 'd': 4}
```

### Handling Duplicate Keys

When keys overlap, the right-hand dictionary wins.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'b': 3, 'c': 4}  # 'b' exists in both

merged = dict1 | dict2
print(merged)  # {'a': 1, 'b': 3, 'c': 4}
# dict2's value for 'b' overwrites dict1's
```

### Update Operator |= (In-Place)

The `|=` operator merges in place, modifying the left dictionary.

```python
config = {'debug': False, 'timeout': 30}
overrides = {'debug': True, 'retries': 3}

config |= overrides  # Modifies config in place

print(config)  # {'debug': True, 'timeout': 30, 'retries': 3}
```

## Unpacking with ** (Python 3.5+)

Dictionary unpacking creates a new merged dictionary.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'c': 3, 'd': 4}

# Unpack both into a new dict
merged = {**dict1, **dict2}

print(merged)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
```

### Multiple Dictionaries

You can merge any number of dictionaries.

```python
defaults = {'color': 'blue', 'size': 'medium'}
user_prefs = {'color': 'red'}
overrides = {'size': 'large', 'font': 'Arial'}

# Later dicts override earlier ones
final = {**defaults, **user_prefs, **overrides}

print(final)  # {'color': 'red', 'size': 'large', 'font': 'Arial'}
```

### Adding Extra Key-Value Pairs

```python
base = {'a': 1, 'b': 2}

# Merge with additional items
extended = {**base, 'c': 3, 'd': 4}

print(extended)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
```

## The update() Method

The `update()` method merges dictionaries in place.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'c': 3, 'd': 4}

dict1.update(dict2)  # Modifies dict1 in place

print(dict1)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
```

### Non-Destructive Update with copy()

To preserve the original, copy first.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'c': 3, 'd': 4}

merged = dict1.copy()
merged.update(dict2)

print(merged)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
print(dict1)   # {'a': 1, 'b': 2}  (unchanged)
```

## dict() Constructor

The `dict()` constructor can merge dictionaries in a single expression.

```python
dict1 = {'a': 1, 'b': 2}
dict2 = {'c': 3, 'd': 4}

# Using dict() with unpacking
merged = dict(dict1, **dict2)

print(merged)  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
```

Note: This only works when `dict2` has string keys.

## ChainMap for Virtual Merging

`ChainMap` creates a view of multiple dictionaries without copying.

```python
from collections import ChainMap

defaults = {'color': 'blue', 'size': 'medium'}
user_prefs = {'color': 'red'}

# ChainMap searches dicts in order
combined = ChainMap(user_prefs, defaults)

print(combined['color'])  # 'red' (found in user_prefs)
print(combined['size'])   # 'medium' (found in defaults)

# Convert to regular dict if needed
merged = dict(combined)
print(merged)  # {'color': 'red', 'size': 'medium'}
```

### When ChainMap is Useful

```python
from collections import ChainMap

# Configuration with multiple layers
system_config = {'timeout': 30, 'retries': 3, 'debug': False}
user_config = {'timeout': 60}
runtime_config = {'debug': True}

# Later dicts have priority (listed first)
config = ChainMap(runtime_config, user_config, system_config)

print(config['timeout'])  # 60 (from user_config)
print(config['debug'])    # True (from runtime_config)
print(config['retries'])  # 3 (from system_config)

# Changes to underlying dicts are reflected
system_config['retries'] = 5
print(config['retries'])  # 5
```

## Deep Merging Nested Dictionaries

The standard merge methods are shallow. For nested dictionaries, you need a deep merge.

```python
def deep_merge(base, override):
    """Recursively merge override into base."""
    result = base.copy()

    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Both values are dicts, merge recursively
            result[key] = deep_merge(result[key], value)
        else:
            # Override the value
            result[key] = value

    return result

# Example with nested dicts
config1 = {
    'database': {
        'host': 'localhost',
        'port': 5432,
        'credentials': {
            'user': 'admin'
        }
    },
    'debug': False
}

config2 = {
    'database': {
        'host': 'production.db.com',
        'credentials': {
            'password': 'secret'
        }
    }
}

merged = deep_merge(config1, config2)
print(merged)
# {
#     'database': {
#         'host': 'production.db.com',
#         'port': 5432,
#         'credentials': {
#             'user': 'admin',
#             'password': 'secret'
#         }
#     },
#     'debug': False
# }
```

## Comparing Methods

| Method | Python Version | In-Place | Creates Copy | Handles Nested |
|--------|----------------|----------|--------------|----------------|
| `d1 \| d2` | 3.9+ | No | Yes | No (shallow) |
| `d1 \|= d2` | 3.9+ | Yes | No | No (shallow) |
| `{**d1, **d2}` | 3.5+ | No | Yes | No (shallow) |
| `d1.update(d2)` | All | Yes | No | No (shallow) |
| `ChainMap` | All | No | No (view) | No |
| Custom deep merge | All | Configurable | Configurable | Yes |

## Practical Examples

### Configuration Management

```python
# Default configuration
DEFAULT_CONFIG = {
    'log_level': 'INFO',
    'max_connections': 100,
    'timeout': 30,
    'retry_count': 3
}

def get_config(user_config=None, env_config=None):
    """Build configuration with defaults, user settings, and environment overrides."""
    config = DEFAULT_CONFIG.copy()

    if user_config:
        config |= user_config

    if env_config:
        config |= env_config

    return config

# Usage
final_config = get_config(
    user_config={'timeout': 60},
    env_config={'log_level': 'DEBUG'}
)
print(final_config)
# {'log_level': 'DEBUG', 'max_connections': 100, 'timeout': 60, 'retry_count': 3}
```

### Aggregating Data

```python
from collections import Counter

# Combine counts from multiple sources
source1 = {'apple': 10, 'banana': 5}
source2 = {'banana': 3, 'orange': 7}
source3 = {'apple': 2, 'grape': 4}

# Using Counter for additive merge
total = Counter(source1) + Counter(source2) + Counter(source3)
print(dict(total))
# {'apple': 12, 'banana': 8, 'orange': 7, 'grape': 4}
```

### Merging API Responses

```python
def merge_paginated_results(responses):
    """Merge paginated API responses."""
    merged = {
        'data': [],
        'metadata': {}
    }

    for response in responses:
        merged['data'].extend(response.get('data', []))
        merged['metadata'] |= response.get('metadata', {})

    merged['total'] = len(merged['data'])
    return merged

# Example
page1 = {'data': [1, 2, 3], 'metadata': {'page': 1}}
page2 = {'data': [4, 5, 6], 'metadata': {'page': 2, 'has_more': False}}

result = merge_paginated_results([page1, page2])
print(result)
# {'data': [1, 2, 3, 4, 5, 6], 'metadata': {'page': 2, 'has_more': False}, 'total': 6}
```

## Summary

For merging dictionaries in modern Python:

- Use `dict1 | dict2` (Python 3.9+) for the cleanest syntax
- Use `dict1 |= dict2` for in-place updates
- Use `{**dict1, **dict2}` for Python 3.5-3.8 compatibility
- Use `update()` when modifying in place in older code
- Use `ChainMap` when you need a view without copying
- Implement custom deep merge for nested dictionaries

The merge operator `|` is the recommended approach for new code targeting Python 3.9 or later. It is readable, concise, and consistent with how other types use operators.
