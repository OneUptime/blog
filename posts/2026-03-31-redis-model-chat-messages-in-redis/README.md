# How to Model Chat Messages in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Chat, Messaging, Stream, Real-Time, Data Modeling

Description: Model real-time chat messages in Redis using Streams and sorted sets for ordered message storage, delivery tracking, and efficient history retrieval.

---

## Choosing the Right Data Structure

Redis offers two main approaches for chat message storage:

- **Redis Streams** - ideal for message queues, consumer groups, and ordered delivery with persistence
- **Sorted Sets** - simpler approach using timestamps as scores for ordered message history

For production chat systems, Redis Streams is the preferred approach.

## Modeling Chat with Redis Streams

Each chat room gets its own stream. Messages are appended with auto-generated IDs:

```bash
# Send a message to room "chat:room:general"
XADD chat:room:general * sender "alice" text "Hello everyone!" timestamp "1711900000"
XADD chat:room:general * sender "bob" text "Hey Alice!" timestamp "1711900060"
XADD chat:room:general * sender "carol" text "Hi all!" timestamp "1711900120"
```

## Reading Messages

Read the last 10 messages from a room:

```bash
XREVRANGE chat:room:general + - COUNT 10
```

Read messages after a specific ID (polling for new messages):

```bash
XREAD COUNT 50 STREAMS chat:room:general 1711900000-0
```

Block and wait for new messages:

```bash
XREAD BLOCK 5000 COUNT 10 STREAMS chat:room:general $
```

## Direct Messages with Streams

Model DMs using a stream keyed by the sorted pair of user IDs:

```bash
# DM between user:1 and user:2 - always use lower ID first
XADD dm:1:2 * sender "1" text "Hey, how are you?" read "false"
XADD dm:1:2 * sender "2" text "Doing great, thanks!" read "false"
```

## Message Read Receipts

Track the last-read message ID per user per room using a hash:

```bash
# Alice last read message at ID 1711900060-0
HSET read:receipts:general alice 1711900060-0
HSET read:receipts:general bob 1711900060-0
```

Count unread messages for a user by reading from their last-read position:

```bash
# Get unread messages for alice (messages after her last-read ID)
XRANGE chat:room:general (1711900060-0 +
```

## Consumer Groups for Message Delivery

Use consumer groups to ensure each subscriber processes every message at least once:

```bash
# Create consumer group
XGROUP CREATE chat:room:general subscribers $ MKSTREAM

# Consumer alice reads pending messages
XREADGROUP GROUP subscribers alice COUNT 10 STREAMS chat:room:general >

# Acknowledge delivery
XACK chat:room:general subscribers <message-id>
```

## Python Example - Chat Service

```python
import redis
import time

r = redis.Redis(decode_responses=True)

def send_message(room, sender, text):
    return r.xadd(f"chat:room:{room}", {
        "sender": sender,
        "text": text,
        "ts": str(int(time.time()))
    })

def get_history(room, count=50):
    messages = r.xrevrange(f"chat:room:{room}", count=count)
    return [{"id": mid, **fields} for mid, fields in reversed(messages)]

def get_new_messages(room, last_id="$"):
    result = r.xread({f"chat:room:{room}": last_id}, count=100, block=0)
    if not result:
        return []
    _, messages = result[0]
    return [{"id": mid, **fields} for mid, fields in messages]

def mark_read(room, user, message_id):
    r.hset(f"read:receipts:{room}", user, message_id)

msg_id = send_message("general", "alice", "Hello!")
send_message("general", "bob", "Hi Alice!")

history = get_history("general")
for msg in history:
    print(f"[{msg['sender']}]: {msg['text']}")

mark_read("general", "alice", history[-1]["id"])
```

## Capping Stream Length

Trim the stream to avoid unbounded growth - keep the last 10,000 messages:

```bash
XADD chat:room:general MAXLEN ~ 10000 * sender "dave" text "Trimmed stream"
```

Or trim manually:

```bash
XTRIM chat:room:general MAXLEN ~ 10000
```

## Online Presence

Track online users with a sorted set and TTL refresh:

```bash
# User connects - score is current timestamp
ZADD online:users 1711900000 "alice"
ZADD online:users 1711900000 "bob"

# Remove users inactive for >60 seconds
ZREMRANGEBYSCORE online:users -inf 1711899940

# Get all online users
ZRANGE online:users 0 -1
```

## Summary

Redis Streams are the ideal data structure for chat message modeling, providing ordered, persistent message storage with consumer group delivery guarantees. Sorted sets complement streams for tracking online presence, and hashes efficiently track per-user read receipts. Stream trimming prevents unbounded memory growth while keeping recent history available.
