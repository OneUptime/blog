# How to Iterate Over Two Lists in Parallel in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Lists, Iteration, zip, Loops

Description: Learn how to iterate over multiple lists simultaneously in Python using zip, enumerate, and itertools for efficient parallel processing.

---

Iterating over two or more lists at the same time is a common requirement in Python. Whether you are pairing names with ages, coordinates with values, or keys with data, Python provides elegant ways to handle parallel iteration. This guide covers the most common approaches and their trade-offs.

## The Basic Problem

You have two (or more) lists and want to process corresponding elements together.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]

# Goal: Print "Alice is 25", "Bob is 30", etc.
```

## Using zip() - The Standard Approach

The `zip()` function combines iterables element by element.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]

# zip creates pairs of (name, age)
for name, age in zip(names, ages):
    print(f"{name} is {age} years old")

# Output:
# Alice is 25 years old
# Bob is 30 years old
# Charlie is 35 years old
```

### How zip Works

`zip()` returns an iterator of tuples. Each tuple contains the corresponding elements from each input iterable.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]
cities = ['NYC', 'LA', 'Chicago']

# zip with three lists
for name, age, city in zip(names, ages, cities):
    print(f"{name}, {age}, {city}")

# Convert to list to see all pairs
pairs = list(zip(names, ages))
print(pairs)  # [('Alice', 25), ('Bob', 30), ('Charlie', 35)]
```

### Unequal Length Lists

By default, `zip()` stops at the shortest list.

```python
names = ['Alice', 'Bob', 'Charlie', 'Diana']
ages = [25, 30]

# Only processes first 2 elements
for name, age in zip(names, ages):
    print(f"{name}: {age}")

# Output:
# Alice: 25
# Bob: 30
# (Charlie and Diana are silently dropped!)
```

## Using itertools.zip_longest()

When lists have different lengths and you want to process all elements, use `zip_longest()`.

```python
from itertools import zip_longest

names = ['Alice', 'Bob', 'Charlie', 'Diana']
ages = [25, 30]

# Process all elements, fill missing with None
for name, age in zip_longest(names, ages):
    print(f"{name}: {age}")

# Output:
# Alice: 25
# Bob: 30
# Charlie: None
# Diana: None

# Custom fill value
for name, age in zip_longest(names, ages, fillvalue='Unknown'):
    print(f"{name}: {age}")

# Output:
# Alice: 25
# Bob: 30
# Charlie: Unknown
# Diana: Unknown
```

## Using zip() with strict Mode (Python 3.10+)

Python 3.10 added a `strict` parameter to catch length mismatches.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30]

# This raises ValueError because lists have different lengths
try:
    for name, age in zip(names, ages, strict=True):
        print(f"{name}: {age}")
except ValueError as e:
    print(f"Error: {e}")

# Error: zip() argument 2 is shorter than argument 1
```

## Using enumerate() with zip()

Combine `enumerate()` with `zip()` when you need the index as well.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]

for index, (name, age) in enumerate(names):
    print(f"{index}: {name}")

# With zip for multiple lists
for index, (name, age) in enumerate(zip(names, ages)):
    print(f"{index}: {name} is {age}")

# Output:
# 0: Alice is 25
# 1: Bob is 30
# 2: Charlie is 35
```

## Index-Based Iteration (Alternative Approach)

While `zip()` is usually preferred, index-based iteration is sometimes necessary.

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]

# Using index (less Pythonic but sometimes needed)
for i in range(len(names)):
    print(f"{names[i]}: {ages[i]}")

# When you need to modify the lists
for i in range(len(ages)):
    ages[i] = ages[i] + 1  # Increment all ages
```

### When Index-Based is Better

```python
# When you need to compare adjacent elements from both lists
values_a = [1, 3, 5, 7]
values_b = [2, 4, 6, 8]

for i in range(len(values_a) - 1):
    # Compare current with next element from both lists
    diff_a = values_a[i + 1] - values_a[i]
    diff_b = values_b[i + 1] - values_b[i]
    print(f"Differences at {i}: A={diff_a}, B={diff_b}")
```

## Creating Dictionaries with zip()

A common pattern is creating a dictionary from two lists.

```python
keys = ['name', 'age', 'city']
values = ['Alice', 25, 'NYC']

# Create dictionary from parallel lists
person = dict(zip(keys, values))
print(person)  # {'name': 'Alice', 'age': 25, 'city': 'NYC'}

# Multiple records
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]

# Dictionary with names as keys, ages as values
age_lookup = dict(zip(names, ages))
print(age_lookup['Bob'])  # 30
```

## Unzipping with zip()

The `zip()` function can also separate paired data.

```python
# Paired data
pairs = [('Alice', 25), ('Bob', 30), ('Charlie', 35)]

# Unzip into separate lists
names, ages = zip(*pairs)

print(names)  # ('Alice', 'Bob', 'Charlie')
print(ages)   # (25, 30, 35)

# Convert to lists if needed
names = list(names)
ages = list(ages)
```

## Using map() for Parallel Operations

When you want to apply a function to parallel elements, `map()` can be useful.

```python
# Add corresponding elements from two lists
list1 = [1, 2, 3]
list2 = [10, 20, 30]

# Using map with lambda
sums = list(map(lambda x, y: x + y, list1, list2))
print(sums)  # [11, 22, 33]

# Using map with operator
from operator import add
sums = list(map(add, list1, list2))
print(sums)  # [11, 22, 33]

# Equivalent with zip and list comprehension
sums = [x + y for x, y in zip(list1, list2)]
print(sums)  # [11, 22, 33]
```

## Practical Examples

### Parallel Processing of Data

```python
# Processing sensor data from multiple sources
timestamps = ['09:00', '09:01', '09:02', '09:03']
temperatures = [20.1, 20.3, 20.5, 20.4]
humidity = [45, 46, 44, 45]

# Create structured records
records = [
    {'time': t, 'temp': temp, 'humidity': h}
    for t, temp, h in zip(timestamps, temperatures, humidity)
]

for record in records:
    print(record)
```

### Comparing Two Versions

```python
def compare_lists(expected, actual):
    """Compare two lists element by element."""
    from itertools import zip_longest

    differences = []
    for i, (exp, act) in enumerate(zip_longest(expected, actual, fillvalue='<missing>')):
        if exp != act:
            differences.append({
                'index': i,
                'expected': exp,
                'actual': act
            })
    return differences

expected = ['a', 'b', 'c', 'd']
actual = ['a', 'x', 'c']

diffs = compare_lists(expected, actual)
for d in diffs:
    print(f"Index {d['index']}: expected '{d['expected']}', got '{d['actual']}'")
```

### Merging Configuration

```python
default_keys = ['host', 'port', 'debug', 'timeout']
default_values = ['localhost', 8080, False, 30]
user_values = ['example.com', 9000]  # Partial override

# Merge with defaults
from itertools import zip_longest

config = {}
for key, default, user in zip_longest(default_keys, default_values, user_values):
    config[key] = user if user is not None else default

print(config)
# {'host': 'example.com', 'port': 9000, 'debug': False, 'timeout': 30}
```

### Matrix Operations

```python
# Add two matrices (list of lists)
matrix_a = [[1, 2], [3, 4]]
matrix_b = [[5, 6], [7, 8]]

# Element-wise addition
result = [
    [a + b for a, b in zip(row_a, row_b)]
    for row_a, row_b in zip(matrix_a, matrix_b)
]

print(result)  # [[6, 8], [10, 12]]
```

## Performance Considerations

`zip()` is implemented in C and is very efficient. It creates an iterator, not a list, so it is memory efficient.

```python
# Memory efficient - iterator
zipped = zip(range(1000000), range(1000000))
# Nothing computed yet, minimal memory

# Only computes as you iterate
for a, b in zipped:
    if a > 10:
        break  # Most pairs never computed
```

## Summary

| Method | Use Case | Handles Unequal Lengths |
|--------|----------|-------------------------|
| `zip()` | Standard parallel iteration | Stops at shortest |
| `zip_longest()` | Process all elements | Fills with value |
| `zip(..., strict=True)` | Ensure equal lengths | Raises error |
| `enumerate(zip())` | Need index too | Depends on zip |
| `map()` | Apply function | Stops at shortest |

For most parallel iteration needs, `zip()` is the right choice. It is clean, efficient, and Pythonic. Use `zip_longest()` when you need to handle all elements from unequal lists, and `strict=True` when mismatched lengths indicate a bug in your data.
