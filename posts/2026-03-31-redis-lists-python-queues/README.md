# How to Use Redis Lists in Python for Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, List, Queue, redis-py

Description: Implement FIFO and LIFO queues in Python using Redis lists with redis-py, covering LPUSH, RPOP, BLPOP, and bounded queue patterns for background jobs.

---

Redis lists are linked lists of string values that support O(1) push and pop from both ends. They are a natural fit for task queues, work queues, and activity feeds without the overhead of a full message broker.

## Basic List Operations

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Push to the right (tail) - use as a queue
r.rpush("jobs:email", "job:1", "job:2", "job:3")

# Pop from the left (head) - FIFO order
job = r.lpop("jobs:email")
print(job)  # job:1

# Check length
print(r.llen("jobs:email"))  # 2

# Peek without removing
print(r.lrange("jobs:email", 0, -1))  # All elements
print(r.lindex("jobs:email", 0))      # First element
```

## FIFO Queue (Producer/Consumer)

```python
# Producer
def enqueue(task: str):
    r.rpush("tasks", task)

# Consumer
def dequeue() -> str | None:
    return r.lpop("tasks")

enqueue("send_welcome_email:user:42")
enqueue("resize_image:upload:99")

while task := dequeue():
    print(f"Processing: {task}")
```

## Blocking Pop (Efficient Consumer)

Instead of polling in a tight loop, use `BLPOP` to block until a message arrives:

```python
def blocking_consumer(queues: list[str], timeout: int = 5):
    while True:
        result = r.blpop(queues, timeout=timeout)
        if result is None:
            print("No messages, waiting...")
            continue
        queue_name, task = result
        print(f"Queue: {queue_name}  Task: {task}")
        process(task)

def process(task: str):
    print(f"Done: {task}")

blocking_consumer(["tasks:high", "tasks:normal"])
```

`BLPOP` accepts multiple queue names and returns the first available message, making it easy to implement priority queues.

## Bounded Queue (Fixed Capacity)

Use `LTRIM` after each push to cap the list length:

```python
MAX_LEN = 1000

def enqueue_bounded(item: str):
    pipe = r.pipeline()
    pipe.rpush("events:log", item)
    pipe.ltrim("events:log", -MAX_LEN, -1)  # Keep last 1000
    pipe.execute()
```

## Stack (LIFO) with LPUSH + LPOP

```python
# Push to the left
r.lpush("undo:stack", "action:create:obj:1")
r.lpush("undo:stack", "action:update:obj:1")

# Pop from the left (most recent first)
last_action = r.lpop("undo:stack")
print(last_action)  # action:update:obj:1
```

## Reliable Queue with LMOVE

`LMOVE` atomically moves an item from one list to another, useful for a reliable queue pattern where in-progress tasks are tracked:

```python
def claim_task() -> str | None:
    # Move from pending to in-progress atomically
    return r.lmove("tasks:pending", "tasks:inprogress", "LEFT", "RIGHT")

def complete_task(task: str):
    r.lrem("tasks:inprogress", 1, task)

task = claim_task()
if task:
    try:
        process(task)
        complete_task(task)
    except Exception:
        # On failure, move back to pending
        r.lmove("tasks:inprogress", "tasks:pending", "LEFT", "RIGHT")
```

## Summary

Redis lists support FIFO queues with `RPUSH`/`LPOP`, blocking consumers with `BLPOP`, bounded circular buffers with `LTRIM`, and stacks with `LPUSH`/`LPOP`. Use `LMOVE` for reliable queues where in-flight tasks need to be tracked separately from pending ones.
