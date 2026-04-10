# How to Build a User Mention System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Mention, List, Notification

Description: Implement a user mention system with Redis - extract @mentions from content, notify mentioned users, and track mention history with efficient list-based storage.

---

When a user @mentions someone in a post or comment, the mentioned user should receive a notification. Redis efficiently handles mention parsing, queuing, and deduplication within the same piece of content.

## Data Model

```text
mentions:{userId}          -> List of mention event IDs
mention:{mentionId}        -> Hash: id, content_id, actor_id, username, timestamp, read
mention_unread:{userId}    -> Counter for unread mentions
```

## Parsing and Storing Mentions

```python
import redis
import re
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MENTION_PATTERN = re.compile(r'@(\w+)')

def extract_mentions(text):
    return set(MENTION_PATTERN.findall(text))

def resolve_username_to_id(username):
    # Look up user ID from username (example using Redis hash)
    return r.hget("username:index", username)

def process_mentions(content_id, actor_id, text):
    usernames = extract_mentions(text)
    created = []
    for username in usernames:
        user_id = resolve_username_to_id(username)
        if not user_id or user_id == actor_id:
            continue  # Skip unknown users and self-mentions

        mention_id = str(uuid.uuid4())
        mention_data = {
            "id": mention_id,
            "content_id": content_id,
            "actor_id": actor_id,
            "username": username,
            "timestamp": str(time.time()),
            "read": "0",
        }
        pipe = r.pipeline()
        pipe.hset(f"mention:{mention_id}", mapping=mention_data)
        pipe.lpush(f"mentions:{user_id}", mention_id)
        pipe.ltrim(f"mentions:{user_id}", 0, 999)
        pipe.incr(f"mention_unread:{user_id}")
        pipe.execute()
        created.append(mention_id)
    return created
```

## Fetching Mentions

```python
def get_mentions(user_id, page=0, per_page=20):
    start = page * per_page
    end = start + per_page - 1
    mention_ids = r.lrange(f"mentions:{user_id}", start, end)
    pipe = r.pipeline()
    for mid in mention_ids:
        pipe.hgetall(f"mention:{mid}")
    return [m for m in pipe.execute() if m]

def get_unread_mention_count(user_id):
    count = r.get(f"mention_unread:{user_id}")
    return int(count) if count else 0
```

## Marking Mentions as Read

```python
def mark_mention_read(user_id, mention_id):
    r.hset(f"mention:{mention_id}", "read", "1")

def mark_all_mentions_read(user_id):
    mention_ids = r.lrange(f"mentions:{user_id}", 0, 49)  # Read latest 50
    pipe = r.pipeline()
    for mid in mention_ids:
        pipe.hset(f"mention:{mid}", "read", "1")
    pipe.set(f"mention_unread:{user_id}", 0)
    pipe.execute()
```

## Mention Deduplication

Avoid sending multiple mention notifications for the same content and user:

```python
def process_deduplicated_mention(content_id, actor_id, user_id):
    dedup_key = f"mention_dedup:{content_id}:{user_id}"
    if r.set(dedup_key, "1", nx=True, ex=3600):
        mention_id = str(uuid.uuid4())
        mention_data = {
            "id": mention_id,
            "content_id": content_id,
            "actor_id": actor_id,
            "timestamp": str(time.time()),
            "read": "0",
        }
        pipe = r.pipeline()
        pipe.hset(f"mention:{mention_id}", mapping=mention_data)
        pipe.lpush(f"mentions:{user_id}", mention_id)
        pipe.incr(f"mention_unread:{user_id}")
        pipe.execute()
```

## Example Usage

```bash
# Register username->ID mapping
HSET username:index alice user:1

# Store mention
HSET mention:abc content_id post:42 actor_id user:2 username alice read 0
LPUSH mentions:user:1 abc
INCR mention_unread:user:1

# Get unread count
GET mention_unread:user:1   # Returns 1
```

## Summary

A Redis-backed mention system uses Lists for ordered mention history, Hashes for mention metadata, and counters for unread badges. Deduplication with NX-flagged keys with TTLs prevents duplicate mention notifications when content is edited. Combine with a pub/sub channel for real-time push delivery to connected clients.
