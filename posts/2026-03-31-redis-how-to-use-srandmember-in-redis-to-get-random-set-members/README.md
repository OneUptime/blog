# How to Use SRANDMEMBER in Redis to Get Random Set Members

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, SRANDMEMBER, Random, Sampling

Description: Learn how to use SRANDMEMBER in Redis to retrieve one or more random members from a set without removing them, enabling sampling and randomization.

---

## What Is SRANDMEMBER

`SRANDMEMBER` returns one or more random elements from a Redis set without removing them. This is different from `SPOP` which removes the returned elements. Use `SRANDMEMBER` when you need random sampling while preserving the set.

## Syntax

```text
SRANDMEMBER key [count]
```

- `key` - the set to sample from
- `count` (optional):
  - Omitted - returns a single random element (as a bulk string, or nil if the set is empty)
  - Positive integer - returns up to `count` unique random elements as an array (no duplicates)
  - Negative integer - returns exactly `|count|` elements as an array, allowing duplicates

Returns nil (or empty array) if the set is empty or the key does not exist.

## Basic Usage

### Get One Random Member

```bash
redis-cli SADD colors "red" "green" "blue" "yellow" "purple"

redis-cli SRANDMEMBER colors
```

```text
"blue"
```

### Get Multiple Unique Random Members

```bash
redis-cli SRANDMEMBER colors 3
```

```text
1) "yellow"
2) "red"
3) "green"
```

All 3 are unique. If count exceeds the set size, all members are returned in random order:

```bash
redis-cli SRANDMEMBER colors 10
```

```text
1) "red"
2) "green"
3) "blue"
4) "yellow"
5) "purple"
```

### Get Random Members With Duplicates (Negative Count)

```bash
redis-cli SRANDMEMBER colors -5
```

```text
1) "blue"
2) "red"
3) "blue"
4) "yellow"
5) "blue"
```

With a negative count, the same element can appear multiple times.

### Set Not Found

```bash
redis-cli SRANDMEMBER nonexistent
```

```text
(nil)
```

## SRANDMEMBER vs SPOP

| Feature | SRANDMEMBER | SPOP |
|---|---|---|
| Removes element | No | Yes |
| Use case | Sampling | Drawing/lottery |
| Preserves set | Yes | No |

```bash
# SRANDMEMBER - set unchanged after call
redis-cli SRANDMEMBER colors 2
redis-cli SCARD colors  # Still 5

# SPOP - elements removed from set
redis-cli SPOP colors 2
redis-cli SCARD colors  # Now 3
```

## Practical Examples

### Random Quiz Question Selector

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load quiz questions
r.sadd('quiz:python', 'q:list_comprehension', 'q:generators', 'q:decorators',
       'q:context_managers', 'q:async_await', 'q:metaclasses')

def get_quiz_questions(count=5):
    """Get a random set of quiz questions."""
    questions = r.srandmember('quiz:python', count)
    return questions

session_questions = get_quiz_questions(3)
print(f"Today's quiz: {session_questions}")
```

### Random Content Recommendation

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Store article IDs in a set
r.sadd('articles:tech', 'art:1001', 'art:1002', 'art:1003', 'art:1004', 'art:1005')

def get_recommendations(user_id, count=3):
    """Get random article recommendations, excluding already viewed."""
    viewed_key = f'user:{user_id}:viewed'
    viewed = r.smembers(viewed_key)

    candidates = r.srandmember('articles:tech', count * 2)  # Oversample
    return [c for c in candidates if c not in viewed][:count]

recs = get_recommendations('user:42', count=3)
print(f"Recommended articles: {recs}")
```

### A/B Test Group Assignment

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Available test variants
r.sadd('ab_test:checkout_flow', 'variant_a', 'variant_b', 'variant_c')

def assign_variant(user_id):
    """Randomly assign a user to a test variant."""
    existing = r.get(f'user:{user_id}:variant')
    if existing:
        return existing

    variant = r.srandmember('ab_test:checkout_flow')
    r.setex(f'user:{user_id}:variant', 3600 * 24 * 30, variant)  # 30 day cookie
    return variant

print(assign_variant('user:100'))  # e.g., "variant_b"
print(assign_variant('user:100'))  # Same variant returned
```

### Random Sampling for Analytics

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Active session IDs
r.sadd('active_sessions', *[f'sess:{i}' for i in range(1000)])

def sample_sessions(sample_size=50):
    """Sample a subset of sessions for analysis."""
    return r.srandmember('active_sessions', sample_size)

sample = sample_sessions(10)
print(f"Sampled {len(sample)} sessions for analysis")
```

### Random Sampling with Replacement

Use negative count to sample with replacement - elements can repeat across draws, which is useful when you need more samples than the set size:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Ad pool
r.sadd('ads:pool', 'ad:premium_1', 'ad:premium_2', 'ad:standard_1',
       'ad:standard_2', 'ad:standard_3')

# Get 10 random ad slots (with possible repeats)
ad_slots = r.srandmember('ads:pool', -10)
print(f"Ad slots: {ad_slots}")
```

## Summary

`SRANDMEMBER` provides non-destructive random sampling from a Redis set with fine-grained control: positive counts return unique elements, negative counts allow repetition, and omitting count returns a single element. It is the right choice over `SPOP` when the set must remain intact after sampling. Common uses include quiz randomization, content recommendations, A/B test assignment, and statistical sampling.
