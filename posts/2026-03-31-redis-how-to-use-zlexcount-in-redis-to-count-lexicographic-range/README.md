# How to Use ZLEXCOUNT in Redis to Count Lexicographic Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZLEXCOUNT, Lexicographic, Command

Description: Learn how to use ZLEXCOUNT in Redis to count members within a lexicographic range in a sorted set where all members have the same score.

---

## What Is ZLEXCOUNT

`ZLEXCOUNT` counts the number of members in a sorted set within a specified lexicographic range. It only produces meaningful results when all members in the set share the same score (typically 0), causing Redis to order them alphabetically.

This enables Redis sorted sets to act as a sorted index for prefix searches, alphabet-range lookups, and autocomplete implementations.

## Syntax

```text
ZLEXCOUNT key min max
```

- `key` - the sorted set key
- `min` - minimum lexicographic bound:
  - `[value` - inclusive (e.g., `[b` includes `b`)
  - `(value` - exclusive (e.g., `(b` excludes `b`)
  - `-` - the lowest possible value (open lower bound)
- `max` - maximum lexicographic bound:
  - `[value` - inclusive
  - `(value` - exclusive
  - `+` - the highest possible value (open upper bound)

Returns an integer - the count of members in the specified range.

## Basic Usage

### Count All Members

```bash
redis-cli ZADD words 0 "apple" 0 "apricot" 0 "avocado" 0 "banana" 0 "blueberry" 0 "cherry"

redis-cli ZLEXCOUNT words - +
```

```text
(integer) 6
```

### Count Words Starting with "a"

```bash
redis-cli ZLEXCOUNT words "[a" "(b"
```

```text
(integer) 3
```

`apple`, `apricot`, `avocado` all start with "a".

### Inclusive vs Exclusive Bounds

```bash
# Include "apple" through "blueberry" (inclusive)
redis-cli ZLEXCOUNT words "[apple" "[blueberry"
```

```text
(integer) 5
```

```bash
# Exclude "apple" and "blueberry"
redis-cli ZLEXCOUNT words "(apple" "(blueberry"
```

```text
(integer) 3
```

`apricot`, `avocado`, `banana` remain.

### Single Letter Range

```bash
# Count words starting with "b"
redis-cli ZLEXCOUNT words "[b" "(c"
```

```text
(integer) 2
```

`banana` and `blueberry`.

## Practical Examples

### Autocomplete Word Count

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Index words with score 0
words = ['algorithm', 'array', 'async', 'boolean', 'buffer', 'cache',
         'callback', 'class', 'closure', 'const', 'database', 'decorator']
r.zadd('dictionary', {w: 0 for w in words})

def count_completions(prefix):
    """Count how many words start with the given prefix."""
    # Upper bound: prefix with last char incremented
    upper = prefix[:-1] + chr(ord(prefix[-1]) + 1)
    return r.zlexcount('dictionary', f'[{prefix}', f'({upper}')

print(f"Words starting with 'a': {count_completions('a')}")    # 3
print(f"Words starting with 'c': {count_completions('c')}")    # 5
print(f"Words starting with 'ca': {count_completions('ca')}")  # 2
print(f"Words starting with 'z': {count_completions('z')}")    # 0
```

### Tag Index - Count Tags in Alphabetical Range

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

tags = ['backend', 'caching', 'cloud', 'database', 'devops',
        'frontend', 'kubernetes', 'microservices', 'python', 'redis']
r.zadd('global:tags', {t: 0 for t in tags})

# Count tags in the "c" to "d" range (exclusive of "e")
count = r.zlexcount('global:tags', '[c', '(e')
print(f"Tags in c-d range: {count}")  # caching, cloud, database, devops = 4

# Count tags starting with letters m-z
count = r.zlexcount('global:tags', '[m', '+')
print(f"Tags from m onwards: {count}")  # microservices, python, redis = 3
```

### Username Availability - Range Check

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

usernames = ['alice', 'alex', 'alexis', 'andrew', 'anna', 'bob', 'charlie']
r.zadd('usernames', {u: 0 for u in usernames})

def count_similar_usernames(prefix):
    upper = prefix[:-1] + chr(ord(prefix[-1]) + 1)
    return r.zlexcount('usernames', f'[{prefix}', f'({upper}')

# How many usernames start with "al"?
similar = count_similar_usernames('al')
print(f"Usernames starting with 'al': {similar}")  # 3: alice, alex, alexis
```

### Pagination Without Fetching Members

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

cities = ['amsterdam', 'berlin', 'chicago', 'dubai', 'edinburgh',
          'frankfurt', 'geneva', 'hamburg', 'istanbul', 'jakarta']
r.zadd('cities', {c: 0 for c in cities})

# Count cities in a paginated range
total = r.zlexcount('cities', '-', '+')
a_to_e = r.zlexcount('cities', '[a', '(f')
f_onwards = r.zlexcount('cities', '[f', '+')

print(f"Total cities: {total}")         # 10
print(f"Cities a-e: {a_to_e}")         # 5
print(f"Cities f onwards: {f_onwards}") # 5
```

## Summary

`ZLEXCOUNT` provides fast range counting over lexicographically ordered Redis sorted sets where all members share the same score. It powers efficient prefix counting for autocomplete, alphabetical range analytics, and tag navigation without fetching actual member data. Use `[` for inclusive bounds, `(` for exclusive bounds, `-` as the open lower bound, and `+` as the open upper bound.
