# How to Use ZPOPMAX and ZPOPMIN in Redis for Priority Queue Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Set, ZPOPMAX, ZPOPMIN, Priority Queue

Description: Learn how to use ZPOPMAX and ZPOPMIN in Redis to atomically pop the highest or lowest scored members from a sorted set for priority queue implementations.

---

## What Are ZPOPMAX and ZPOPMIN

`ZPOPMAX` removes and returns the members with the highest scores from a sorted set. `ZPOPMIN` removes and returns the members with the lowest scores. Both support popping multiple members at once.

These commands are atomic, making them safe for use in concurrent producer-consumer systems.

## Syntax

```text
ZPOPMAX key [count]
ZPOPMIN key [count]
```

- `key` - the sorted set key
- `count` (optional) - number of members to pop; defaults to 1

Returns an array of `[member, score]` pairs. Returns an empty array if the key does not exist.

## Basic Usage

### Pop Highest Score

```bash
redis-cli ZADD tasks 10 "low_priority" 50 "medium_priority" 90 "high_priority" 100 "critical"

redis-cli ZPOPMAX tasks
```

```text
1) "critical"
2) "100"
```

### Pop Lowest Score

```bash
redis-cli ZPOPMIN tasks
```

```text
1) "low_priority"
2) "10"
```

### Pop Multiple Members

```bash
redis-cli ZADD queue 1 "job:a" 2 "job:b" 3 "job:c" 4 "job:d" 5 "job:e"

# Pop top 3 highest scored
redis-cli ZPOPMAX queue 3
```

```text
1) "job:e"
2) "5"
3) "job:d"
4) "4"
5) "job:c"
6) "3"
```

### Empty Set

```bash
redis-cli ZPOPMAX empty_set
```

```text
(empty array)
```

## Priority Queue Implementation

### Basic Priority Task Queue

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def enqueue_task(task_id, task_data, priority):
    """Add a task to the priority queue."""
    r.zadd('task_queue', {json.dumps({'id': task_id, **task_data}): priority})
    print(f"Enqueued task {task_id} with priority {priority}")

def process_next_task():
    """Pop and process the highest priority task."""
    result = r.zpopmax('task_queue')
    if not result:
        return None
    member, score = result[0]
    task = json.loads(member)
    print(f"Processing task {task['id']} (priority: {score})")
    return task

# Add tasks
enqueue_task('t1', {'type': 'email'}, priority=10)
enqueue_task('t2', {'type': 'sms'}, priority=50)
enqueue_task('t3', {'type': 'push'}, priority=100)
enqueue_task('t4', {'type': 'alert'}, priority=90)

# Process in priority order
while True:
    task = process_next_task()
    if not task:
        print("Queue empty")
        break
```

### Deadline-Based Queue (ZPOPMIN)

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def schedule_task(task_id, run_at_timestamp):
    """Schedule a task by deadline (Unix timestamp as score)."""
    r.zadd('scheduled_tasks', {task_id: run_at_timestamp})

def get_due_tasks(batch_size=10):
    """Get tasks that are due now."""
    now = time.time()
    # Pop tasks with score (deadline) <= now
    pipe = r.pipeline()
    pipe.zrangebyscore('scheduled_tasks', '-inf', now, start=0, num=batch_size)
    pipe.zremrangebyscore('scheduled_tasks', '-inf', now)
    results = pipe.execute()
    return results[0]

# Schedule tasks
now = time.time()
schedule_task('reminder:1', now + 60)    # Due in 1 minute
schedule_task('reminder:2', now - 10)   # Already overdue
schedule_task('backup:nightly', now - 5) # Already overdue

due = get_due_tasks()
print(f"Due tasks: {due}")  # ['reminder:2', 'backup:nightly']
```

### Leaderboard - Pop Top N

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

r.zadd('leaderboard', {
    'player:alice': 9500,
    'player:bob': 8200,
    'player:charlie': 9800,
    'player:dave': 7100,
    'player:eve': 9200,
})

def get_podium(n=3):
    """Get top N players (non-destructive peek using ZRANGE)."""
    return r.zrange('leaderboard', 0, n-1, withscores=True, desc=True)

def eliminate_last_place():
    """Remove the lowest scorer from the competition."""
    eliminated = r.zpopmin('leaderboard')
    if eliminated:
        player, score = eliminated[0]
        print(f"Eliminated: {player} with score {score}")
    return eliminated

print("Top 3:", get_podium())
eliminate_last_place()  # Removes dave (7100)
print("After elimination:", get_podium())
```

### Batch Processing with ZPOPMIN

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Add items with processing order score
r.zadd('processing_queue', {f'item:{i}': i for i in range(1, 11)})

def process_batch(batch_size=3):
    """Pop and process a batch of lowest-priority items."""
    items = r.zpopmin('processing_queue', batch_size)
    for member, score in items:
        print(f"Processing {member} (order: {score})")
    return len(items)

processed = process_batch(3)
print(f"Processed {processed} items")
remaining = r.zcard('processing_queue')
print(f"Remaining in queue: {remaining}")
```

## Blocking Variants

For blocking behavior when the queue is empty, use `BZPOPMAX` and `BZPOPMIN`:

```bash
# Block for up to 10 seconds until an element is available
redis-cli BZPOPMAX priority_queue 10
redis-cli BZPOPMIN priority_queue 10
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Block indefinitely until task arrives
result = r.bzpopmax('priority_queue', timeout=0)
if result:
    key, member, score = result
    print(f"Got task from {key}: {member} (priority: {score})")
```

## Summary

`ZPOPMAX` and `ZPOPMIN` atomically remove and return the highest and lowest scoring members from a sorted set, making them the core operations for priority queue implementations. `ZPOPMAX` is ideal for urgent-first processing while `ZPOPMIN` suits deadline-ordered or FIFO-like queues when timestamps are used as scores. Both support batch popping and have blocking variants (`BZPOPMAX`/`BZPOPMIN`) for consumer loop patterns.
