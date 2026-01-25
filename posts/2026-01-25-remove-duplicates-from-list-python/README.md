# How to Remove Duplicates from List in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Lists, Data Structures, Deduplication, Performance

Description: Learn multiple methods to remove duplicate elements from lists in Python, from simple set conversions to order-preserving techniques and handling complex objects.

---

> Duplicate data can cause unexpected behavior in your applications, from incorrect calculations to inflated storage costs. Python offers several approaches to deduplicate lists, each with different trade-offs between simplicity, performance, and order preservation.

Working with lists in Python often means dealing with duplicates. Whether you are processing user inputs, merging datasets, or cleaning up API responses, knowing how to efficiently remove duplicates is essential. This guide covers multiple approaches, from the simplest one-liner to handling complex nested data structures.

---

## The Simple Approach: Using set()

The most straightforward way to remove duplicates is converting your list to a set and back:

```python
# Basic list with duplicates
numbers = [1, 2, 2, 3, 4, 4, 4, 5]

# Convert to set (removes duplicates) then back to list
unique_numbers = list(set(numbers))
print(unique_numbers)
# Output: [1, 2, 3, 4, 5] (order may vary)
```

This approach has one significant limitation: **sets do not preserve order**. In Python 3.7+, dictionaries maintain insertion order, but sets do not. If your original list was `[3, 1, 2, 1, 3]`, you might get `[1, 2, 3]` or any other arrangement.

### When to Use set()

- You do not care about element order
- You need maximum performance for large lists
- Your elements are hashable (numbers, strings, tuples)

---

## Preserving Order with dict.fromkeys()

Starting from Python 3.7, dictionaries maintain insertion order. This gives us a clean way to deduplicate while keeping order:

```python
# List with duplicates where order matters
colors = ['red', 'blue', 'red', 'green', 'blue', 'yellow']

# dict.fromkeys() creates a dict with list items as keys
# Since keys are unique and ordered, we get deduplication with order
unique_colors = list(dict.fromkeys(colors))
print(unique_colors)
# Output: ['red', 'blue', 'green', 'yellow']
```

This works because dictionary keys must be unique. When you create a dict from the list, duplicates are automatically skipped while the first occurrence is preserved.

### Performance Comparison

```python
import timeit

# Test data: 10000 items with many duplicates
test_list = list(range(1000)) * 10

# Method 1: set conversion
def using_set():
    return list(set(test_list))

# Method 2: dict.fromkeys
def using_dict():
    return list(dict.fromkeys(test_list))

# Benchmark
set_time = timeit.timeit(using_set, number=1000)
dict_time = timeit.timeit(using_dict, number=1000)

print(f"set() method: {set_time:.4f} seconds")
print(f"dict.fromkeys() method: {dict_time:.4f} seconds")
# Typical output:
# set() method: 0.2341 seconds
# dict.fromkeys() method: 0.2876 seconds
```

The set approach is slightly faster, but dict.fromkeys() is still very efficient and preserves order.

---

## Manual Loop for Full Control

Sometimes you need more control over the deduplication process. A manual loop lets you apply custom logic:

```python
def remove_duplicates_manual(items):
    """Remove duplicates while preserving order using a manual loop."""
    seen = set()  # Track items we have already encountered
    result = []

    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)

    return result

# Example usage
data = [1, 2, 2, 3, 1, 4, 3, 5]
unique_data = remove_duplicates_manual(data)
print(unique_data)
# Output: [1, 2, 3, 4, 5]
```

This pattern gives you the flexibility to add custom conditions:

```python
def remove_duplicates_with_condition(items, key_func=None):
    """
    Remove duplicates based on a custom key function.
    Useful when you want to deduplicate by a specific attribute.
    """
    seen = set()
    result = []

    for item in items:
        # Use key function if provided, otherwise use item directly
        key = key_func(item) if key_func else item

        if key not in seen:
            seen.add(key)
            result.append(item)

    return result

# Deduplicate dictionaries by a specific field
users = [
    {'id': 1, 'name': 'Alice'},
    {'id': 2, 'name': 'Bob'},
    {'id': 1, 'name': 'Alice (duplicate)'},
    {'id': 3, 'name': 'Charlie'}
]

unique_users = remove_duplicates_with_condition(users, key_func=lambda u: u['id'])
print(unique_users)
# Output: [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}, {'id': 3, 'name': 'Charlie'}]
```

---

## Handling Unhashable Types

Sets require hashable elements. If your list contains dictionaries or other mutable objects, you need a different approach:

```python
def remove_duplicate_dicts(dict_list):
    """
    Remove duplicate dictionaries from a list.
    Converts each dict to a frozenset for comparison.
    """
    seen = set()
    result = []

    for d in dict_list:
        # Convert dict to frozenset of tuples for hashing
        # Sort items to ensure consistent hashing
        dict_key = frozenset(sorted(d.items()))

        if dict_key not in seen:
            seen.add(dict_key)
            result.append(d)

    return result

# List of dictionaries with duplicates
records = [
    {'name': 'Alice', 'age': 30},
    {'name': 'Bob', 'age': 25},
    {'name': 'Alice', 'age': 30},  # Duplicate
    {'name': 'Charlie', 'age': 35}
]

unique_records = remove_duplicate_dicts(records)
print(unique_records)
# Output: [{'name': 'Alice', 'age': 30}, {'name': 'Bob', 'age': 25}, {'name': 'Charlie', 'age': 35}]
```

For nested dictionaries, you might need to serialize to JSON:

```python
import json

def remove_duplicate_nested_dicts(dict_list):
    """Handle nested dictionaries by serializing to JSON for comparison."""
    seen = set()
    result = []

    for d in dict_list:
        # JSON serialize with sorted keys for consistent comparison
        dict_key = json.dumps(d, sort_keys=True)

        if dict_key not in seen:
            seen.add(dict_key)
            result.append(d)

    return result
```

---

## Using List Comprehension with Index

A one-liner approach using list comprehension with enumeration:

```python
# Remove duplicates, keeping first occurrence
items = ['apple', 'banana', 'apple', 'cherry', 'banana', 'date']

# enumerate gives us index and value
# Keep item only if this is its first occurrence
unique = [item for i, item in enumerate(items) if item not in items[:i]]
print(unique)
# Output: ['apple', 'banana', 'cherry', 'date']
```

Note: This approach has O(n^2) complexity because it checks all previous items for each element. Use it only for small lists.

---

## Deduplication with pandas

When working with larger datasets, pandas provides efficient deduplication:

```python
import pandas as pd

# Simple list deduplication
numbers = [1, 2, 2, 3, 4, 4, 5]
unique_numbers = pd.Series(numbers).drop_duplicates().tolist()
print(unique_numbers)
# Output: [1, 2, 3, 4, 5]

# Deduplicating list of dictionaries
records = [
    {'name': 'Alice', 'dept': 'Engineering'},
    {'name': 'Bob', 'dept': 'Sales'},
    {'name': 'Alice', 'dept': 'Engineering'},  # Duplicate
]

df = pd.DataFrame(records)
unique_records = df.drop_duplicates().to_dict('records')
print(unique_records)
```

---

## Preserving the Last Occurrence Instead of First

Sometimes you want to keep the last occurrence of each duplicate:

```python
def keep_last_occurrence(items):
    """Remove duplicates, keeping the last occurrence of each item."""
    seen = set()
    result = []

    # Iterate in reverse
    for item in reversed(items):
        if item not in seen:
            seen.add(item)
            result.append(item)

    # Reverse back to original order
    return list(reversed(result))

data = ['a', 'b', 'a', 'c', 'b', 'd']
unique = keep_last_occurrence(data)
print(unique)
# Output: ['a', 'c', 'b', 'd']
```

---

## Case-Insensitive String Deduplication

For strings, you might want case-insensitive deduplication:

```python
def dedupe_case_insensitive(strings):
    """Remove duplicate strings, ignoring case differences."""
    seen = set()
    result = []

    for s in strings:
        lower = s.lower()
        if lower not in seen:
            seen.add(lower)
            result.append(s)  # Keep original case

    return result

words = ['Apple', 'BANANA', 'apple', 'Cherry', 'banana']
unique = dedupe_case_insensitive(words)
print(unique)
# Output: ['Apple', 'BANANA', 'Cherry']
```

---

## Removing Consecutive Duplicates Only

Sometimes you only want to remove adjacent duplicates, not all duplicates:

```python
from itertools import groupby

def remove_consecutive_duplicates(items):
    """Remove only consecutive duplicate elements."""
    # groupby groups consecutive equal elements
    return [key for key, group in groupby(items)]

data = [1, 1, 2, 2, 2, 3, 1, 1, 4]
result = remove_consecutive_duplicates(data)
print(result)
# Output: [1, 2, 3, 1, 4]
# Note: 1 appears twice because they were not consecutive
```

---

## Performance Summary

| Method | Preserves Order | Time Complexity | Handles Unhashable |
|--------|-----------------|-----------------|-------------------|
| `set()` | No | O(n) | No |
| `dict.fromkeys()` | Yes | O(n) | No |
| Manual loop | Yes | O(n) | Yes (with modification) |
| List comprehension | Yes | O(n^2) | Yes |
| pandas | Yes | O(n) | Yes |

---

## Best Practices

1. **Use `set()` for simple cases** where order does not matter
2. **Use `dict.fromkeys()`** when you need to preserve order with hashable items
3. **Use manual loops** when you need custom deduplication logic
4. **Consider pandas** for large datasets or when already using DataFrames
5. **Profile your code** if performance is critical; the best method depends on your data

---

## Conclusion

Python provides multiple ways to remove duplicates from lists, each suited for different scenarios. For most cases, `dict.fromkeys()` offers the best balance of simplicity and functionality. When dealing with complex objects or needing custom logic, the manual loop approach gives you complete control.

Remember that the right choice depends on your specific requirements: Do you need to preserve order? Are your elements hashable? How large is your dataset? Answer these questions, and the appropriate method will be clear.
