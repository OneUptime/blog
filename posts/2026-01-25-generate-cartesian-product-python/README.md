# How to Generate Cartesian Product in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, itertools, Combinations, Mathematics, Data Processing

Description: Learn how to generate Cartesian products in Python using itertools.product for creating all combinations of elements from multiple iterables.

---

The Cartesian product combines elements from multiple sets, producing all possible ordered pairs (or tuples). In Python, `itertools.product()` provides an efficient way to generate these combinations. This guide covers practical uses from generating test cases to building configuration matrices.

## What is a Cartesian Product?

Given two sets A = {1, 2} and B = {x, y}, the Cartesian product A x B is all possible pairs:

```
A x B = {(1, x), (1, y), (2, x), (2, y)}
```

Each element from A is paired with each element from B.

## Basic Usage with itertools.product

```python
from itertools import product

colors = ['red', 'blue']
sizes = ['S', 'M', 'L']

# Generate all color-size combinations
for combination in product(colors, sizes):
    print(combination)

# Output:
# ('red', 'S')
# ('red', 'M')
# ('red', 'L')
# ('blue', 'S')
# ('blue', 'M')
# ('blue', 'L')
```

### Converting to a List

```python
from itertools import product

colors = ['red', 'blue']
sizes = ['S', 'M', 'L']

# Get all combinations as a list
all_combinations = list(product(colors, sizes))
print(all_combinations)
# [('red', 'S'), ('red', 'M'), ('red', 'L'), ('blue', 'S'), ('blue', 'M'), ('blue', 'L')]
```

## Multiple Iterables

You can pass any number of iterables to `product()`.

```python
from itertools import product

colors = ['red', 'blue']
sizes = ['S', 'M']
materials = ['cotton', 'polyester']

# Three-way product
for combo in product(colors, sizes, materials):
    print(combo)

# Output:
# ('red', 'S', 'cotton')
# ('red', 'S', 'polyester')
# ('red', 'M', 'cotton')
# ('red', 'M', 'polyester')
# ('blue', 'S', 'cotton')
# ('blue', 'S', 'polyester')
# ('blue', 'M', 'cotton')
# ('blue', 'M', 'polyester')
```

## Using the repeat Parameter

The `repeat` parameter creates the product of an iterable with itself multiple times.

```python
from itertools import product

# All possible 2-digit binary numbers
bits = [0, 1]
for combo in product(bits, repeat=2):
    print(combo)

# Output:
# (0, 0)
# (0, 1)
# (1, 0)
# (1, 1)

# All possible 3-digit binary numbers
for combo in product(bits, repeat=3):
    print(combo)

# Output:
# (0, 0, 0)
# (0, 0, 1)
# (0, 1, 0)
# (0, 1, 1)
# (1, 0, 0)
# (1, 0, 1)
# (1, 1, 0)
# (1, 1, 1)
```

### Equivalent to Nested Loops

`product(A, B, C)` is equivalent to nested for loops:

```python
from itertools import product

A = [1, 2]
B = ['a', 'b']
C = ['x', 'y']

# Using product
result1 = list(product(A, B, C))

# Equivalent nested loops
result2 = []
for a in A:
    for b in B:
        for c in C:
            result2.append((a, b, c))

print(result1 == result2)  # True
```

## Practical Examples

### Generating Test Cases

```python
from itertools import product

def test_function(x, mode, flag):
    """Function to test with various parameter combinations."""
    return f"x={x}, mode={mode}, flag={flag}"

# Test parameters
x_values = [0, 1, -1, 100]
modes = ['fast', 'slow', 'normal']
flags = [True, False]

# Generate all test cases
test_cases = list(product(x_values, modes, flags))
print(f"Total test cases: {len(test_cases)}")  # 24 cases

# Run all tests
for x, mode, flag in test_cases:
    result = test_function(x, mode, flag)
    # assert some_condition(result)
```

### Configuration Matrix

```python
from itertools import product

# Database configuration options
databases = ['postgres', 'mysql']
cache_options = ['redis', 'memcached', None]
debug_modes = [True, False]

# Generate all possible configurations
configs = []
for db, cache, debug in product(databases, cache_options, debug_modes):
    configs.append({
        'database': db,
        'cache': cache,
        'debug': debug
    })

print(f"Total configurations: {len(configs)}")  # 12 configurations

for config in configs[:4]:
    print(config)
# {'database': 'postgres', 'cache': 'redis', 'debug': True}
# {'database': 'postgres', 'cache': 'redis', 'debug': False}
# {'database': 'postgres', 'cache': 'memcached', 'debug': True}
# {'database': 'postgres', 'cache': 'memcached', 'debug': False}
```

### Grid Coordinates

```python
from itertools import product

# Generate coordinates for a 3x3 grid
rows = range(3)
cols = range(3)

grid = list(product(rows, cols))
print(grid)
# [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2)]

# 3D grid
x = range(2)
y = range(2)
z = range(2)

cube = list(product(x, y, z))
print(f"Cube vertices: {cube}")
# [(0, 0, 0), (0, 0, 1), (0, 1, 0), (0, 1, 1), (1, 0, 0), (1, 0, 1), (1, 1, 0), (1, 1, 1)]
```

### Password/PIN Generation

```python
from itertools import product

# Generate all possible 4-digit PINs
digits = '0123456789'

# Warning: This generates 10,000 combinations!
# Only showing count and first few
pin_count = 0
for pin in product(digits, repeat=4):
    pin_str = ''.join(pin)
    pin_count += 1
    if pin_count <= 5:
        print(pin_str)

print(f"Total PINs: {pin_count}")  # 10000

# Output:
# 0000
# 0001
# 0002
# 0003
# 0004
# Total PINs: 10000
```

### Query Parameter Combinations

```python
from itertools import product
from urllib.parse import urlencode

base_url = "https://api.example.com/search"

# Query parameter options
sort_by = ['date', 'relevance', 'price']
order = ['asc', 'desc']
limit = [10, 25, 50]

# Generate all possible query URLs
for params in product(sort_by, order, limit):
    query = urlencode({
        'sort': params[0],
        'order': params[1],
        'limit': params[2]
    })
    url = f"{base_url}?{query}"
    print(url)

# First few outputs:
# https://api.example.com/search?sort=date&order=asc&limit=10
# https://api.example.com/search?sort=date&order=asc&limit=25
# ...
```

## Handling Large Products

Cartesian products grow exponentially. Be careful with large inputs.

```python
from itertools import product

# Size calculation
A = range(10)
B = range(10)
C = range(10)

# Total combinations = 10 * 10 * 10 = 1000
total = len(A) * len(B) * len(C)
print(f"Total combinations: {total}")

# For very large products, iterate instead of converting to list
# This uses constant memory
for combo in product(A, B, C):
    # Process one at a time
    if should_stop(combo):
        break
```

### Memory-Efficient Processing

```python
from itertools import product, islice

# Large product - do not materialize all at once
large_a = range(1000)
large_b = range(1000)

# Process in batches
def batch_process(iterator, batch_size=1000):
    """Process iterator in batches."""
    while True:
        batch = list(islice(iterator, batch_size))
        if not batch:
            break
        # Process this batch
        yield batch

# Usage
product_iter = product(large_a, large_b)
for batch in batch_process(product_iter, batch_size=10000):
    # Process 10,000 combinations at a time
    pass
```

## Alternative: Nested List Comprehension

For simple cases, nested comprehensions work too.

```python
colors = ['red', 'blue']
sizes = ['S', 'M', 'L']

# Using list comprehension
result = [(c, s) for c in colors for s in sizes]
print(result)
# [('red', 'S'), ('red', 'M'), ('red', 'L'), ('blue', 'S'), ('blue', 'M'), ('blue', 'L')]

# Equivalent to product
from itertools import product
result2 = list(product(colors, sizes))
print(result == result2)  # True
```

The comprehension becomes unwieldy with many iterables. Use `product()` for clarity with 3+ iterables.

## Filtering Products

Often you want only certain combinations.

```python
from itertools import product

# Generate products but filter results
sizes = ['S', 'M', 'L', 'XL']
colors = ['red', 'blue', 'green']

# Filter: only medium and larger in red
filtered = [
    (size, color)
    for size, color in product(sizes, colors)
    if sizes.index(size) >= 1 and color == 'red'
]
print(filtered)
# [('M', 'red'), ('L', 'red'), ('XL', 'red')]

# Using filter function
def is_valid_combo(combo):
    size, color = combo
    return size != 'S' or color != 'green'

valid_combos = list(filter(is_valid_combo, product(sizes, colors)))
```

## Comparison with Other Combinatorics

| Function | Description | Example |
|----------|-------------|---------|
| `product(A, B)` | All pairs (with repetition) | AB -> (a,a), (a,b), (b,a), (b,b) |
| `permutations(A, 2)` | Ordered arrangements (no repeat) | AB -> (a,b), (b,a) |
| `combinations(A, 2)` | Unordered selections (no repeat) | ABC -> (a,b), (a,c), (b,c) |
| `combinations_with_replacement(A, 2)` | Unordered with repeat | AB -> (a,a), (a,b), (b,b) |

```python
from itertools import product, permutations, combinations, combinations_with_replacement

items = ['a', 'b', 'c']

print("Product (repeat=2):", list(product(items, repeat=2)))
# All pairs with repetition

print("Permutations (2):", list(permutations(items, 2)))
# Ordered pairs, no repetition

print("Combinations (2):", list(combinations(items, 2)))
# Unordered pairs, no repetition

print("Combinations with replacement (2):", list(combinations_with_replacement(items, 2)))
# Unordered pairs, with repetition
```

## Summary

The `itertools.product()` function generates Cartesian products efficiently:

- Pass multiple iterables to get all combinations
- Use `repeat` parameter for self-products
- Returns an iterator for memory efficiency
- Equivalent to nested for loops but cleaner

Common uses include generating test cases, configuration matrices, grid coordinates, and exploring parameter spaces. Remember that product sizes grow exponentially, so process large products as iterators rather than lists.
