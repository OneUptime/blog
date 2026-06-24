# How to Use VRANGE in Redis to Range Query Vectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector, VRANGE, Vector Set, Search

Description: Learn how to use VRANGE in Redis to retrieve vector elements in rank order from a vector set, with examples for pagination and top-N retrieval.

---

Redis vector sets store elements indexed by their similarity connections in a hierarchical navigable small world (HNSW) graph. The `VRANGE` command lets you retrieve elements in lexicographic order by name - useful for iterating through vector sets, paginating with cursors, or fetching a subset of entries.

## Basic Syntax

```text
VRANGE key start end [count]
```

- `start` and `end` define a lexicographic range using prefix notation:
  - `-` means the minimum (first) element
  - `+` means the maximum (last) element
  - `[value` means inclusive of `value`
  - `(value` means exclusive of `value`
- `count` limits the number of elements returned. A negative count returns all matching elements.

## Adding Vectors and Using VRANGE

```bash
# Build a small product vector set
VADD products VALUES 3 0.1 0.2 0.9 laptop
VADD products VALUES 3 0.8 0.1 0.3 phone
VADD products VALUES 3 0.4 0.6 0.5 tablet
VADD products VALUES 3 0.2 0.8 0.4 monitor
VADD products VALUES 3 0.7 0.3 0.6 keyboard

# Retrieve all elements in lexicographic order
VRANGE products - +

# Retrieve first 3 elements lexicographically
VRANGE products - + 3

# Retrieve all elements starting from "monitor" (inclusive)
VRANGE products [monitor +

# Retrieve all elements after "monitor" (exclusive)
VRANGE products (monitor +
```

## Practical Example: Paginating Through a Vector Set

Since `VRANGE` uses lexicographic cursors, you paginate by remembering the last element returned and using it as the exclusive start of the next page:

```python
import redis

r = redis.Redis(host="localhost", port=6379)

def paginate_vector_set(key, cursor=None, page_size=3):
    if cursor is None:
        start = "-"
    else:
        start = f"({cursor}"
    results = r.execute_command("VRANGE", key, start, "+", page_size)
    return [item.decode() for item in results]

# First page: first 3 elements lexicographically
page_0 = paginate_vector_set("products", cursor=None, page_size=3)
print("Page 0:", page_0)

# Next page: use last element from previous page as cursor
if page_0:
    page_1 = paginate_vector_set("products", cursor=page_0[-1], page_size=3)
    print("Page 1:", page_1)
```

## Counting Elements Before Ranging

Use `VCARD` to get total count so you can track pagination progress:

```python
def iterate_all(key, page_size=10):
    total = r.execute_command("VCARD", key)
    all_elements = []
    cursor = None
    while True:
        if cursor is None:
            start = "-"
        else:
            start = f"({cursor}"
        batch = r.execute_command("VRANGE", key, start, "+", page_size)
        if not batch:
            break
        decoded = [item.decode() for item in batch]
        all_elements.extend(decoded)
        cursor = decoded[-1]
    return all_elements
```

## Combining VRANGE with VSIM

A common pattern is to use `VRANGE` to sample elements and then run `VSIM` against each to find similar items:

```python
def find_cluster_representatives(key, sample_size=5):
    # Get a sample of elements
    samples = r.execute_command("VRANGE", key, "-", "+", sample_size)
    representatives = []
    for elem in samples:
        name = elem.decode()
        # Find the top-3 most similar for each sample
        similar = r.execute_command("VSIM", key, "ELE", name, "COUNT", 3)
        representatives.append({
            "element": name,
            "neighbors": [s.decode() for s in similar]
        })
    return representatives
```

## Error Handling

```bash
# VRANGE on a non-existent key returns empty list
VRANGE nonexistent - +
# Returns: (empty array)

# If no elements match the range, an empty list is returned
VRANGE products [zzz +
# Returns: (empty array)
```

## Summary

`VRANGE` provides lexicographic iteration over elements in a Redis vector set, complementing similarity-based queries like `VSIM` with ordered retrieval. It is ideal for building cursor-based paginated APIs, sampling subsets for inspection, or iterating through all entries in a vector set.
