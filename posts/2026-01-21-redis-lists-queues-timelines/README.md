# How to Use Redis Lists for Queues and Timelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lists, Queues, Timelines, Data Structures, LPUSH, RPOP, BLPOP, Message Queue

Description: A comprehensive guide to using Redis Lists for building queues and timelines, covering LPUSH, RPOP, BLPOP commands, blocking operations, and practical examples in Python, Node.js, and Go for job queues, activity feeds, and real-time messaging.

---

Redis Lists are ordered collections of strings that support operations at both ends, making them perfect for implementing queues, stacks, timelines, and message buffers. With O(1) push and pop operations, Redis Lists can handle millions of messages efficiently.

In this guide, we will explore Redis Lists in depth, covering essential commands, blocking operations, and practical implementations for queues and timelines.

## Understanding Redis Lists

Redis Lists are implemented as linked lists, providing:

- O(1) operations at head and tail
- O(N) operations for accessing elements by index
- Maximum of 2^32 - 1 elements (over 4 billion)

Common use cases:
- Job queues and task processing
- Activity feeds and timelines
- Recent items (latest N items)
- Inter-process communication
- Event buffering

## Essential List Commands

### Push Operations

```bash
# Push to the left (head)
LPUSH mylist "first"
LPUSH mylist "second"
# List: ["second", "first"]

# Push to the right (tail)
RPUSH mylist "third"
# List: ["second", "first", "third"]

# Push multiple values
LPUSH mylist "a" "b" "c"
# List: ["c", "b", "a", "second", "first", "third"]

# Push only if list exists
LPUSHX existinglist "value"
RPUSHX existinglist "value"
```

### Pop Operations

```bash
# Pop from the left (head)
LPOP mylist
# Returns: "c"

# Pop from the right (tail)
RPOP mylist
# Returns: "third"

# Pop multiple elements (Redis 6.2+)
LPOP mylist 2
# Returns: ["b", "a"]

RPOP mylist 2
# Returns: ["first", "second"]
```

### Accessing Elements

```bash
# Create a list
RPUSH mylist "a" "b" "c" "d" "e"

# Get element by index (0-based)
LINDEX mylist 0
# "a"

LINDEX mylist -1
# "e" (last element)

# Get range of elements
LRANGE mylist 0 2
# ["a", "b", "c"]

LRANGE mylist 0 -1
# ["a", "b", "c", "d", "e"] (entire list)

# Get list length
LLEN mylist
# 5
```

### Modifying Lists

```bash
# Set element at index
LSET mylist 1 "B"
# List: ["a", "B", "c", "d", "e"]

# Insert before/after element
LINSERT mylist BEFORE "c" "new"
# List: ["a", "B", "new", "c", "d", "e"]

LINSERT mylist AFTER "c" "another"
# List: ["a", "B", "new", "c", "another", "d", "e"]

# Remove elements by value
LREM mylist 0 "B"  # Remove all occurrences
LREM mylist 1 "a"  # Remove first occurrence
LREM mylist -1 "e" # Remove last occurrence

# Trim list to range
LTRIM mylist 0 99  # Keep first 100 elements
```

### Blocking Operations

```bash
# Block until element available or timeout
BLPOP queue1 queue2 30
# Waits up to 30 seconds for element from queue1 or queue2

BRPOP queue 0
# Block indefinitely until element available

# Blocking move between lists
BLMOVE source destination LEFT RIGHT 10
# Block up to 10 seconds
```

### Move Between Lists

```bash
# Move from one list to another (atomic)
LMOVE source destination LEFT RIGHT
# Pop from left of source, push to right of destination

RPOPLPUSH source destination
# Pop from right of source, push to left of destination (deprecated, use LMOVE)
```

## Queue Patterns

### Simple FIFO Queue

```bash
# Producer adds to tail
RPUSH jobs '{"task": "process", "data": "item1"}'

# Consumer takes from head
LPOP jobs
```

### Reliable Queue with Backup

```bash
# Consumer takes and moves to processing list
LMOVE jobs processing LEFT RIGHT

# On success, remove from processing
LREM processing 1 '{"task": "process", "data": "item1"}'

# On failure, move back to jobs
LMOVE processing jobs RIGHT LEFT
```

### Priority Queue

```bash
# High priority queue
RPUSH jobs:high '{"priority": "high", "task": "urgent"}'

# Low priority queue
RPUSH jobs:low '{"priority": "low", "task": "normal"}'

# Consumer checks high priority first
BLPOP jobs:high jobs:low 0
```

## Practical Examples

### Python Implementation

```python
import redis
import json
import time
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
import threading

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Simple Job Queue
# =============================================================================

class JobQueue:
    def __init__(self, name: str):
        self.queue_key = f"queue:{name}"
        self.processing_key = f"queue:{name}:processing"

    def enqueue(self, job_data: Dict) -> str:
        """Add a job to the queue."""
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "data": job_data,
            "created_at": datetime.now().isoformat()
        }
        client.rpush(self.queue_key, json.dumps(job))
        return job_id

    def dequeue(self, timeout: int = 0) -> Optional[Dict]:
        """Get next job from queue (blocking)."""
        result = client.blpop(self.queue_key, timeout)
        if result:
            return json.loads(result[1])
        return None

    def dequeue_reliable(self, timeout: int = 0) -> Optional[Dict]:
        """Get job with reliable processing guarantee."""
        job_json = client.blmove(
            self.queue_key,
            self.processing_key,
            timeout,
            "LEFT",
            "RIGHT"
        )
        if job_json:
            return json.loads(job_json)
        return None

    def complete_job(self, job: Dict) -> None:
        """Mark job as completed."""
        client.lrem(self.processing_key, 1, json.dumps(job))

    def fail_job(self, job: Dict) -> None:
        """Return failed job to queue."""
        job_json = json.dumps(job)
        # Remove from processing, add back to queue
        pipe = client.pipeline()
        pipe.lrem(self.processing_key, 1, job_json)
        pipe.lpush(self.queue_key, job_json)
        pipe.execute()

    def get_length(self) -> int:
        """Get queue length."""
        return client.llen(self.queue_key)

    def get_processing_count(self) -> int:
        """Get number of jobs being processed."""
        return client.llen(self.processing_key)


# =============================================================================
# Priority Queue
# =============================================================================

class PriorityQueue:
    PRIORITIES = ["critical", "high", "normal", "low"]

    def __init__(self, name: str):
        self.name = name

    def _get_key(self, priority: str) -> str:
        return f"pqueue:{self.name}:{priority}"

    def enqueue(self, job_data: Dict, priority: str = "normal") -> str:
        """Add job with priority."""
        if priority not in self.PRIORITIES:
            priority = "normal"

        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "data": job_data,
            "priority": priority,
            "created_at": datetime.now().isoformat()
        }
        client.rpush(self._get_key(priority), json.dumps(job))
        return job_id

    def dequeue(self, timeout: int = 0) -> Optional[Dict]:
        """Get highest priority job."""
        keys = [self._get_key(p) for p in self.PRIORITIES]
        result = client.blpop(keys, timeout)
        if result:
            return json.loads(result[1])
        return None


# =============================================================================
# Activity Timeline / Feed
# =============================================================================

class ActivityFeed:
    def __init__(self, user_id: int, max_items: int = 1000):
        self.key = f"feed:{user_id}"
        self.max_items = max_items

    def add_activity(self, activity: Dict) -> None:
        """Add activity to feed."""
        activity["timestamp"] = datetime.now().isoformat()
        activity["id"] = str(uuid.uuid4())

        pipe = client.pipeline()
        pipe.lpush(self.key, json.dumps(activity))
        pipe.ltrim(self.key, 0, self.max_items - 1)
        pipe.execute()

    def get_recent(self, count: int = 20, offset: int = 0) -> List[Dict]:
        """Get recent activities with pagination."""
        items = client.lrange(self.key, offset, offset + count - 1)
        return [json.loads(item) for item in items]

    def get_count(self) -> int:
        """Get total activity count."""
        return client.llen(self.key)


# =============================================================================
# Circular Buffer / Recent Items
# =============================================================================

class CircularBuffer:
    def __init__(self, name: str, max_size: int):
        self.key = f"buffer:{name}"
        self.max_size = max_size

    def push(self, item: Any) -> None:
        """Add item to buffer, removing oldest if full."""
        pipe = client.pipeline()
        pipe.lpush(self.key, json.dumps(item))
        pipe.ltrim(self.key, 0, self.max_size - 1)
        pipe.execute()

    def get_all(self) -> List[Any]:
        """Get all items in buffer."""
        items = client.lrange(self.key, 0, -1)
        return [json.loads(item) for item in items]

    def get_recent(self, count: int) -> List[Any]:
        """Get most recent N items."""
        items = client.lrange(self.key, 0, count - 1)
        return [json.loads(item) for item in items]


# =============================================================================
# Message Queue with Consumer Groups (Simple)
# =============================================================================

class MessageQueue:
    def __init__(self, name: str):
        self.queue_key = f"mq:{name}"
        self.consumers_key = f"mq:{name}:consumers"

    def publish(self, message: Dict) -> str:
        """Publish message to queue."""
        msg_id = str(uuid.uuid4())
        message["_id"] = msg_id
        message["_timestamp"] = datetime.now().isoformat()
        client.rpush(self.queue_key, json.dumps(message))
        return msg_id

    def subscribe(self, callback: Callable[[Dict], None], timeout: int = 0) -> None:
        """Subscribe to queue and process messages."""
        while True:
            result = client.blpop(self.queue_key, timeout)
            if result:
                message = json.loads(result[1])
                try:
                    callback(message)
                except Exception as e:
                    print(f"Error processing message: {e}")
                    # Optionally re-queue the message
                    client.lpush(self.queue_key, json.dumps(message))


# =============================================================================
# Rate-Limited Queue
# =============================================================================

class RateLimitedQueue:
    def __init__(self, name: str, rate_per_second: float):
        self.queue_key = f"rlq:{name}"
        self.interval = 1.0 / rate_per_second

    def enqueue(self, item: Any) -> None:
        """Add item to queue."""
        client.rpush(self.queue_key, json.dumps(item))

    def process(self, callback: Callable[[Any], None]) -> None:
        """Process items at limited rate."""
        while True:
            result = client.blpop(self.queue_key, 1)
            if result:
                item = json.loads(result[1])
                callback(item)
                time.sleep(self.interval)


# =============================================================================
# Usage Examples
# =============================================================================

# Job Queue
queue = JobQueue("tasks")
job_id = queue.enqueue({"type": "email", "to": "user@example.com"})
print(f"Enqueued job: {job_id}")
print(f"Queue length: {queue.get_length()}")

# Process jobs
def process_jobs():
    while True:
        job = queue.dequeue_reliable(timeout=5)
        if job:
            try:
                print(f"Processing: {job}")
                # Do work...
                queue.complete_job(job)
            except Exception as e:
                print(f"Job failed: {e}")
                queue.fail_job(job)

# Priority Queue
pqueue = PriorityQueue("notifications")
pqueue.enqueue({"message": "Critical alert!"}, priority="critical")
pqueue.enqueue({"message": "Normal update"}, priority="normal")

# Get highest priority
job = pqueue.dequeue(timeout=1)
if job:
    print(f"Got job: {job['priority']} - {job['data']['message']}")

# Activity Feed
feed = ActivityFeed(user_id=123)
feed.add_activity({"type": "post", "content": "Hello World!"})
feed.add_activity({"type": "like", "target_id": 456})

recent = feed.get_recent(count=10)
print(f"Recent activities: {recent}")

# Circular Buffer for logs
log_buffer = CircularBuffer("app_logs", max_size=100)
log_buffer.push({"level": "info", "message": "Application started"})
log_buffer.push({"level": "error", "message": "Connection failed"})

logs = log_buffer.get_recent(10)
print(f"Recent logs: {logs}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Simple Job Queue
// =============================================================================

class JobQueue {
  constructor(name) {
    this.queueKey = `queue:${name}`;
    this.processingKey = `queue:${name}:processing`;
  }

  async enqueue(jobData) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      data: jobData,
      created_at: new Date().toISOString(),
    };
    await redis.rpush(this.queueKey, JSON.stringify(job));
    return jobId;
  }

  async dequeue(timeout = 0) {
    const result = await redis.blpop(this.queueKey, timeout);
    if (result) {
      return JSON.parse(result[1]);
    }
    return null;
  }

  async dequeueReliable(timeout = 0) {
    const jobJson = await redis.blmove(
      this.queueKey,
      this.processingKey,
      'LEFT',
      'RIGHT',
      timeout
    );
    if (jobJson) {
      return JSON.parse(jobJson);
    }
    return null;
  }

  async completeJob(job) {
    await redis.lrem(this.processingKey, 1, JSON.stringify(job));
  }

  async failJob(job) {
    const jobJson = JSON.stringify(job);
    const pipeline = redis.pipeline();
    pipeline.lrem(this.processingKey, 1, jobJson);
    pipeline.lpush(this.queueKey, jobJson);
    await pipeline.exec();
  }

  async getLength() {
    return await redis.llen(this.queueKey);
  }
}

// =============================================================================
// Priority Queue
// =============================================================================

class PriorityQueue {
  static PRIORITIES = ['critical', 'high', 'normal', 'low'];

  constructor(name) {
    this.name = name;
  }

  _getKey(priority) {
    return `pqueue:${this.name}:${priority}`;
  }

  async enqueue(jobData, priority = 'normal') {
    if (!PriorityQueue.PRIORITIES.includes(priority)) {
      priority = 'normal';
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      data: jobData,
      priority,
      created_at: new Date().toISOString(),
    };
    await redis.rpush(this._getKey(priority), JSON.stringify(job));
    return jobId;
  }

  async dequeue(timeout = 0) {
    const keys = PriorityQueue.PRIORITIES.map((p) => this._getKey(p));
    const result = await redis.blpop(...keys, timeout);
    if (result) {
      return JSON.parse(result[1]);
    }
    return null;
  }
}

// =============================================================================
// Activity Timeline / Feed
// =============================================================================

class ActivityFeed {
  constructor(userId, maxItems = 1000) {
    this.key = `feed:${userId}`;
    this.maxItems = maxItems;
  }

  async addActivity(activity) {
    activity.timestamp = new Date().toISOString();
    activity.id = uuidv4();

    const pipeline = redis.pipeline();
    pipeline.lpush(this.key, JSON.stringify(activity));
    pipeline.ltrim(this.key, 0, this.maxItems - 1);
    await pipeline.exec();
  }

  async getRecent(count = 20, offset = 0) {
    const items = await redis.lrange(this.key, offset, offset + count - 1);
    return items.map((item) => JSON.parse(item));
  }

  async getCount() {
    return await redis.llen(this.key);
  }
}

// =============================================================================
// Worker Pool
// =============================================================================

class WorkerPool {
  constructor(queue, concurrency = 5) {
    this.queue = queue;
    this.concurrency = concurrency;
    this.running = false;
  }

  async process(handler) {
    this.running = true;
    const workers = [];

    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this._worker(i, handler));
    }

    await Promise.all(workers);
  }

  async _worker(workerId, handler) {
    console.log(`Worker ${workerId} started`);

    while (this.running) {
      const job = await this.queue.dequeueReliable(5);

      if (job) {
        try {
          console.log(`Worker ${workerId} processing job ${job.id}`);
          await handler(job.data);
          await this.queue.completeJob(job);
          console.log(`Worker ${workerId} completed job ${job.id}`);
        } catch (error) {
          console.error(`Worker ${workerId} failed job ${job.id}:`, error);
          await this.queue.failJob(job);
        }
      }
    }
  }

  stop() {
    this.running = false;
  }
}

// =============================================================================
// Pub/Sub with Lists (Fan-out)
// =============================================================================

class ListPubSub {
  constructor(channel) {
    this.channel = channel;
  }

  async publish(message) {
    // Get all subscriber lists
    const subscribers = await redis.smembers(`pubsub:${this.channel}:subscribers`);

    const pipeline = redis.pipeline();
    for (const subscriber of subscribers) {
      pipeline.rpush(`pubsub:${this.channel}:${subscriber}`, JSON.stringify(message));
      // Trim to prevent unbounded growth
      pipeline.ltrim(`pubsub:${this.channel}:${subscriber}`, -1000, -1);
    }
    await pipeline.exec();
  }

  async subscribe(subscriberId, handler) {
    // Register subscriber
    await redis.sadd(`pubsub:${this.channel}:subscribers`, subscriberId);
    const listKey = `pubsub:${this.channel}:${subscriberId}`;

    // Process messages
    while (true) {
      const result = await redis.blpop(listKey, 0);
      if (result) {
        const message = JSON.parse(result[1]);
        await handler(message);
      }
    }
  }

  async unsubscribe(subscriberId) {
    await redis.srem(`pubsub:${this.channel}:subscribers`, subscriberId);
    await redis.del(`pubsub:${this.channel}:${subscriberId}`);
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Job Queue
  const queue = new JobQueue('tasks');
  const jobId = await queue.enqueue({ type: 'email', to: 'user@example.com' });
  console.log(`Enqueued job: ${jobId}`);
  console.log(`Queue length: ${await queue.getLength()}`);

  // Priority Queue
  const pqueue = new PriorityQueue('notifications');
  await pqueue.enqueue({ message: 'Critical alert!' }, 'critical');
  await pqueue.enqueue({ message: 'Normal update' }, 'normal');

  const job = await pqueue.dequeue(1);
  if (job) {
    console.log(`Got job: ${job.priority} - ${job.data.message}`);
  }

  // Activity Feed
  const feed = new ActivityFeed(123);
  await feed.addActivity({ type: 'post', content: 'Hello World!' });
  await feed.addActivity({ type: 'like', target_id: 456 });

  const recent = await feed.getRecent(10);
  console.log('Recent activities:', recent);

  // Worker Pool (example - would run continuously)
  // const pool = new WorkerPool(queue, 3);
  // pool.process(async (data) => {
  //   console.log('Processing:', data);
  //   await new Promise(r => setTimeout(r, 1000));
  // });

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/google/uuid"
    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Job Queue
// =============================================================================

type Job struct {
    ID        string                 `json:"id"`
    Data      map[string]interface{} `json:"data"`
    CreatedAt string                 `json:"created_at"`
}

type JobQueue struct {
    QueueKey      string
    ProcessingKey string
}

func NewJobQueue(name string) *JobQueue {
    return &JobQueue{
        QueueKey:      fmt.Sprintf("queue:%s", name),
        ProcessingKey: fmt.Sprintf("queue:%s:processing", name),
    }
}

func (q *JobQueue) Enqueue(jobData map[string]interface{}) (string, error) {
    job := Job{
        ID:        uuid.New().String(),
        Data:      jobData,
        CreatedAt: time.Now().Format(time.RFC3339),
    }

    jobJSON, err := json.Marshal(job)
    if err != nil {
        return "", err
    }

    err = client.RPush(ctx, q.QueueKey, jobJSON).Err()
    return job.ID, err
}

func (q *JobQueue) Dequeue(timeout time.Duration) (*Job, error) {
    result, err := client.BLPop(ctx, timeout, q.QueueKey).Result()
    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    var job Job
    if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
        return nil, err
    }

    return &job, nil
}

func (q *JobQueue) DequeueReliable(timeout time.Duration) (*Job, error) {
    jobJSON, err := client.BLMove(ctx, q.QueueKey, q.ProcessingKey, "LEFT", "RIGHT", timeout).Result()
    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    var job Job
    if err := json.Unmarshal([]byte(jobJSON), &job); err != nil {
        return nil, err
    }

    return &job, nil
}

func (q *JobQueue) CompleteJob(job *Job) error {
    jobJSON, _ := json.Marshal(job)
    return client.LRem(ctx, q.ProcessingKey, 1, jobJSON).Err()
}

func (q *JobQueue) FailJob(job *Job) error {
    jobJSON, _ := json.Marshal(job)
    pipe := client.Pipeline()
    pipe.LRem(ctx, q.ProcessingKey, 1, jobJSON)
    pipe.LPush(ctx, q.QueueKey, jobJSON)
    _, err := pipe.Exec(ctx)
    return err
}

func (q *JobQueue) GetLength() (int64, error) {
    return client.LLen(ctx, q.QueueKey).Result()
}

// =============================================================================
// Priority Queue
// =============================================================================

var Priorities = []string{"critical", "high", "normal", "low"}

type PriorityQueue struct {
    Name string
}

func NewPriorityQueue(name string) *PriorityQueue {
    return &PriorityQueue{Name: name}
}

func (q *PriorityQueue) getKey(priority string) string {
    return fmt.Sprintf("pqueue:%s:%s", q.Name, priority)
}

func (q *PriorityQueue) Enqueue(jobData map[string]interface{}, priority string) (string, error) {
    // Validate priority
    valid := false
    for _, p := range Priorities {
        if p == priority {
            valid = true
            break
        }
    }
    if !valid {
        priority = "normal"
    }

    job := map[string]interface{}{
        "id":         uuid.New().String(),
        "data":       jobData,
        "priority":   priority,
        "created_at": time.Now().Format(time.RFC3339),
    }

    jobJSON, err := json.Marshal(job)
    if err != nil {
        return "", err
    }

    err = client.RPush(ctx, q.getKey(priority), jobJSON).Err()
    return job["id"].(string), err
}

func (q *PriorityQueue) Dequeue(timeout time.Duration) (map[string]interface{}, error) {
    keys := make([]string, len(Priorities))
    for i, p := range Priorities {
        keys[i] = q.getKey(p)
    }

    result, err := client.BLPop(ctx, timeout, keys...).Result()
    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    var job map[string]interface{}
    if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
        return nil, err
    }

    return job, nil
}

// =============================================================================
// Activity Feed
// =============================================================================

type Activity struct {
    ID        string                 `json:"id"`
    Type      string                 `json:"type"`
    Data      map[string]interface{} `json:"data,omitempty"`
    Timestamp string                 `json:"timestamp"`
}

type ActivityFeed struct {
    Key      string
    MaxItems int64
}

func NewActivityFeed(userID int, maxItems int64) *ActivityFeed {
    return &ActivityFeed{
        Key:      fmt.Sprintf("feed:%d", userID),
        MaxItems: maxItems,
    }
}

func (f *ActivityFeed) AddActivity(activityType string, data map[string]interface{}) error {
    activity := Activity{
        ID:        uuid.New().String(),
        Type:      activityType,
        Data:      data,
        Timestamp: time.Now().Format(time.RFC3339),
    }

    activityJSON, err := json.Marshal(activity)
    if err != nil {
        return err
    }

    pipe := client.Pipeline()
    pipe.LPush(ctx, f.Key, activityJSON)
    pipe.LTrim(ctx, f.Key, 0, f.MaxItems-1)
    _, err = pipe.Exec(ctx)
    return err
}

func (f *ActivityFeed) GetRecent(count int64, offset int64) ([]Activity, error) {
    items, err := client.LRange(ctx, f.Key, offset, offset+count-1).Result()
    if err != nil {
        return nil, err
    }

    activities := make([]Activity, len(items))
    for i, item := range items {
        json.Unmarshal([]byte(item), &activities[i])
    }

    return activities, nil
}

// =============================================================================
// Circular Buffer
// =============================================================================

type CircularBuffer struct {
    Key     string
    MaxSize int64
}

func NewCircularBuffer(name string, maxSize int64) *CircularBuffer {
    return &CircularBuffer{
        Key:     fmt.Sprintf("buffer:%s", name),
        MaxSize: maxSize,
    }
}

func (b *CircularBuffer) Push(item interface{}) error {
    itemJSON, err := json.Marshal(item)
    if err != nil {
        return err
    }

    pipe := client.Pipeline()
    pipe.LPush(ctx, b.Key, itemJSON)
    pipe.LTrim(ctx, b.Key, 0, b.MaxSize-1)
    _, err = pipe.Exec(ctx)
    return err
}

func (b *CircularBuffer) GetRecent(count int64) ([]json.RawMessage, error) {
    items, err := client.LRange(ctx, b.Key, 0, count-1).Result()
    if err != nil {
        return nil, err
    }

    result := make([]json.RawMessage, len(items))
    for i, item := range items {
        result[i] = json.RawMessage(item)
    }

    return result, nil
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Job Queue
    queue := NewJobQueue("tasks")
    jobID, _ := queue.Enqueue(map[string]interface{}{
        "type": "email",
        "to":   "user@example.com",
    })
    fmt.Printf("Enqueued job: %s\n", jobID)

    length, _ := queue.GetLength()
    fmt.Printf("Queue length: %d\n", length)

    // Priority Queue
    pqueue := NewPriorityQueue("notifications")
    pqueue.Enqueue(map[string]interface{}{"message": "Critical alert!"}, "critical")
    pqueue.Enqueue(map[string]interface{}{"message": "Normal update"}, "normal")

    job, _ := pqueue.Dequeue(time.Second)
    if job != nil {
        fmt.Printf("Got job: %s - %v\n", job["priority"], job["data"])
    }

    // Activity Feed
    feed := NewActivityFeed(123, 1000)
    feed.AddActivity("post", map[string]interface{}{"content": "Hello World!"})
    feed.AddActivity("like", map[string]interface{}{"target_id": 456})

    activities, _ := feed.GetRecent(10, 0)
    fmt.Printf("Recent activities: %+v\n", activities)

    // Circular Buffer
    buffer := NewCircularBuffer("logs", 100)
    buffer.Push(map[string]string{"level": "info", "message": "Started"})
    buffer.Push(map[string]string{"level": "error", "message": "Failed"})

    logs, _ := buffer.GetRecent(10)
    fmt.Printf("Recent logs: %v\n", logs)
}
```

## Best Practices

### Queue Design

1. **Use reliable queues** - Move to processing list before work
2. **Handle failures** - Return failed jobs to queue
3. **Set timeouts** - Avoid blocking indefinitely
4. **Monitor queue length** - Alert on growing backlogs

### Performance

1. **Use pipelining** - Batch multiple operations
2. **Avoid LRANGE on large lists** - Use pagination
3. **Trim lists** - Prevent unbounded growth
4. **Use BLPOP** - Avoid polling

### Memory Management

```bash
# Set list max length
LTRIM mylist 0 999  # Keep only 1000 items

# Monitor memory
MEMORY USAGE queue:jobs
DEBUG OBJECT queue:jobs
```

## Conclusion

Redis Lists provide powerful primitives for building queues, timelines, and message buffers. Key takeaways:

- Use RPUSH/LPOP for FIFO queues
- Use BLPOP/BRPOP for blocking consumers
- Use LMOVE for reliable queue processing
- Combine multiple lists for priority queues
- Always trim lists to prevent unbounded growth

Redis Lists' O(1) push/pop operations and blocking commands make them ideal for high-throughput messaging and queue systems.
