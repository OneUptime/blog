# How to Build a Social Media Follow/Follower System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Social Media, Set, Data Structure

Description: Learn how to use Redis Sets to build an efficient follow/follower system with instant lookups for following lists, follower counts, and mutual connections.

---

A follow/follower system is at the heart of every social platform. Redis Sets are ideal for this use case because they provide O(1) membership checks and powerful set operations for finding mutual follows.

## Data Model

Each user gets two sets: one for the accounts they follow and one for their followers.

```text
following:{userId}  -> Set of userIds this user follows
followers:{userId}  -> Set of userIds who follow this user
```

## Follow and Unfollow

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def follow(follower_id, target_id):
    pipe = r.pipeline()
    pipe.sadd(f"following:{follower_id}", target_id)
    pipe.sadd(f"followers:{target_id}", follower_id)
    pipe.execute()

def unfollow(follower_id, target_id):
    pipe = r.pipeline()
    pipe.srem(f"following:{follower_id}", target_id)
    pipe.srem(f"followers:{target_id}", follower_id)
    pipe.execute()
```

Using a pipeline ensures both sets are updated atomically in a single round trip.

## Checking Follow Status

```python
def is_following(follower_id, target_id):
    return r.sismember(f"following:{follower_id}", target_id)

def get_follower_count(user_id):
    return r.scard(f"followers:{user_id}")

def get_following_count(user_id):
    return r.scard(f"following:{user_id}")
```

## Finding Mutual Follows

You can find accounts that two users both follow using SINTER:

```python
def mutual_follows(user_a, user_b):
    return r.sinter(f"following:{user_a}", f"following:{user_b}")

def is_mutual_follow(user_a, user_b):
    # Both follow each other
    return (r.sismember(f"following:{user_a}", user_b) and
            r.sismember(f"following:{user_b}", user_a))
```

## Suggested Users to Follow

Suggest accounts that a user's friends follow but the user does not yet follow:

```python
def suggested_users(user_id, friend_id):
    # Who friend follows minus who user already follows
    suggestions = r.sdiff(f"following:{friend_id}", f"following:{user_id}")
    suggestions.discard(user_id)  # Don't suggest following yourself
    return suggestions
```

## Paginating Followers

For large follower lists, use SSCAN to paginate:

```python
def paginate_followers(user_id, cursor=0, count=50):
    next_cursor, members = r.sscan(
        f"followers:{user_id}", cursor=cursor, count=count
    )
    return next_cursor, list(members)
```

## Example Usage

```python
follow("alice", "bob")
follow("bob", "alice")
follow("alice", "carol")

print(is_following("alice", "bob"))   # True
print(get_follower_count("bob"))      # 1
print(is_mutual_follow("alice", "bob"))  # True
print(suggested_users("bob", "alice"))   # {'carol'}
```

## Scaling Considerations

For very large accounts with millions of followers, consider storing only the most recent follower IDs in Redis and offloading the full list to a database. Use Redis for real-time operations and lookups while keeping the persistent store as the source of truth.

## Summary

Redis Sets provide an ideal data structure for follow/follower systems with O(1) follow/unfollow operations and set intersection for finding mutual connections. Pipelines keep operations atomic and efficient. For platforms at scale, combine Redis for hot-path lookups with a relational or document store for the full follower list.
