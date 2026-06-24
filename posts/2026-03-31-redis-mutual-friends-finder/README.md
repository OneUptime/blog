# How to Build a Mutual Friends Finder with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, Social Graph, Recommendation

Description: Use Redis SINTER to find mutual friends between users in O(N) time - enable people you may know features, connection counts, and batch mutual-friend lookups.

---

Finding mutual friends is a core feature on social platforms. Redis SINTER (set intersection) returns the common members of two or more sets in a single command, making mutual friend lookups extremely fast.

## Data Model

```text
friends:{userId}  -> Set of friend user IDs
```

## Basic Mutual Friend Lookup

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_mutual_friends(user_a, user_b):
    return r.sinter(f"friends:{user_a}", f"friends:{user_b}")

def count_mutual_friends(user_a, user_b):
    return r.sintercard(2, [f"friends:{user_a}", f"friends:{user_b}"])
```

SINTERCARD is available from Redis 7.0 and returns the count directly without transferring member data - ideal when you only need the number.

## Batch Mutual Friend Counts

When displaying a list of suggested connections, you need mutual friend counts for multiple candidates:

```python
def batch_mutual_counts(user_id, candidate_ids):
    pipe = r.pipeline()
    for candidate in candidate_ids:
        pipe.sintercard(2, [f"friends:{user_id}", f"friends:{candidate}"])
    counts = pipe.execute()
    return dict(zip(candidate_ids, counts))
```

## Friends in Common Display

Retrieve the first few mutual friends to show as social proof:

```python
def mutual_friends_preview(user_a, user_b, limit=3):
    mutuals = r.sinter(f"friends:{user_a}", f"friends:{user_b}")
    return list(mutuals)[:limit]
```

For large friend sets, you may want to store the intersection result temporarily:

```python
def cached_mutual_friends(user_a, user_b, cache_ttl=300):
    # Sort IDs for a canonical cache key
    key_pair = tuple(sorted([user_a, user_b]))
    cache_key = f"mutuals:{key_pair[0]}:{key_pair[1]}"
    if not r.exists(cache_key):
        r.sinterstore(cache_key, f"friends:{user_a}", f"friends:{user_b}")
        r.expire(cache_key, cache_ttl)
    return r.smembers(cache_key)
```

## People You May Know Ranking

Rank non-friends by how many mutual friends they share:

```python
def people_you_may_know(user_id, limit=10):
    my_friends = r.smembers(f"friends:{user_id}")

    # Collect all second-degree connections
    candidates = set()
    for friend in my_friends:
        candidates.update(r.smembers(f"friends:{friend}"))
    candidates.discard(user_id)
    candidates -= my_friends  # Remove existing friends

    # Rank by mutual count
    pipe = r.pipeline()
    candidate_list = list(candidates)
    for candidate in candidate_list:
        pipe.sintercard(2, [f"friends:{user_id}", f"friends:{candidate}"])
    counts = pipe.execute()

    ranked = sorted(zip(candidate_list, counts), key=lambda x: x[1], reverse=True)
    return ranked[:limit]
```

## Three-Way Intersection

Find users known by all three people in a group:

```python
def common_friends_of_group(user_ids):
    keys = [f"friends:{uid}" for uid in user_ids]
    return r.sinter(*keys)
```

## Example Usage

```bash
SADD friends:alice bob carol dave
SADD friends:bob alice carol frank
SADD friends:carol alice bob eve

# Mutual friends of alice and bob
SINTER friends:alice friends:bob    # {carol}

# Count mutual friends
SINTERCARD 2 friends:alice friends:bob   # 1
```

## Summary

Redis SINTER enables mutual friend lookups in a single command with O(N*M) complexity where N is the smaller set size and M is the number of sets. SINTERCARD provides counts without data transfer, which is ideal for ranking. For large-scale social graphs, cache intersection results with a short TTL to avoid recomputing the same pairs repeatedly.
