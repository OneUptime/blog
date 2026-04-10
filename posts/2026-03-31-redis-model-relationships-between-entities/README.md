# How to Model Relationships Between Entities in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Modeling, Set, Hash, Relationship

Description: Learn how to model one-to-many and many-to-many relationships in Redis using sets and hash lookups, with practical examples for users, posts, and tags.

---

Redis does not have foreign keys or joins. Relationships between entities are modeled explicitly using sets (for ID collections) and hashes (for entity data). This guide covers the common patterns for one-to-one, one-to-many, and many-to-many relationships.

## Key Naming Convention

Adopt a consistent naming pattern before you start:

```text
entity:{id}              -> hash of entity attributes
entity:{id}:{relation}   -> set of related entity IDs
index:{field}:{value}    -> set of entity IDs matching a value
```

## One-to-One Relationship

Store the related entity ID as a hash field:

```bash
# User has one profile
HSET user:1 name "Alice" email "alice@example.com" profile_id "profile:1"
HSET profile:1 bio "Engineer" avatar "alice.jpg" user_id "1"

# Look up profile for user
profile_id=$(redis-cli HGET user:1 profile_id)
redis-cli HGETALL $profile_id
```

## One-to-Many Relationship

Use a set to store the collection of child IDs:

```bash
# User has many posts
HSET user:1 name "Alice"
HSET post:101 title "Redis Tips" author_id "1"
HSET post:102 title "Caching Guide" author_id "1"

# Link posts to user
SADD user:1:posts 101 102
```

```python
import redis, json

r = redis.Redis()

def get_user_posts(user_id):
    post_ids = r.smembers(f"user:{user_id}:posts")
    pipe = r.pipeline()
    for pid in post_ids:
        pipe.hgetall(f"post:{pid.decode()}")
    posts = pipe.execute()
    return [{k.decode(): v.decode() for k, v in p.items()} for p in posts if p]

def add_post(user_id, post_id, title):
    pipe = r.pipeline()
    pipe.hset(f"post:{post_id}", mapping={"title": title, "author_id": str(user_id)})
    pipe.sadd(f"user:{user_id}:posts", post_id)
    pipe.execute()
```

## Many-to-Many Relationship

Use two sets - one on each side of the relationship - for bidirectional traversal:

```bash
# Posts and tags (many-to-many)
SADD post:101:tags "redis" "caching" "backend"
SADD post:102:tags "redis" "performance"

# Reverse index: tag -> posts
SADD tag:redis:posts 101 102
SADD tag:caching:posts 101

# Find all posts tagged "redis"
SMEMBERS tag:redis:posts

# Find posts tagged with BOTH "redis" AND "caching"
SINTER tag:redis:posts tag:caching:posts
```

```python
def tag_post(post_id, tag):
    pipe = r.pipeline()
    pipe.sadd(f"post:{post_id}:tags", tag)
    pipe.sadd(f"tag:{tag}:posts", post_id)
    pipe.execute()

def untag_post(post_id, tag):
    pipe = r.pipeline()
    pipe.srem(f"post:{post_id}:tags", tag)
    pipe.srem(f"tag:{tag}:posts", post_id)
    pipe.execute()

def posts_with_all_tags(tags):
    """Find posts that have ALL given tags."""
    keys = [f"tag:{t}:posts" for t in tags]
    return r.sinter(keys)
```

## Sorted Set for Ordered Relationships

When the relationship has an ordering (e.g., a user's feed sorted by time):

```bash
# User follows other users; store as sorted set by follow timestamp
ZADD user:1:following 1711880000 2  # User 1 follows User 2
ZADD user:1:following 1711880100 3  # User 1 follows User 3

# Reverse: followers list
ZADD user:2:followers 1711880000 1
```

```python
def follow(follower_id, followed_id, timestamp):
    pipe = r.pipeline()
    pipe.zadd(f"user:{follower_id}:following", {str(followed_id): timestamp})
    pipe.zadd(f"user:{followed_id}:followers", {str(follower_id): timestamp})
    pipe.execute()

def mutual_followers(user_a, user_b):
    """Users who follow both a and b."""
    a_followers = r.zrange(f"user:{user_a}:followers", 0, -1)
    b_followers = r.zrange(f"user:{user_b}:followers", 0, -1)
    return set(a_followers) & set(b_followers)
```

## Maintaining Referential Integrity

Redis has no foreign keys. Enforce consistency in application code:

```python
def delete_user(user_id):
    # Remove user's posts and their tag indexes
    post_ids = r.smembers(f"user:{user_id}:posts")
    pipe = r.pipeline()
    for pid in post_ids:
        pid = pid.decode()
        tags = r.smembers(f"post:{pid}:tags")
        for tag in tags:
            pipe.srem(f"tag:{tag.decode()}:posts", pid)
        pipe.delete(f"post:{pid}:tags")
        pipe.delete(f"post:{pid}")
    pipe.delete(f"user:{user_id}:posts")
    pipe.delete(f"user:{user_id}")
    pipe.execute()
```

## Summary

Redis models relationships using sets for collections of related IDs and hashes for entity data. One-to-many relationships use a single set per parent, while many-to-many relationships require sets on both sides for bidirectional queries. For ordered relationships, sorted sets with timestamps as scores enable chronological traversal. Always maintain both sides of a relationship in a single pipeline to keep the data consistent.
