# How to Implement Message Priority with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Priority Queue, Message Queue, Sorted Set, Job Processing

Description: Learn how to implement a priority message queue in Redis using sorted sets, with support for multiple priority levels, delayed processing, and consumer patterns.

---

## Priority Queue Design with Sorted Sets

Redis sorted sets are the natural data structure for priority queues. The score represents priority: lower score = higher priority (processed first). This maps naturally to typical priority level conventions (1 = high, 5 = low).

```bash
# Add messages with priority scores
ZADD queue:priority 1 '{"id":"msg1","type":"payment","urgent":true}'
ZADD queue:priority 3 '{"id":"msg2","type":"notification","urgent":false}'
ZADD queue:priority 1 '{"id":"msg3","type":"fraud-alert","urgent":true}'
ZADD queue:priority 5 '{"id":"msg4","type":"analytics","urgent":false}'

# Get the highest priority message (lowest score first)
ZRANGE queue:priority 0 0 WITHSCORES
# Returns msg1 (score=1, ties are broken lexicographically)

# Atomic pop: get and remove the highest priority message
ZPOPMIN queue:priority
```

## Python Priority Queue Implementation

```python
import redis
import json
import time
import uuid
from dataclasses import dataclass, asdict
from enum import IntEnum
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class Priority(IntEnum):
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BULK = 5

@dataclass
class Message:
    payload: dict
    priority: Priority
    created_at: float = None
    id: str = None

    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = time.time()

QUEUE_KEY = "priority:queue"

def enqueue(message: Message):
    # Use priority as score, with timestamp as tiebreaker
    # Dividing by 1e11 keeps the fractional part small enough to stay within the priority band
    score = message.priority + (message.created_at / 1e11)
    payload = json.dumps({
        'id': message.id,
        'payload': message.payload,
        'priority': message.priority,
        'created_at': message.created_at
    })
    r.zadd(QUEUE_KEY, {payload: score})
    print(f"Enqueued message {message.id} with priority {message.priority.name}")

def dequeue() -> Optional[dict]:
    # Atomically pop the highest priority (lowest score) message
    result = r.zpopmin(QUEUE_KEY, count=1)
    if not result:
        return None
    member, score = result[0]
    return json.loads(member)

def peek() -> Optional[dict]:
    result = r.zrange(QUEUE_KEY, 0, 0, withscores=True)
    if not result:
        return None
    member, score = result[0]
    return json.loads(member)

def queue_size() -> int:
    return r.zcard(QUEUE_KEY)

def queue_size_by_priority(priority: Priority) -> int:
    min_score = float(priority)
    max_score = float(priority) + 1
    return r.zcount(QUEUE_KEY, min_score, max_score)

# Usage
enqueue(Message(payload={"order_id": "1001"}, priority=Priority.CRITICAL))
enqueue(Message(payload={"email": "welcome@example.com"}, priority=Priority.LOW))
enqueue(Message(payload={"payment_id": "pay_123"}, priority=Priority.HIGH))

print(f"Queue size: {queue_size()}")
msg = dequeue()
print(f"Processing: {msg}")
```

## Multi-Priority Queue with Separate Lists

An alternative approach uses separate Redis lists per priority level:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

PRIORITY_QUEUES = {
    1: "queue:critical",
    2: "queue:high",
    3: "queue:normal",
    4: "queue:low",
    5: "queue:bulk"
}

def enqueue_multi(priority: int, message: dict):
    queue_key = PRIORITY_QUEUES.get(priority, "queue:normal")
    r.rpush(queue_key, json.dumps(message))

def dequeue_multi() -> dict | None:
    # Poll queues in priority order
    for priority in sorted(PRIORITY_QUEUES.keys()):
        queue_key = PRIORITY_QUEUES[priority]
        item = r.lpop(queue_key)
        if item:
            return json.loads(item)
    return None

# Batch consumer with fairness
def dequeue_with_fairness(ratios: dict = None) -> list[dict]:
    """
    ratios: {1: 10, 2: 5, 3: 2, 4: 1}
    Process up to 10 critical, 5 high, 2 normal, 1 low per batch
    """
    if ratios is None:
        ratios = {1: 10, 2: 5, 3: 2, 4: 1, 5: 1}

    batch = []
    for priority, count in sorted(ratios.items()):
        queue_key = PRIORITY_QUEUES.get(priority)
        if not queue_key:
            continue
        for _ in range(count):
            item = r.lpop(queue_key)
            if item:
                batch.append(json.loads(item))
            else:
                break
    return batch
```

## Delayed Priority Queue

Combine priority with delayed delivery using score as timestamp:

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

DELAYED_QUEUE = "queue:delayed"
READY_QUEUE = "queue:ready"

def enqueue_delayed(message: dict, priority: int, delay_seconds: float = 0):
    """
    Enqueue with delay. Messages become available after delay_seconds.
    Priority breaks ties within the same time window.
    """
    ready_at = time.time() + delay_seconds
    # Combine timestamp and priority: ready_at as major, priority as minor
    score = ready_at * 10 + priority
    payload = {**message, 'priority': priority}
    r.zadd(DELAYED_QUEUE, {json.dumps(payload): score})

def move_ready_messages():
    """Move messages whose time has come to the ready queue."""
    now = time.time() * 10 + 9  # Include all priorities at current time
    ready = r.zrangebyscore(DELAYED_QUEUE, 0, now)

    if ready:
        pipe = r.pipeline()
        for item in ready:
            pipe.zrem(DELAYED_QUEUE, item)
            msg = json.loads(item)
            pipe.zadd(READY_QUEUE, {item: msg.get('priority', 3)})
        pipe.execute()

    return len(ready)

def consume_ready():
    result = r.zpopmin(READY_QUEUE)
    if result:
        member, score = result[0]
        return json.loads(member)
    return None

# Schedule messages
enqueue_delayed({"job": "send_report"}, priority=3, delay_seconds=60)
enqueue_delayed({"job": "urgent_alert"}, priority=1, delay_seconds=0)
enqueue_delayed({"job": "batch_process"}, priority=5, delay_seconds=3600)
```

## Consumer Worker

```python
import redis
import json
import time
import signal
import threading

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class PriorityConsumer:
    def __init__(self, queue_key: str, worker_count: int = 3):
        self.queue_key = queue_key
        self.worker_count = worker_count
        self.running = True
        signal.signal(signal.SIGINT, self._shutdown)

    def _shutdown(self, sig, frame):
        print("Shutting down workers...")
        self.running = False

    def process(self, message: dict):
        print(f"Processing [{message.get('priority')}]: {message.get('payload')}")
        time.sleep(0.01)  # Simulate processing

    def worker(self, worker_id: int):
        print(f"Worker {worker_id} started")
        while self.running:
            result = r.zpopmin(self.queue_key, count=1)
            if result:
                member, score = result[0]
                try:
                    message = json.loads(member)
                    self.process(message)
                except Exception as e:
                    print(f"Worker {worker_id} error: {e}")
                    # Re-enqueue with backoff
                    r.zadd(self.queue_key, {member: score + 100})
            else:
                time.sleep(0.05)  # Wait briefly if queue is empty

    def start(self):
        threads = [
            threading.Thread(target=self.worker, args=(i,), daemon=True)
            for i in range(self.worker_count)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

# Start consumer
consumer = PriorityConsumer("priority:queue", worker_count=3)
consumer.start()
```

## Summary

Implementing message priority in Redis is best done with sorted sets, using priority level as the score so ZPOPMIN always returns the highest priority item. For time-sensitive ordering within the same priority, combine timestamps with priority in the score. Use separate queue keys per priority level when you need strict fairness ratios between priority classes. Always use atomic operations (ZPOPMIN, Lua scripts) for thread-safe dequeuing in multi-consumer setups, and implement error handling that re-enqueues failed messages with a penalty score to prevent infinite retry storms.
