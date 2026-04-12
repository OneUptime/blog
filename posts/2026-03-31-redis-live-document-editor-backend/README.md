# How to Build a Live Document Editor Backend with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Document, Collaboration

Description: Build a live document editor backend using Redis Streams for operation logs, Pub/Sub for instant change broadcasting, and hashes for document state.

---

Collaborative document editing requires three things: storing the current document state, broadcasting changes to all connected editors in real time, and maintaining an ordered log of operations so latecomers can catch up. Redis provides all of this natively.

## Data Model

```bash
# Document content stored in a hash
HSET doc:abc123 content "Hello World" version 5 updated_at 1711900000

# Operation log stored in a stream (durable, ordered)
XADD doc:abc123:ops * type insert pos 5 text " cruel" author user-42 version 6

# Active editors tracked in a set
SADD doc:abc123:editors user-42 user-99
```

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

DOC_PREFIX = "doc"
OPS_SUFFIX = ":ops"
EDITORS_SUFFIX = ":editors"
CHANNEL_SUFFIX = ":changes"
```

## Creating a Document

```python
def create_doc(doc_id: str, initial_content: str, author: str) -> str:
    doc_key = f"{DOC_PREFIX}:{doc_id}"
    pipe = r.pipeline()
    pipe.hset(doc_key, mapping={
        "content": initial_content,
        "version": 1,
        "created_by": author,
        "updated_at": int(time.time())
    })
    pipe.xadd(f"{doc_key}{OPS_SUFFIX}", {
        "type": "create",
        "author": author,
        "content": initial_content,
        "version": 1,
        "ts": int(time.time())
    })
    pipe.execute()
    return doc_id
```

## Applying an Operation

```python
APPLY_OP_SCRIPT = """
local doc_key = KEYS[1]
local ops_key = KEYS[2]
local channel = KEYS[3]
local expected_version = tonumber(ARGV[1])
local op_type = ARGV[2]
local author = ARGV[3]
local pos = tonumber(ARGV[4])
local text = ARGV[5]
local now = ARGV[6]

local current_version = tonumber(redis.call('HGET', doc_key, 'version'))
if current_version ~= expected_version then
    return redis.error_reply('VERSION_CONFLICT:' .. current_version)
end

local content = redis.call('HGET', doc_key, 'content')
local new_content

if op_type == 'insert' then
    local before = string.sub(content, 1, pos)
    local after = string.sub(content, pos + 1)
    new_content = before .. text .. after
elseif op_type == 'delete' then
    local delete_len = tonumber(text)
    local before = string.sub(content, 1, pos)
    local after = string.sub(content, pos + delete_len + 1)
    new_content = before .. after
else
    return redis.error_reply('UNKNOWN_OP')
end

local new_version = current_version + 1
redis.call('HSET', doc_key, 'content', new_content, 'version', new_version, 'updated_at', now)
redis.call('XADD', ops_key, '*', 'type', op_type, 'pos', pos, 'text', text, 'author', author, 'version', new_version, 'ts', now)

local payload = cjson.encode({
    op = op_type, pos = pos, text = text,
    author = author, version = new_version
})
redis.call('PUBLISH', channel, payload)
return payload
"""

apply_op = r.register_script(APPLY_OP_SCRIPT)

def insert_text(doc_id: str, author: str, pos: int, text: str, expected_version: int) -> dict:
    doc_key = f"{DOC_PREFIX}:{doc_id}"
    return json.loads(apply_op(
        keys=[doc_key, f"{doc_key}{OPS_SUFFIX}", f"{doc_key}{CHANNEL_SUFFIX}"],
        args=[expected_version, "insert", author, pos, text, int(time.time())]
    ))
```

## Watching for Changes

```python
def watch_document(doc_id: str, editor_id: str):
    doc_key = f"{DOC_PREFIX}:{doc_id}"
    # Register as active editor
    r.sadd(f"{doc_key}{EDITORS_SUFFIX}", editor_id)
    r.expire(f"{doc_key}{EDITORS_SUFFIX}", 300)

    sub = r.pubsub()
    sub.subscribe(f"{doc_key}{CHANNEL_SUFFIX}")

    for message in sub.listen():
        if message["type"] == "message":
            op = json.loads(message["data"])
            if op["author"] != editor_id:
                print(f"Remote op v{op['version']}: {op['op']} at {op['pos']} by {op['author']}")
```

## Replaying Operation History

```python
def get_ops_since(doc_id: str, since_version: int) -> list:
    doc_key = f"{DOC_PREFIX}:{doc_id}"
    entries = r.xrange(f"{doc_key}{OPS_SUFFIX}", "-", "+")
    return [
        fields for _, fields in entries
        if int(fields.get("version", 0)) > since_version
    ]
```

## Summary

A Redis live document editor backend stores document content in hashes with version numbers, uses Lua scripts for atomic optimistic-concurrency operations, broadcasts changes via Pub/Sub, and persists an ordered operation log in Streams for catch-up and replay. This model supports conflict detection and late-joining editors without external infrastructure.
