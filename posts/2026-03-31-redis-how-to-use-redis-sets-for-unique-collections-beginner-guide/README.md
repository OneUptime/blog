# How to Use Redis Sets for Unique Collections (Beginner Guide)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Set, Unique Collections, Beginner, SADD, Set Operation

Description: Learn how to use Redis sets to store unique values and perform fast membership checks, unions, intersections, and differences.

---

## What Is a Redis Set

A Redis set is an unordered collection of unique strings. Adding a duplicate value is silently ignored. Sets are perfect for tracking unique items like visitors, tags, online users, or anything where uniqueness matters.

All set operations are O(1) or O(N) depending on the size - adding, removing, and checking membership are all constant time.

## Basic Set Commands

```bash
# SADD: Add one or more members
SADD tags:post:101 "redis" "database" "tutorial" "beginner"

# Adding duplicate is silently ignored
SADD tags:post:101 "redis"
# (integer) 0  <- nothing was added

# SMEMBERS: Get all members (unordered)
SMEMBERS tags:post:101
# 1) "beginner"
# 2) "tutorial"
# 3) "redis"
# 4) "database"

# SISMEMBER: Check if a value is in the set
SISMEMBER tags:post:101 "redis"
# (integer) 1  <- yes

SISMEMBER tags:post:101 "advanced"
# (integer) 0  <- no

# SCARD: Count members
SCARD tags:post:101
# (integer) 4

# SREM: Remove a member
SREM tags:post:101 "beginner"

# SPOP: Remove and return a random member
SPOP tags:post:101

# SRANDMEMBER: Return random member(s) without removing
SRANDMEMBER tags:post:101 2
```

## Set Operations: Union, Intersection, Difference

```bash
# Add two sets
SADD post:101:tags "redis" "database" "beginner"
SADD post:102:tags "redis" "cache" "performance"

# SUNION: All members from both sets (no duplicates)
SUNION post:101:tags post:102:tags
# "redis", "database", "beginner", "cache", "performance"

# SINTER: Only members in both sets
SINTER post:101:tags post:102:tags
# "redis"

# SDIFF: Members in first set but not second
SDIFF post:101:tags post:102:tags
# "database", "beginner"

# Store results in a new key
SUNIONSTORE common:tags post:101:tags post:102:tags
SINTERSTORE shared:tags post:101:tags post:102:tags
SDIFFSTORE unique:tags post:101:tags post:102:tags
```

## Practical Example: Tracking Unique Visitors

```python
import redis
from datetime import date

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def track_visit(page_id, user_id):
    today = date.today().isoformat()
    key = f'visitors:{page_id}:{today}'
    r.sadd(key, user_id)
    r.expire(key, 86400 * 7)  # Keep for 7 days

def unique_visitor_count(page_id, day=None):
    day = day or date.today().isoformat()
    return r.scard(f'visitors:{page_id}:{day}')

def has_visited(page_id, user_id, day=None):
    day = day or date.today().isoformat()
    return r.sismember(f'visitors:{page_id}:{day}', user_id)

# Usage
track_visit('home', 'user:42')
track_visit('home', 'user:55')
track_visit('home', 'user:42')  # duplicate - ignored

print(unique_visitor_count('home'))  # 2
print(has_visited('home', 'user:42'))  # True
```

## Online Users and Presence

```python
def mark_online(user_id):
    r.sadd('users:online', user_id)
    # Set per-user expiry key to handle disconnections
    r.set(f'online:{user_id}', 1, ex=60)

def mark_offline(user_id):
    r.srem('users:online', user_id)

def is_online(user_id):
    return r.sismember('users:online', user_id)

def get_online_users():
    return r.smembers('users:online')

def online_count():
    return r.scard('users:online')
```

## Follow/Follower System

```python
def follow(follower_id, target_id):
    r.sadd(f'following:{follower_id}', target_id)
    r.sadd(f'followers:{target_id}', follower_id)

def unfollow(follower_id, target_id):
    r.srem(f'following:{follower_id}', target_id)
    r.srem(f'followers:{target_id}', follower_id)

def mutual_follows(user1_id, user2_id):
    """Find users that both users follow."""
    return r.sinter(f'following:{user1_id}', f'following:{user2_id}')

def suggested_follows(user_id):
    """Friends of friends - people your follows follow."""
    following = r.smembers(f'following:{user_id}')
    suggestions = set()
    for followed_id in following:
        their_follows = r.smembers(f'following:{followed_id}')
        suggestions.update(their_follows)
    suggestions.discard(user_id)  # remove self
    suggestions -= following      # remove already following
    return suggestions
```

## Checking Multiple Memberships

```bash
# SMISMEMBER: Check multiple members at once (Redis 6.2+)
SMISMEMBER tags:post:101 "redis" "python" "beginner"
# 1) (integer) 1   <- redis: yes
# 2) (integer) 0   <- python: no
# 3) (integer) 1   <- beginner: yes
```

## Randomly Selecting Items

```bash
# Pick 3 random tags (without removing)
SRANDMEMBER tags:post:101 3

# Random selection: get 1 random winner from a set
SPOP contest:entries 1
```

## Sets vs. Sorted Sets vs. Lists

| Need | Use |
|---|---|
| Unique collection, no order | Set |
| Unique collection, ordered by score | Sorted Set |
| Ordered collection, duplicates allowed | List |
| Fast membership check | Set (SISMEMBER) |

## Summary

Redis sets provide O(1) membership testing, automatic deduplication, and powerful set theory operations (union, intersection, difference) that are hard to replicate efficiently with other data structures. Common use cases include unique visitor tracking, online user presence, tagging systems, and social graph features like follow/follower relationships. When you need ordering alongside uniqueness, use sorted sets instead.
