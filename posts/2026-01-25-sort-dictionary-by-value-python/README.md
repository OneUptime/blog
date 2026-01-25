# How to Sort a Dictionary by Value in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Dictionaries, Sorting, Data Structures, Best Practices

Description: Learn multiple ways to sort dictionaries by their values in Python, including ascending, descending, and custom sorting with practical examples.

---

While Python dictionaries maintain insertion order since Python 3.7, you often need to sort them by value rather than by key. This guide covers various approaches to sort dictionaries by their values, from simple one-liners to complex custom sorting.

## Basic Sorting by Value

The most common approach uses `sorted()` with a key function.

```python
scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95}

# Sort by value (ascending)
sorted_scores = dict(sorted(scores.items(), key=lambda x: x[1]))
print(sorted_scores)
# {'Charlie': 78, 'Alice': 85, 'Bob': 92, 'Diana': 95}
```

### How It Works

1. `scores.items()` returns key-value pairs as tuples
2. `sorted()` sorts these tuples using the key function
3. `key=lambda x: x[1]` tells sorted to use the second element (value) for comparison
4. `dict()` converts the sorted tuples back to a dictionary

## Sorting in Descending Order

Use the `reverse` parameter.

```python
scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95}

# Sort by value (descending) - highest first
sorted_scores = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
print(sorted_scores)
# {'Diana': 95, 'Bob': 92, 'Alice': 85, 'Charlie': 78}
```

### Alternative: Negative Values

For numeric values, you can negate in the key function.

```python
scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95}

# Sort descending using negative value
sorted_scores = dict(sorted(scores.items(), key=lambda x: -x[1]))
print(sorted_scores)
# {'Diana': 95, 'Bob': 92, 'Alice': 85, 'Charlie': 78}
```

## Using operator.itemgetter

The `itemgetter` function from the `operator` module is cleaner and faster than lambda.

```python
from operator import itemgetter

scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95}

# itemgetter(1) gets the second element (index 1 = value)
sorted_scores = dict(sorted(scores.items(), key=itemgetter(1)))
print(sorted_scores)
# {'Charlie': 78, 'Alice': 85, 'Bob': 92, 'Diana': 95}

# Descending
sorted_scores = dict(sorted(scores.items(), key=itemgetter(1), reverse=True))
print(sorted_scores)
# {'Diana': 95, 'Bob': 92, 'Alice': 85, 'Charlie': 78}
```

## Sorting with Complex Values

### Sorting by Nested Values

```python
users = {
    'alice': {'age': 30, 'score': 85},
    'bob': {'age': 25, 'score': 92},
    'charlie': {'age': 35, 'score': 78}
}

# Sort by nested 'score' value
sorted_users = dict(sorted(users.items(), key=lambda x: x[1]['score']))
print(sorted_users)
# {'charlie': {..., 'score': 78}, 'alice': {..., 'score': 85}, 'bob': {..., 'score': 92}}

# Sort by nested 'age' value
sorted_by_age = dict(sorted(users.items(), key=lambda x: x[1]['age']))
```

### Sorting by Multiple Criteria

Sort by primary then secondary criteria using tuples.

```python
students = {
    'alice': {'grade': 'A', 'score': 95},
    'bob': {'grade': 'A', 'score': 92},
    'charlie': {'grade': 'B', 'score': 88},
    'diana': {'grade': 'A', 'score': 90}
}

# Sort by grade (ascending), then by score (descending)
sorted_students = dict(sorted(
    students.items(),
    key=lambda x: (x[1]['grade'], -x[1]['score'])
))
print(sorted_students)
# Grade A students sorted by score descending, then grade B students
```

## Getting Top N Items

Often you only need the highest or lowest values.

```python
scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95, 'Eve': 88}

# Top 3 scores
top_3 = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3])
print(top_3)
# {'Diana': 95, 'Bob': 92, 'Eve': 88}

# Bottom 3 scores
bottom_3 = dict(sorted(scores.items(), key=lambda x: x[1])[:3])
print(bottom_3)
# {'Charlie': 78, 'Alice': 85, 'Eve': 88}
```

### Using heapq for Efficiency

For large dictionaries, `heapq.nlargest` and `heapq.nsmallest` are more efficient when you only need a few items.

```python
import heapq
from operator import itemgetter

scores = {'Alice': 85, 'Bob': 92, 'Charlie': 78, 'Diana': 95, 'Eve': 88}

# Top 3 using heapq (more efficient for large dicts)
top_3 = heapq.nlargest(3, scores.items(), key=itemgetter(1))
print(dict(top_3))
# {'Diana': 95, 'Bob': 92, 'Eve': 88}

# Bottom 3
bottom_3 = heapq.nsmallest(3, scores.items(), key=itemgetter(1))
print(dict(bottom_3))
# {'Charlie': 78, 'Alice': 85, 'Eve': 88}
```

## Sorting String Values

String values sort alphabetically by default.

```python
colors = {'apple': 'red', 'banana': 'yellow', 'grape': 'purple', 'lime': 'green'}

# Sort by color name alphabetically
sorted_colors = dict(sorted(colors.items(), key=lambda x: x[1]))
print(sorted_colors)
# {'lime': 'green', 'grape': 'purple', 'apple': 'red', 'banana': 'yellow'}

# Case-insensitive sorting
mixed_case = {'a': 'Zebra', 'b': 'apple', 'c': 'BANANA'}
sorted_mixed = dict(sorted(mixed_case.items(), key=lambda x: x[1].lower()))
print(sorted_mixed)
# {'b': 'apple', 'c': 'BANANA', 'a': 'Zebra'}
```

## Sorting with None Values

Handle None values specially to avoid TypeErrors.

```python
data = {'a': 10, 'b': None, 'c': 5, 'd': None, 'e': 8}

# Put None values at the end
sorted_data = dict(sorted(
    data.items(),
    key=lambda x: (x[1] is None, x[1] if x[1] is not None else 0)
))
print(sorted_data)
# {'c': 5, 'e': 8, 'a': 10, 'b': None, 'd': None}

# Put None values at the beginning
sorted_data = dict(sorted(
    data.items(),
    key=lambda x: (x[1] is not None, x[1] if x[1] is not None else 0)
))
print(sorted_data)
# {'b': None, 'd': None, 'c': 5, 'e': 8, 'a': 10}
```

## Practical Examples

### Sorting Word Frequencies

```python
from collections import Counter

text = "the quick brown fox jumps over the lazy dog the fox"
word_counts = Counter(text.split())

# Sort by frequency (descending)
sorted_counts = dict(sorted(word_counts.items(), key=lambda x: x[1], reverse=True))
print(sorted_counts)
# {'the': 3, 'fox': 2, 'quick': 1, 'brown': 1, ...}

# Top 5 words
top_5 = dict(sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:5])
print(top_5)
```

### Sorting Product Inventory

```python
inventory = {
    'laptop': {'price': 999, 'stock': 50},
    'mouse': {'price': 29, 'stock': 200},
    'keyboard': {'price': 79, 'stock': 150},
    'monitor': {'price': 299, 'stock': 75}
}

# Sort by price (cheapest first)
by_price = dict(sorted(inventory.items(), key=lambda x: x[1]['price']))
print("By price:", list(by_price.keys()))
# ['mouse', 'keyboard', 'monitor', 'laptop']

# Sort by stock (lowest first for reorder priority)
by_stock = dict(sorted(inventory.items(), key=lambda x: x[1]['stock']))
print("By stock:", list(by_stock.keys()))
# ['laptop', 'monitor', 'keyboard', 'mouse']
```

### Leaderboard

```python
def format_leaderboard(scores, top_n=None):
    """Create a formatted leaderboard from score dictionary."""
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    if top_n:
        sorted_scores = sorted_scores[:top_n]

    lines = []
    for rank, (name, score) in enumerate(sorted_scores, 1):
        lines.append(f"{rank}. {name}: {score}")

    return '\n'.join(lines)

scores = {'Alice': 850, 'Bob': 920, 'Charlie': 780, 'Diana': 950, 'Eve': 880}
print(format_leaderboard(scores, top_n=3))
# 1. Diana: 950
# 2. Bob: 920
# 3. Eve: 880
```

## Performance Comparison

```python
import timeit
from operator import itemgetter

scores = {f'user_{i}': i * 7 % 100 for i in range(10000)}

# Lambda approach
lambda_time = timeit.timeit(
    lambda: dict(sorted(scores.items(), key=lambda x: x[1])),
    number=100
)

# itemgetter approach (faster)
itemgetter_time = timeit.timeit(
    lambda: dict(sorted(scores.items(), key=itemgetter(1))),
    number=100
)

print(f"Lambda: {lambda_time:.4f}s")
print(f"itemgetter: {itemgetter_time:.4f}s")
# itemgetter is typically 20-30% faster
```

## Summary

| Method | Use Case |
|--------|----------|
| `sorted(..., key=lambda x: x[1])` | Simple, readable |
| `sorted(..., key=itemgetter(1))` | Faster, cleaner |
| `sorted(..., reverse=True)` | Descending order |
| `heapq.nlargest/nsmallest` | Top/bottom N from large dict |
| Tuple keys `(primary, secondary)` | Multiple sort criteria |

Key points:

- Use `sorted()` with `key` parameter to sort by value
- `itemgetter(1)` is faster than `lambda x: x[1]`
- Use `reverse=True` for descending order
- Convert result back to `dict()` to maintain dictionary type
- Use `heapq` for efficient partial sorting of large dictionaries
