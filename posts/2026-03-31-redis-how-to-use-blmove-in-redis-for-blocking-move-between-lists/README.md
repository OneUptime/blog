# How to Use BLMOVE in Redis for Blocking Move Between Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, List, BLMOVE, Queue, Reliability

Description: Learn how to use BLMOVE in Redis to atomically and reliably move elements between lists with blocking support for building safe message queues.

---

## What Is BLMOVE

`BLMOVE` is the blocking variant of `LMOVE`. It atomically pops an element from the source list and pushes it to the destination list. If the source list is empty, the command blocks until an element becomes available or the timeout expires.

This atomicity makes BLMOVE ideal for building reliable queues where messages should never be lost - an element is either in the source or the destination, never missing.

## Syntax

```text
BLMOVE source destination LEFT|RIGHT LEFT|RIGHT timeout
```

- `source` - the list to pop from
- `destination` - the list to push to
- First direction (`LEFT|RIGHT`) - from which end to pop
- Second direction (`LEFT|RIGHT`) - to which end to push
- `timeout` - seconds to block; `0` blocks indefinitely

Returns the moved element, or nil on timeout.

## Basic Usage

### Move from One Queue to Another

```bash
# Add items to source
redis-cli RPUSH inbox "message:1" "message:2"

# Move from left of inbox to left of processing (non-blocking because inbox has data)
redis-cli BLMOVE inbox processing LEFT LEFT 5
```

```text
"message:1"
```

### Blocking Until Element Arrives

In one terminal, block on an empty source:

```bash
redis-cli BLMOVE pending processing LEFT LEFT 10
```

In another terminal, push an element:

```bash
redis-cli RPUSH pending "task:1"
```

The first terminal immediately returns:

```text
"task:1"
```

## Reliable Queue Pattern

BLMOVE is the foundation of the reliable queue pattern - a message is moved to a processing list before work begins. If the worker crashes, the message remains in the processing list and can be recovered:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def reliable_worker():
    while True:
        # Atomically move from pending to processing
        job = r.blmove('pending', 'processing', 0, 'LEFT', 'LEFT')
        if job:
            try:
                process_job(job)
                # Remove from processing after successful completion
                r.lrem('processing', 1, job)
            except Exception as e:
                print(f"Job failed: {e}")
                # Job stays in processing list for recovery

def process_job(job):
    print(f"Processing: {job}")

def recover_stuck_jobs():
    # Requeue jobs stuck in processing
    while True:
        job = r.rpoplpush('processing', 'pending')
        if not job:
            break
    print("Recovery complete")
```

## Circular Buffer with BLMOVE

BLMOVE can move elements in a circular fashion, creating a rotating list:

```bash
# Create a circular list
redis-cli RPUSH tasks "task:a" "task:b" "task:c"

# Rotate: pop from left, push to right - same list acts as circular buffer
redis-cli BLMOVE tasks tasks LEFT RIGHT 5
```

```text
"task:a"
```

After this, the list is: `["task:b", "task:c", "task:a"]`

## Routing Between Queues

Use BLMOVE to route messages from a central queue to worker-specific queues:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def router():
    """Move messages from central queue to worker-specific queues."""
    while True:
        msg = r.blmove('central_queue', 'router_processing', 5, 'LEFT', 'LEFT')
        if msg:
            data = json.loads(msg)
            worker_id = data.get('worker_id', 'default')
            target_queue = f'worker:{worker_id}:queue'
            r.rpush(target_queue, msg)
            r.lrem('router_processing', 1, msg)
```

## Timeout Handling

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def worker_with_timeout():
    while True:
        result = r.blmove('source', 'processing', 5, 'LEFT', 'LEFT')
        if result is None:
            print("No items in last 5 seconds - doing housekeeping")
            perform_housekeeping()
        else:
            print(f"Processing: {result}")
            do_work(result)
            r.lrem('processing', 1, result)

def perform_housekeeping():
    pass

def do_work(item):
    pass
```

## Comparing BLMOVE vs BRPOPLPUSH

`BRPOPLPUSH` was the original blocking move command but was deprecated in Redis 6.2. `BLMOVE` replaces it with more flexibility:

```bash
# Old way (deprecated)
BRPOPLPUSH source dest timeout

# New way (BLMOVE - equivalent to BRPOPLPUSH)
BLMOVE source dest RIGHT LEFT timeout
```

Always use `BLMOVE` for new code.

## Summary

`BLMOVE` provides atomic, blocking movement of elements between Redis lists, making it the building block for reliable message queues. Its key advantage over BLPOP is that elements are never lost - they move atomically from source to destination. Use it with a separate processing list and recovery logic to guarantee at-least-once delivery in distributed worker systems.
