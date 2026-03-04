# How to Use Redis Sets for Unique Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sets, Data Structures, Deduplication, Backend, Performance

Description: Master Redis sets for unique collections, membership testing, and set operations. Learn practical patterns for tags, followers, permissions, and deduplication.

---

Redis sets store unique, unordered collections of strings. They provide O(1) membership testing and powerful set operations like intersection, union, and difference. This makes them ideal for tags, followers, permissions, and deduplication scenarios.

## Basic Set Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Add members
r.sadd('fruits', 'apple', 'banana', 'orange')
r.sadd('fruits', 'apple')  # Ignored - already exists

# Check membership (O(1))
is_member = r.sismember('fruits', 'apple')
print(f"Has apple: {is_member}")  # True

# Get all members
members = r.smembers('fruits')
print(f"All fruits: {members}")  # {'apple', 'banana', 'orange'}

# Get count
count = r.scard('fruits')
print(f"Count: {count}")  # 3

# Remove members
r.srem('fruits', 'banana')

# Pop random member
random_fruit = r.spop('fruits')
print(f"Popped: {random_fruit}")

# Get random member without removing
random_fruit = r.srandmember('fruits')
print(f"Random: {random_fruit}")

# Get multiple random members
random_fruits = r.srandmember('fruits', 2)
print(f"Random 2: {random_fruits}")
```

## Set Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Setup example sets
r.sadd('set:a', 1, 2, 3, 4, 5)
r.sadd('set:b', 4, 5, 6, 7, 8)
r.sadd('set:c', 5, 6, 7, 9, 10)

# Intersection - members in ALL sets
common = r.sinter('set:a', 'set:b')
print(f"A AND B: {common}")  # {'4', '5'}

common_all = r.sinter('set:a', 'set:b', 'set:c')
print(f"A AND B AND C: {common_all}")  # {'5'}

# Union - members in ANY set
all_members = r.sunion('set:a', 'set:b')
print(f"A OR B: {all_members}")  # {'1','2','3','4','5','6','7','8'}

# Difference - members in first set but not others
only_a = r.sdiff('set:a', 'set:b')
print(f"A - B: {only_a}")  # {'1', '2', '3'}

# Store results in new set
r.sinterstore('set:common', 'set:a', 'set:b')
r.sunionstore('set:all', 'set:a', 'set:b', 'set:c')
r.sdiffstore('set:only_a', 'set:a', 'set:b')
```

## Practical Patterns

### User Followers/Following

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def follow(follower_id, followed_id):
    """User A follows User B"""
    r.sadd(f'user:{follower_id}:following', followed_id)
    r.sadd(f'user:{followed_id}:followers', follower_id)

def unfollow(follower_id, followed_id):
    """User A unfollows User B"""
    r.srem(f'user:{follower_id}:following', followed_id)
    r.srem(f'user:{followed_id}:followers', follower_id)

def get_followers(user_id):
    """Get all followers"""
    return r.smembers(f'user:{user_id}:followers')

def get_following(user_id):
    """Get all users being followed"""
    return r.smembers(f'user:{user_id}:following')

def is_following(follower_id, followed_id):
    """Check if A follows B"""
    return r.sismember(f'user:{follower_id}:following', followed_id)

def get_mutual_friends(user_a, user_b):
    """Get users who follow both A and B"""
    return r.sinter(
        f'user:{user_a}:followers',
        f'user:{user_b}:followers'
    )

def get_follow_suggestions(user_id, limit=10):
    """Suggest users to follow based on friends of friends"""
    following = r.smembers(f'user:{user_id}:following')

    # Collect friends of friends
    suggestions = set()
    for friend_id in following:
        friends_following = r.smembers(f'user:{friend_id}:following')
        suggestions.update(friends_following)

    # Remove already following and self
    suggestions.discard(user_id)
    suggestions -= following

    return list(suggestions)[:limit]

# Usage
follow('alice', 'bob')
follow('alice', 'charlie')
follow('bob', 'charlie')
follow('bob', 'diana')

print(f"Alice follows: {get_following('alice')}")
print(f"Charlie's followers: {get_followers('charlie')}")
print(f"Mutual (Alice & Bob): {get_mutual_friends('alice', 'bob')}")
```

### Tag System

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def add_tags(item_id, *tags):
    """Add tags to an item"""
    if tags:
        # Add tags to item's tag set
        r.sadd(f'item:{item_id}:tags', *tags)

        # Add item to each tag's item set
        for tag in tags:
            r.sadd(f'tag:{tag}:items', item_id)

def remove_tag(item_id, tag):
    """Remove tag from item"""
    r.srem(f'item:{item_id}:tags', tag)
    r.srem(f'tag:{tag}:items', item_id)

def get_item_tags(item_id):
    """Get all tags for an item"""
    return r.smembers(f'item:{item_id}:tags')

def get_items_by_tag(tag):
    """Get all items with a tag"""
    return r.smembers(f'tag:{tag}:items')

def get_items_by_all_tags(*tags):
    """Get items with ALL specified tags"""
    keys = [f'tag:{tag}:items' for tag in tags]
    return r.sinter(*keys)

def get_items_by_any_tag(*tags):
    """Get items with ANY of the specified tags"""
    keys = [f'tag:{tag}:items' for tag in tags]
    return r.sunion(*keys)

def get_related_tags(tag, limit=10):
    """Get tags commonly used with this tag"""
    items = get_items_by_tag(tag)

    tag_counts = {}
    for item_id in items:
        item_tags = get_item_tags(item_id)
        for t in item_tags:
            if t != tag:
                tag_counts[t] = tag_counts.get(t, 0) + 1

    sorted_tags = sorted(tag_counts.items(), key=lambda x: -x[1])
    return [t for t, c in sorted_tags[:limit]]

# Usage
add_tags('post:1', 'python', 'redis', 'tutorial')
add_tags('post:2', 'python', 'django', 'web')
add_tags('post:3', 'redis', 'caching', 'performance')

print(f"Python posts: {get_items_by_tag('python')}")
print(f"Python AND Redis: {get_items_by_all_tags('python', 'redis')}")
print(f"Related to python: {get_related_tags('python')}")
```

### Deduplication

```python
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def dedupe_url(url):
    """Check if URL was already processed"""
    # Use hash for consistent key length
    url_hash = hashlib.md5(url.encode()).hexdigest()

    # SADD returns 1 if new, 0 if exists
    is_new = r.sadd('processed:urls', url_hash)
    return bool(is_new)

def process_urls(urls):
    """Process only new URLs"""
    new_urls = []
    for url in urls:
        if dedupe_url(url):
            new_urls.append(url)

    return new_urls

# Event deduplication
def should_process_event(event_id, window_key='events:today'):
    """Check if event should be processed (dedupe)"""
    return bool(r.sadd(window_key, event_id))

def reset_event_window(window_key):
    """Reset deduplication window"""
    r.delete(window_key)

# Usage
urls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page1',  # Duplicate
]

unique = process_urls(urls)
print(f"Unique URLs: {len(unique)}")  # 2
```

### Online Status Tracking

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def user_online(user_id):
    """Mark user as online"""
    r.sadd('users:online', user_id)

def user_offline(user_id):
    """Mark user as offline"""
    r.srem('users:online', user_id)

def is_online(user_id):
    """Check if user is online"""
    return r.sismember('users:online', user_id)

def get_online_users():
    """Get all online users"""
    return r.smembers('users:online')

def get_online_count():
    """Get count of online users"""
    return r.scard('users:online')

def get_online_friends(user_id):
    """Get user's friends who are online"""
    return r.sinter(
        f'user:{user_id}:friends',
        'users:online'
    )

# Usage
user_online('alice')
user_online('bob')
user_online('charlie')

print(f"Online users: {get_online_count()}")
print(f"Is alice online? {is_online('alice')}")

user_offline('bob')
print(f"Online users: {get_online_users()}")
```

## Memory Optimization

Sets use special encoding for small integer sets:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Integer set uses intset encoding (very compact)
r.sadd('int_set', *range(100))
encoding = r.object('encoding', 'int_set')
print(f"Integer set encoding: {encoding}")  # intset

# String set uses hashtable
r.sadd('string_set', *[f'item_{i}' for i in range(100)])
encoding = r.object('encoding', 'string_set')
print(f"String set encoding: {encoding}")  # hashtable

# Configure in redis.conf
# set-max-intset-entries 512
```

## Scanning Large Sets

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def scan_set(key, match=None, count=100):
    """Iterate large set without blocking"""
    cursor = 0
    while True:
        cursor, members = r.sscan(key, cursor, match=match, count=count)
        for member in members:
            yield member
        if cursor == 0:
            break

# Usage
r.sadd('large_set', *[f'item_{i}' for i in range(10000)])

for item in scan_set('large_set', match='item_1*'):
    print(item)
```

## Summary

| Operation | Command | Complexity |
|-----------|---------|------------|
| Add | SADD | O(N) |
| Remove | SREM | O(N) |
| Check membership | SISMEMBER | O(1) |
| Get all | SMEMBERS | O(N) |
| Count | SCARD | O(1) |
| Intersection | SINTER | O(N*M) |
| Union | SUNION | O(N) |
| Difference | SDIFF | O(N) |

Best practices:
- Use sets for unique collections
- Leverage O(1) membership testing
- Use set operations for complex queries
- Store integer sets when possible for memory efficiency
- Use SSCAN for iterating large sets
- Consider sorted sets when you need ordering
