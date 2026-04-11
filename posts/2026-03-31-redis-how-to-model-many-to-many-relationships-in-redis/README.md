# How to Model Many-to-Many Relationships in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Modeling, Set, Relationship, NoSQL

Description: Learn how to model many-to-many relationships in Redis using sets, with practical examples for users-roles, posts-tags, and follower graphs.

---

## Understanding Many-to-Many in Redis

Relational databases handle many-to-many relationships with a join table. Redis has no native joins, but its set operations (SUNION, SINTER, SDIFF) make many-to-many relationships efficient and expressive.

The key pattern is to maintain two sets per relationship:

- A forward set: `entity_a:{id}:entity_b_ids` - the IDs of B entities related to A
- A reverse set: `entity_b:{id}:entity_a_ids` - the IDs of A entities related to B

This bidirectional indexing allows lookups in either direction with O(1) or O(n) complexity.

## Example: Users and Roles

Model the relationship where users have multiple roles and roles have multiple users.

```bash
# Assign roles to users
SADD user:1:roles admin editor
SADD user:2:roles editor viewer
SADD user:3:roles admin viewer

# Maintain reverse index - which users have each role
SADD role:admin:users 1 3
SADD role:editor:users 1 2
SADD role:viewer:users 2 3
```

Query patterns:

```bash
# Get all roles for a user
SMEMBERS user:1:roles
# 1) "admin"
# 2) "editor"

# Get all users with the admin role
SMEMBERS role:admin:users
# 1) "1"
# 2) "3"

# Find users with both admin AND editor roles
SINTER role:admin:users role:editor:users
# 1) "1"

# Find users with either admin OR viewer roles
SUNION role:admin:users role:viewer:users
# 1) "1"
# 2) "2"
# 3) "3"
```

## Adding and Removing Relationships

Always update both sides of the relationship atomically using a Lua script or pipeline:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def assign_role(user_id: int, role: str):
    pipe = r.pipeline()
    pipe.sadd(f"user:{user_id}:roles", role)
    pipe.sadd(f"role:{role}:users", user_id)
    pipe.execute()

def remove_role(user_id: int, role: str):
    pipe = r.pipeline()
    pipe.srem(f"user:{user_id}:roles", role)
    pipe.srem(f"role:{role}:users", user_id)
    pipe.execute()

assign_role(1, "admin")
assign_role(1, "editor")
remove_role(1, "editor")
```

## Example: Posts and Tags

Blog posts can have many tags; tags can apply to many posts.

```bash
# Tag posts
SADD post:101:tags redis caching performance
SADD post:102:tags redis python tutorial
SADD post:103:tags caching cdn performance

# Reverse index
SADD tag:redis:posts 101 102
SADD tag:caching:posts 101 103
SADD tag:performance:posts 101 103
SADD tag:python:posts 102

# Find posts tagged with both redis and caching
SINTER tag:redis:posts tag:caching:posts
# 1) "101"

# Find all posts tagged redis or python
SUNION tag:redis:posts tag:python:posts
# 1) "101"
# 2) "102"

# Find posts tagged caching but not redis
SDIFF tag:caching:posts tag:redis:posts
# 1) "103"
```

## Storing Results for Reuse

Use SINTERSTORE and SUNIONSTORE to materialize intermediate results:

```bash
# Cache the intersection result with a TTL
SINTERSTORE temp:redis-and-caching:posts tag:redis:posts tag:caching:posts
EXPIRE temp:redis-and-caching:posts 300

# Read the cached result
SMEMBERS temp:redis-and-caching:posts
```

## Example: Social Graph - Followers

Model mutual following (Twitter-style):

```bash
# user:1 follows user:2 and user:3
SADD user:1:following 2 3
SADD user:2:followers 1
SADD user:3:followers 1

# user:2 follows user:1 and user:3
SADD user:2:following 1 3
SADD user:1:followers 2
SADD user:3:followers 2
```

Mutual friends (users who follow each other):

```bash
SINTER user:1:following user:1:followers
# returns users that both follow user:1 AND are followed by user:1
```

Suggested follows (friends of friends):

```bash
# Get friends of user:2 (people user:2 follows)
# Then find people they follow that user:1 doesn't already follow
SDIFFSTORE temp:suggestions:1 user:2:following user:1:following
SREM temp:suggestions:1 1  # remove user:1 themselves
```

## Counting Relationships

SCARD provides O(1) count of set members:

```bash
# How many roles does user:1 have?
SCARD user:1:roles

# How many posts are tagged with redis?
SCARD tag:redis:posts

# How many followers does user:3 have?
SCARD user:3:followers
```

## Using Sorted Sets for Weighted Relationships

For relationships with weights or timestamps, use sorted sets:

```bash
# User follows with timestamp (when they started following)
ZADD user:1:following 1711920000 2
ZADD user:1:following 1711930000 3

# Get recently followed users
ZRANGE user:1:following 0 9 REV WITHSCORES

# Get users followed since a specific date
ZRANGE user:1:following 1711920000 +inf BYSCORE
```

## Summary

Modeling many-to-many relationships in Redis uses bidirectional set keys to enable lookups from both sides of the relationship. Set operations like SINTER, SUNION, and SDIFF enable powerful filtering without joins. Always update both sides of the relationship atomically using pipelines, and use SINTERSTORE/SUNIONSTORE to cache frequently computed set operations. For ordered or weighted relationships, sorted sets extend this pattern with score-based querying.
