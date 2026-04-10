# How to Build a Social Graph with Redis Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Social Graph, Set, Relationship

Description: Model a social graph in Redis using Sets - store connections between users, traverse the graph for recommendations, and compute second-degree connections efficiently.

---

A social graph represents connections between users. Redis Sets map directly to this model: each node (user) has a set of edges (connections). Set operations like SINTER and SDIFF make graph traversal fast and simple.

## Data Model

For a directed graph (like Twitter follows):

```text
following:{userId}  -> Set of users this person follows
followers:{userId}  -> Set of users who follow this person
```

For an undirected graph (like Facebook friends):

```text
friends:{userId}  -> Set of all friend user IDs
```

## Adding and Removing Edges

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def add_friend(user_a, user_b):
    pipe = r.pipeline()
    pipe.sadd(f"friends:{user_a}", user_b)
    pipe.sadd(f"friends:{user_b}", user_a)
    pipe.execute()

def remove_friend(user_a, user_b):
    pipe = r.pipeline()
    pipe.srem(f"friends:{user_a}", user_b)
    pipe.srem(f"friends:{user_b}", user_a)
    pipe.execute()

def get_friends(user_id):
    return r.smembers(f"friends:{user_id}")

def friend_count(user_id):
    return r.scard(f"friends:{user_id}")
```

## First-Degree Connections

```python
def are_friends(user_a, user_b):
    return r.sismember(f"friends:{user_a}", user_b)
```

## Second-Degree Connections (Friends of Friends)

```python
def friends_of_friends(user_id):
    direct_friends = r.smembers(f"friends:{user_id}")
    fof_keys = [f"friends:{f}" for f in direct_friends]
    if not fof_keys:
        return set()
    # Union all friend sets, then remove direct friends and self
    temp_key = f"fof:temp:{user_id}"
    r.sunionstore(temp_key, *fof_keys)
    r.srem(temp_key, user_id)
    for fid in direct_friends:
        r.srem(temp_key, fid)
    fof = r.smembers(temp_key)
    r.delete(temp_key)
    return fof
```

## Shared Connections

Find mutual friends between two users:

```python
def mutual_friends(user_a, user_b):
    return r.sinter(f"friends:{user_a}", f"friends:{user_b}")

def mutual_friend_count(user_a, user_b):
    return r.sintercard(2, [f"friends:{user_a}", f"friends:{user_b}"])
```

## People You May Know

Recommend users based on how many mutual friends they share:

```python
def people_you_may_know(user_id, limit=10):
    candidates = friends_of_friends(user_id)
    scores = []
    for candidate in candidates:
        shared = r.sintercard(2, [f"friends:{user_id}", f"friends:{candidate}"])
        scores.append((candidate, shared))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:limit]
```

## Example Usage

```bash
SADD friends:alice bob carol dave
SADD friends:bob alice eve
SADD friends:carol alice frank

# Mutual friends of alice and bob
SINTER friends:alice friends:bob    # Returns empty (they share no common friends)

# Friends of friends of bob
SUNIONSTORE fof:bob friends:alice friends:eve
SREM fof:bob bob alice eve
SMEMBERS fof:bob    # carol, dave
```

## Summary

Redis Sets model social graph edges with O(1) add, remove, and membership checks. SINTER finds mutual connections, SUNIONSTORE enables second-degree traversal, and SINTERCARD quantifies shared connections for ranking. For graphs with billions of edges, partition users across Redis cluster nodes using consistent hashing.
