# How to Fix "IndexError: list index out of range" in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Debugging, Error Handling, Common Errors, Lists

Description: Learn how to fix IndexError list index out of range in Python. Understand why this error occurs when accessing list elements and implement defensive coding patterns.

---

The `IndexError: list index out of range` occurs when you try to access a list element using an index that does not exist. This is one of the most common errors in Python, especially when working with loops and data processing.

## Understanding the Error

```python
# Lists are zero-indexed
fruits = ["apple", "banana", "cherry"]
print(fruits[0])  # apple (first element)
print(fruits[1])  # banana (second element)
print(fruits[2])  # cherry (third element)
print(fruits[3])  # IndexError: list index out of range

# Negative indices count from the end
print(fruits[-1])  # cherry (last element)
print(fruits[-2])  # banana (second to last)
print(fruits[-4])  # IndexError: list index out of range
```

## Common Causes and Solutions

### 1. Accessing Empty Lists

```python
# Problem: Empty list has no elements
items = []
first = items[0]  # IndexError!

# Solution 1: Check if list is empty
if items:
    first = items[0]
else:
    first = None

# Solution 2: Use default with conditional expression
first = items[0] if items else None

# Solution 3: Try/except
try:
    first = items[0]
except IndexError:
    first = None
```

### 2. Off-by-One Errors in Loops

```python
# Problem: Loop goes one past the last index
items = ["a", "b", "c"]
for i in range(len(items) + 1):  # Wrong: 0, 1, 2, 3
    print(items[i])  # IndexError on i=3

# Solution 1: Use correct range
for i in range(len(items)):  # Correct: 0, 1, 2
    print(items[i])

# Solution 2: Iterate directly (preferred)
for item in items:
    print(item)

# Solution 3: Use enumerate if you need index
for i, item in enumerate(items):
    print(f"{i}: {item}")
```

### 3. Index Calculated from External Data

```python
# Problem: Index from user input or API might be invalid
items = ["a", "b", "c"]
user_index = int(input("Enter index: "))  # User enters 10
item = items[user_index]  # IndexError!

# Solution: Validate index
user_index = int(input("Enter index: "))
if 0 <= user_index < len(items):
    item = items[user_index]
else:
    print(f"Invalid index. Must be 0-{len(items)-1}")

# Or use modulo for wrapping
item = items[user_index % len(items)]
```

### 4. Parallel List Operations

```python
# Problem: Lists have different lengths
names = ["Alice", "Bob"]
ages = [25, 30, 35]

for i in range(len(ages)):
    print(f"{names[i]} is {ages[i]}")  # IndexError when i=2

# Solution 1: Use zip (stops at shortest)
for name, age in zip(names, ages):
    print(f"{name} is {age}")

# Solution 2: Check both lengths
min_len = min(len(names), len(ages))
for i in range(min_len):
    print(f"{names[i]} is {ages[i]}")

# Solution 3: Use zip_longest with default
from itertools import zip_longest
for name, age in zip_longest(names, ages, fillvalue="Unknown"):
    print(f"{name} is {age}")
```

### 5. Accessing Nested Lists

```python
# Problem: Inner list might be shorter
matrix = [
    [1, 2, 3],
    [4, 5],  # Only 2 elements
    [6, 7, 8]
]

for row in matrix:
    print(row[2])  # IndexError on second row!

# Solution: Check length first
for row in matrix:
    if len(row) > 2:
        print(row[2])
    else:
        print("N/A")

# Or use safe access function
def safe_get(lst, index, default=None):
    try:
        return lst[index]
    except IndexError:
        return default

for row in matrix:
    print(safe_get(row, 2, "N/A"))
```

### 6. Modifying List While Iterating

```python
# Problem: Removing items changes indices
numbers = [1, 2, 3, 4, 5]
for i in range(len(numbers)):
    if numbers[i] % 2 == 0:
        numbers.pop(i)  # IndexError eventually!

# Solution 1: Iterate backwards
numbers = [1, 2, 3, 4, 5]
for i in range(len(numbers) - 1, -1, -1):
    if numbers[i] % 2 == 0:
        numbers.pop(i)

# Solution 2: Create new list (preferred)
numbers = [1, 2, 3, 4, 5]
numbers = [n for n in numbers if n % 2 != 0]

# Solution 3: Use filter
numbers = list(filter(lambda n: n % 2 != 0, numbers))
```

### 7. String Indexing

```python
# Same rules apply to strings
text = "hello"
print(text[5])  # IndexError (valid indices are 0-4)

# Solution
if len(text) > 5:
    print(text[5])
```

## Safe Access Patterns

### Safe Get Function

```python
def safe_get(sequence, index, default=None):
    """Safely get item from sequence by index."""
    try:
        return sequence[index]
    except (IndexError, TypeError):
        return default

# Usage
items = [1, 2, 3]
print(safe_get(items, 0))    # 1
print(safe_get(items, 10))   # None
print(safe_get(items, 10, "default"))  # default
print(safe_get(None, 0))     # None
```

### Safe Slice

```python
# Slicing never raises IndexError
items = [1, 2, 3]
print(items[0:10])   # [1, 2, 3] (no error!)
print(items[10:20])  # [] (empty, no error!)

# Use slice to safely get first/last N items
def first_n(lst, n):
    return lst[:n]

def last_n(lst, n):
    return lst[-n:] if lst else []

print(first_n([1, 2, 3], 10))  # [1, 2, 3]
print(last_n([1, 2, 3], 10))   # [1, 2, 3]
```

### Bounded Index

```python
def bounded_index(lst, index):
    """Clamp index to valid range."""
    if not lst:
        return None
    index = max(0, min(index, len(lst) - 1))
    return lst[index]

items = [1, 2, 3]
print(bounded_index(items, -10))  # 1 (clamped to 0)
print(bounded_index(items, 100))  # 3 (clamped to last)
```

## Debugging IndexError

```python
# Add debug information
def process_items(items):
    print(f"DEBUG: List length = {len(items)}")
    for i in range(len(items)):
        print(f"DEBUG: Accessing index {i}")
        item = items[i]
        print(f"DEBUG: Got item: {item}")

# Use assertions
def get_item(items, index):
    assert len(items) > 0, "List is empty"
    assert 0 <= index < len(items), f"Index {index} out of range [0, {len(items)})"
    return items[index]
```

## Real World Example: Data Processing

```python
from typing import List, Optional, Any

class DataProcessor:
    """Process data with safe list access."""

    def __init__(self, data: List[Any]):
        self.data = data

    def get(self, index: int, default: Any = None) -> Any:
        """Safely get item by index."""
        if not self.data or not (0 <= index < len(self.data)):
            return default
        return self.data[index]

    def first(self, default: Any = None) -> Any:
        """Get first item or default."""
        return self.data[0] if self.data else default

    def last(self, default: Any = None) -> Any:
        """Get last item or default."""
        return self.data[-1] if self.data else default

    def take(self, n: int) -> List[Any]:
        """Take first n items (safe)."""
        return self.data[:n]

    def skip(self, n: int) -> List[Any]:
        """Skip first n items (safe)."""
        return self.data[n:]

    def chunk(self, size: int) -> List[List[Any]]:
        """Split into chunks of given size."""
        return [self.data[i:i + size] for i in range(0, len(self.data), size)]

    def get_column(self, rows: List[List[Any]], col: int, default: Any = None) -> List[Any]:
        """Extract column from 2D data safely."""
        result = []
        for row in rows:
            if isinstance(row, (list, tuple)) and len(row) > col:
                result.append(row[col])
            else:
                result.append(default)
        return result

# Usage
processor = DataProcessor([1, 2, 3, 4, 5])

print(processor.first())        # 1
print(processor.last())         # 5
print(processor.get(10))        # None
print(processor.take(3))        # [1, 2, 3]
print(processor.take(100))      # [1, 2, 3, 4, 5]
print(processor.chunk(2))       # [[1, 2], [3, 4], [5]]

# Process CSV-like data with variable columns
rows = [
    ["Alice", "25", "Engineer"],
    ["Bob", "30"],  # Missing column
    ["Carol", "28", "Designer", "NYC"]  # Extra column
]
print(processor.get_column(rows, 2, "N/A"))  # ['Engineer', 'N/A', 'Designer']
```

## Summary

| Cause | Solution |
|-------|----------|
| Empty list | Check `if items:` before access |
| Off-by-one in loop | Use `range(len(items))` not `range(len(items)+1)` |
| Invalid external index | Validate: `0 <= index < len(items)` |
| Different list lengths | Use `zip()` or check lengths |
| Modifying while iterating | Iterate backwards or create new list |
| Nested list access | Check inner list length |

Remember that list indices start at 0 and end at length-1. When in doubt, check the length before accessing, or use try/except for graceful handling.
