# How to Use SORT in Redis to Sort Lists, Sets, and Sorted Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorting, List, Set, Command

Description: Learn how to use the SORT command in Redis to sort elements from lists, sets, and sorted sets with options for ordering, limiting, and fetching related data.

---

## What Is SORT in Redis

`SORT` sorts the elements of a list, set, or sorted set and returns or stores the result. It is one of Redis's most powerful but computationally expensive commands, supporting numeric and lexicographic sorting, limiting results, and fetching related keys.

```text
SORT key [BY pattern] [LIMIT offset count] [GET pattern [GET pattern ...]] [ASC | DESC] [ALPHA] [STORE destination]
```

## Basic Usage

```bash
# Sort a list numerically
LPUSH scores 30 10 50 20 40
SORT scores
# 1) "10"
# 2) "20"
# 3) "30"
# 4) "40"
# 5) "50"

# Sort descending
SORT scores DESC
# 1) "50" 2) "40" 3) "30" 4) "20" 5) "10"

# Sort a set
SADD ids 5 3 8 1 9 2
SORT ids
# 1) "1" 2) "2" 3) "3" 4) "5" 5) "8" 6) "9"
```

## Alphabetic Sorting with ALPHA

By default, `SORT` sorts numerically. Use `ALPHA` for lexicographic sorting:

```bash
LPUSH names "charlie" "alice" "bob" "diana"
SORT names ALPHA
# 1) "alice"
# 2) "bob"
# 3) "charlie"
# 4) "diana"
```

## Limiting Results with LIMIT

```bash
SORT scores LIMIT 0 3
# First 3 results (offset 0, count 3)
# 1) "10" 2) "20" 3) "30"

SORT scores LIMIT 2 3
# Skip 2, return next 3
# 1) "30" 2) "40" 3) "50"
```

## External Key Sorting with BY

Sort a list based on values stored in external keys:

```bash
# Set up data
LPUSH user_ids 1 2 3

HSET user:1 name "Charlie" age 30
HSET user:2 name "Alice" age 25
HSET user:3 name "Bob" age 28

# Sort user_ids by user name
SORT user_ids BY user:*->name ALPHA
# 1) "2"  <- Alice
# 2) "3"  <- Bob
# 3) "1"  <- Charlie

# Sort by age
SORT user_ids BY user:*->age
# 1) "2" (25) 2) "3" (28) 3) "1" (30)
```

## Fetching Related Data with GET

Fetch values from external keys alongside sorted results:

```bash
# Sort by age and return names and ages
SORT user_ids BY user:*->age GET user:*->name GET user:*->age
# 1) "Alice"
# 2) "25"
# 3) "Bob"
# 4) "28"
# 5) "Charlie"
# 6) "30"

# GET # returns the sorted element itself
SORT user_ids BY user:*->age GET # GET user:*->name
# 1) "2"      <- user id
# 2) "Alice"  <- name
# 3) "3"
# 4) "Bob"
# 5) "1"
# 6) "Charlie"
```

## Storing Results with STORE

Save sorted results to a new key instead of returning them:

```bash
SORT user_ids BY user:*->age STORE sorted:users:by_age
# (integer) 3  <- number of stored elements

LRANGE sorted:users:by_age 0 -1
# 1) "2" 2) "3" 3) "1"
```

The stored result is a list and will persist until deleted or overwritten.

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set up test data
client.lpush('product_ids', 3, 1, 4, 2, 5)

client.hset('product:1', mapping={'name': 'Widget A', 'price': '19.99', 'stock': '100'})
client.hset('product:2', mapping={'name': 'Widget B', 'price': '9.99', 'stock': '250'})
client.hset('product:3', mapping={'name': 'Widget C', 'price': '49.99', 'stock': '50'})
client.hset('product:4', mapping={'name': 'Widget D', 'price': '29.99', 'stock': '75'})
client.hset('product:5', mapping={'name': 'Widget E', 'price': '14.99', 'stock': '200'})

# Sort by price
sorted_by_price = client.sort(
    'product_ids',
    by='product:*->price',
    get=['product:*->name', 'product:*->price'],
    alpha=False
)

print("Products sorted by price:")
for i in range(0, len(sorted_by_price), 2):
    print(f"  {sorted_by_price[i]}: ${sorted_by_price[i+1]}")

# Sort alphabetically by name and store
stored_count = client.sort(
    'product_ids',
    by='product:*->name',
    store='products:sorted_by_name',
    alpha=True
)
print(f"\nStored {stored_count} items in 'products:sorted_by_name'")

# Get top 3 cheapest
cheapest = client.sort(
    'product_ids',
    by='product:*->price',
    get=['product:*->name', 'product:*->price'],
    start=0,
    num=3
)

print("\nTop 3 cheapest:")
for i in range(0, len(cheapest), 2):
    print(f"  {cheapest[i]}: ${cheapest[i+1]}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Simple numeric sort
await client.lPush('numbers', ['5', '3', '8', '1', '9', '2']);

const sorted = await client.sort('numbers');
console.log('Sorted:', sorted);

const reversed = await client.sort('numbers', { DIRECTION: 'DESC' });
console.log('Reversed:', reversed);

// Alpha sort
await client.sAdd('fruits', ['banana', 'apple', 'cherry', 'date']);
const alphaSorted = await client.sort('fruits', { ALPHA: true });
console.log('Alpha sorted:', alphaSorted);

// Sort with LIMIT
const limited = await client.sort('numbers', {
  DIRECTION: 'ASC',
  LIMIT: { offset: 0, count: 3 }
});
console.log('Limited (first 3):', limited);
```

## Sorting Sorted Sets

For sorted sets, `SORT` ignores the existing scores and sorts by element value (or BY pattern):

```bash
ZADD leaderboard 1500 "alice" 900 "bob" 1200 "charlie"

# Sort alphabetically by name (ignores scores)
SORT leaderboard ALPHA
# 1) "alice" 2) "bob" 3) "charlie"

# SORT leaderboard (without ALPHA) would error because
# "alice", "bob", "charlie" are not numeric values:
# (error) ERR One or more scores can't be converted into double
```

For sorted set score-based ordering, prefer `ZRANGE` and `ZREVRANGE`.

## Performance Considerations

`SORT` is O(N+M*log(M)) where N is list/set size and M is result count. It can be slow on large data:

- Avoid `SORT` on large sets in production hot paths
- Use `STORE` to cache sorted results and refresh periodically
- Consider using sorted sets (ZSETs) which maintain sort order natively
- `SORT_RO` (Redis 7.0+) allows using `SORT` on replicas without STORE

```bash
# Read-only variant (no STORE) - safe on replicas
SORT_RO mylist BY weight:* GET name:*
```

## Caching SORT Results

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_sorted_products(sort_by='price', ttl=300):
    """Get products sorted by field, cached for TTL seconds."""
    cache_key = f'cache:products:sorted_by_{sort_by}'

    # Check if sorted result is cached
    if client.exists(cache_key):
        return client.lrange(cache_key, 0, -1)

    # Sort and cache
    count = client.sort(
        'product_ids',
        by=f'product:*->{sort_by}',
        store=cache_key
    )
    client.expire(cache_key, ttl)
    return client.lrange(cache_key, 0, -1)

# First call sorts and caches
products = get_sorted_products('price')
print(f"Sorted product IDs: {products}")
```

## Summary

`SORT` provides flexible sorting for lists, sets, and sorted sets with options for direction, limits, external key-based ordering via `BY`, data fetching via `GET`, and result storage via `STORE`. While powerful, it is computationally expensive on large datasets - use `STORE` to cache results, `ZRANGE` for sorted-set score ordering, and `SORT_RO` on replicas for read-only sorting.
