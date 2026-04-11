# How to Use SORT_RO in Redis for Read-Only Sorting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorting, Read-Only, Data Structure, Performance

Description: Learn how to use SORT_RO in Redis to sort list, set, or sorted set elements without modifying data, ideal for read replicas and safe queries.

---

## What Is SORT_RO?

`SORT_RO` is a read-only variant of the `SORT` command introduced in Redis 7.0. It allows you to sort the elements of a list, set, or sorted set without the ability to store results or modify any data. Because it performs no writes, it is safe to run on read replicas and in contexts where write operations must be avoided.

The key difference between `SORT` and `SORT_RO` is that `SORT_RO` does not support the `STORE` option. If you attempt to use `STORE` with `SORT_RO`, Redis returns an error.

## Basic Syntax

```text
SORT_RO key [BY pattern] [LIMIT offset count] [GET pattern [GET pattern ...]] [ASC | DESC] [ALPHA]
```

Options:
- `BY pattern` - sort by an external key pattern
- `LIMIT offset count` - paginate results
- `GET pattern` - retrieve external values alongside sorted results
- `ASC | DESC` - sort direction (default is `ASC`)
- `ALPHA` - sort lexicographically instead of numerically

## Sorting a List Numerically

```bash
# Create a list with numeric values
RPUSH scores 42 17 88 3 55

# Sort ascending (default)
SORT_RO scores
# Returns: 3, 17, 42, 55, 88

# Sort descending
SORT_RO scores DESC
# Returns: 88, 55, 42, 17, 3
```

## Sorting Alphabetically

```bash
# Create a list with string values
RPUSH cities "London" "Paris" "Amsterdam" "Berlin"

# Sort lexicographically
SORT_RO cities ALPHA
# Returns: Amsterdam, Berlin, London, Paris

# Sort in reverse alphabetical order
SORT_RO cities ALPHA DESC
# Returns: Paris, London, Berlin, Amsterdam
```

## Paginating Results with LIMIT

```bash
RPUSH items 9 4 1 7 3 6 2 8 5

# Get the top 3 smallest values (offset=0, count=3)
SORT_RO items LIMIT 0 3
# Returns: 1, 2, 3

# Get the next 3 values (offset=3, count=3)
SORT_RO items LIMIT 3 3
# Returns: 4, 5, 6
```

## Sorting a Set

`SORT_RO` works on sets as well. Here is an example with a regular set, where members are treated as sortable values.

```bash
SADD user_ids 105 23 87 42 66

SORT_RO user_ids
# Returns members sorted numerically: 23, 42, 66, 87, 105
```

## Using BY Pattern for External Sorting

You can sort a set or list by values stored in separate Redis keys using the `BY` pattern.

```bash
# Store user IDs
SADD users 1 2 3

# Store each user's score in a separate key
SET user:1:score 80
SET user:2:score 45
SET user:3:score 92

# Sort users by their score
SORT_RO users BY user:*:score
# Returns: 2, 1, 3  (sorted by score: 45, 80, 92)
```

## Using GET Pattern to Fetch Related Data

```bash
SET user:1:name "Alice"
SET user:2:name "Bob"
SET user:3:name "Charlie"

# Sort users by score and return their names
SORT_RO users BY user:*:score GET user:*:name
# Returns: Bob, Alice, Charlie
```

## SORT_RO vs SORT

| Feature | SORT | SORT_RO |
|---|---|---|
| Sort lists/sets | Yes | Yes |
| STORE option | Yes | No |
| Safe on replicas | No | Yes |
| Available since | 1.0 | 7.0 |

## Why Use SORT_RO?

- Running on Redis replicas where writes are not allowed
- Enforcing read-only access patterns in application code
- Avoiding accidental data modification during sorting operations
- Safer for use with Redis ACL users that have read-only permissions

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Populate a list
r.rpush('temperatures', 72, 68, 85, 61, 79)

# Sort read-only
result = r.sort_ro('temperatures')
print(result)  # ['61', '68', '72', '79', '85']

# Sort descending
result = r.sort_ro('temperatures', desc=True)
print(result)  # ['85', '79', '72', '68', '61']
```

## Summary

`SORT_RO` provides a safe, read-only way to sort Redis lists and sets without the risk of accidentally storing results or modifying data. It is especially useful when working with Redis replicas, enforcing read-only access, or building query patterns that must not alter state. For most sorting use cases in modern Redis deployments, prefer `SORT_RO` over `SORT` unless you specifically need the `STORE` option.
