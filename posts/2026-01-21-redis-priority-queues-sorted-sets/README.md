# How to Implement Priority Queues with Redis Sorted Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Sets, Priority Queue, Task Scheduling, Data Structures, Job Queue

Description: A comprehensive guide to implementing priority queues using Redis sorted sets for task scheduling, job processing, and work prioritization with practical examples and production patterns.

---

Priority queues process items based on their priority rather than arrival order. Redis sorted sets are ideal for this pattern - the score represents priority, and operations like ZPOPMIN efficiently retrieve the highest-priority item. This guide covers implementation patterns from simple to production-grade.

## Understanding Priority Queues

A priority queue differs from a regular queue:

- **Regular Queue (FIFO)**: First in, first out
- **Priority Queue**: Highest priority out first, regardless of insertion order

Common use cases:
- Task scheduling (urgent tasks first)
- Job processing with different SLAs
- Event handling by importance
- Resource allocation
- Network packet scheduling

## Basic Priority Queue

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class PriorityQueue:
    def __init__(self, name, redis_client):
        self.key = f"pq:{name}"
        self.redis = redis_client

    def push(self, item, priority):
        """
        Add item with priority (lower score = higher priority).
        Use negative priority if you want higher numbers = higher priority.
        """
        self.redis.zadd(self.key, {item: priority})

    def pop(self):
        """Remove and return highest priority item (lowest score)"""
        result = self.redis.zpopmin(self.key)
        if result:
            return result[0][0]  # Return item without score
        return None

    def peek(self):
        """View highest priority item without removing"""
        result = self.redis.zrange(self.key, 0, 0)
        if result:
            return result[0]
        return None

    def pop_with_priority(self):
        """Remove and return (item, priority) tuple"""
        result = self.redis.zpopmin(self.key)
        if result:
            return (result[0][0], result[0][1])
        return None

    def size(self):
        """Get queue size"""
        return self.redis.zcard(self.key)

    def is_empty(self):
        """Check if queue is empty"""
        return self.size() == 0

    def clear(self):
        """Remove all items"""
        self.redis.delete(self.key)

# Usage
pq = PriorityQueue('tasks', r)

# Add tasks with priorities (lower = more urgent)
pq.push('critical-alert', priority=1)
pq.push('normal-task', priority=5)
pq.push('low-priority-cleanup', priority=10)
pq.push('urgent-fix', priority=2)

# Process in priority order
while not pq.is_empty():
    task = pq.pop()
    print(f"Processing: {task}")

# Output:
# Processing: critical-alert
# Processing: urgent-fix
# Processing: normal-task
# Processing: low-priority-cleanup
```

## Multi-Level Priority Queue

Implement discrete priority levels like HIGH, MEDIUM, LOW:

```python
import redis
import time
import json
from enum import IntEnum

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class Priority(IntEnum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 5
    LOW = 10
    BACKGROUND = 100

class MultiLevelPriorityQueue:
    def __init__(self, name, redis_client):
        self.key = f"mlpq:{name}"
        self.redis = redis_client
        self.counter_key = f"{self.key}:counter"

    def push(self, item, priority=Priority.MEDIUM):
        """
        Add item with priority level.
        Within same priority, items are FIFO.
        """
        # Use counter for FIFO within same priority
        counter = self.redis.incr(self.counter_key)

        # Create composite score: priority * 10^12 + counter
        # This ensures priority ordering with FIFO tiebreaker
        score = float(priority) * 1e12 + counter

        self.redis.zadd(self.key, {item: score})

    def pop(self):
        """Remove and return highest priority item"""
        result = self.redis.zpopmin(self.key)
        if result:
            return result[0][0]
        return None

    def pop_batch(self, count):
        """Remove and return up to N highest priority items"""
        results = self.redis.zpopmin(self.key, count)
        return [item[0] for item in results]

    def peek_by_priority(self, priority):
        """View items at specific priority level"""
        min_score = float(priority) * 1e12
        max_score = (float(priority) + 1) * 1e12 - 1

        return self.redis.zrangebyscore(
            self.key, min_score, max_score
        )

    def count_by_priority(self, priority):
        """Count items at specific priority level"""
        min_score = float(priority) * 1e12
        max_score = (float(priority) + 1) * 1e12 - 1

        return self.redis.zcount(self.key, min_score, max_score)

    def get_stats(self):
        """Get queue statistics by priority level"""
        stats = {}
        for p in Priority:
            stats[p.name] = self.count_by_priority(p)
        stats['total'] = self.redis.zcard(self.key)
        return stats

# Usage
queue = MultiLevelPriorityQueue('jobs', r)

# Add jobs at different priorities
queue.push('send-welcome-email', Priority.LOW)
queue.push('process-payment', Priority.CRITICAL)
queue.push('update-search-index', Priority.BACKGROUND)
queue.push('send-notification', Priority.MEDIUM)
queue.push('generate-report', Priority.LOW)
queue.push('fix-critical-bug', Priority.CRITICAL)

# Check stats
stats = queue.get_stats()
print(f"Queue stats: {stats}")

# Process jobs
while True:
    job = queue.pop()
    if job is None:
        break
    print(f"Processing: {job}")
```

## Delayed Priority Queue

Combine priority with scheduled execution time:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class DelayedPriorityQueue:
    def __init__(self, name, redis_client):
        self.scheduled_key = f"dpq:{name}:scheduled"
        self.ready_key = f"dpq:{name}:ready"
        self.redis = redis_client

    def schedule(self, item, priority, delay_seconds=0, execute_at=None):
        """
        Schedule item for future execution with priority.

        Items become ready at their scheduled time,
        then are processed by priority.
        """
        if execute_at:
            scheduled_time = execute_at
        else:
            scheduled_time = time.time() + delay_seconds

        job = {
            'item': item,
            'priority': priority,
            'scheduled_at': scheduled_time
        }

        # Use scheduled time as score
        self.redis.zadd(self.scheduled_key, {json.dumps(job): scheduled_time})

    def move_ready(self):
        """Move scheduled items that are ready to the ready queue"""
        now = time.time()

        # Get items ready for execution
        ready_items = self.redis.zrangebyscore(
            self.scheduled_key, '-inf', now
        )

        if not ready_items:
            return 0

        pipe = self.redis.pipeline()

        for item_json in ready_items:
            job = json.loads(item_json)
            # Add to ready queue with priority as score
            pipe.zadd(self.ready_key, {job['item']: job['priority']})
            # Remove from scheduled queue
            pipe.zrem(self.scheduled_key, item_json)

        pipe.execute()
        return len(ready_items)

    def pop(self):
        """Get next ready item by priority"""
        # First, move any newly ready items
        self.move_ready()

        result = self.redis.zpopmin(self.ready_key)
        if result:
            return result[0][0]
        return None

    def pop_blocking(self, timeout=0):
        """
        Blocking pop that waits for items.
        Polls scheduled queue periodically.
        """
        start_time = time.time()

        while True:
            # Move ready items
            self.move_ready()

            # Try to pop
            result = self.redis.zpopmin(self.ready_key)
            if result:
                return result[0][0]

            # Check timeout
            if timeout > 0 and (time.time() - start_time) >= timeout:
                return None

            # Sleep before retry
            time.sleep(0.1)

    def get_next_ready_time(self):
        """Get time until next scheduled item becomes ready"""
        result = self.redis.zrange(self.scheduled_key, 0, 0, withscores=True)
        if result:
            next_time = result[0][1]
            wait_time = next_time - time.time()
            return max(0, wait_time)
        return None

    def get_pending_count(self):
        """Get counts of scheduled and ready items"""
        return {
            'scheduled': self.redis.zcard(self.scheduled_key),
            'ready': self.redis.zcard(self.ready_key)
        }

# Usage
queue = DelayedPriorityQueue('notifications', r)

# Schedule notifications
queue.schedule('reminder-email', priority=5, delay_seconds=60)
queue.schedule('urgent-alert', priority=1, delay_seconds=0)  # Immediate
queue.schedule('weekly-digest', priority=10, delay_seconds=3600)
queue.schedule('follow-up', priority=5, delay_seconds=30)

# Process immediately ready items
while True:
    item = queue.pop()
    if item is None:
        break
    print(f"Sending: {item}")

# Check what's pending
print(f"Pending: {queue.get_pending_count()}")
print(f"Next item ready in: {queue.get_next_ready_time()} seconds")
```

## Fair Priority Queue with Aging

Prevent starvation of low-priority items by aging:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class FairPriorityQueue:
    """
    Priority queue where items age - their effective priority
    increases the longer they wait.
    """

    def __init__(self, name, redis_client, aging_factor=0.1):
        self.key = f"fpq:{name}"
        self.metadata_key = f"fpq:{name}:meta"
        self.redis = redis_client
        self.aging_factor = aging_factor  # Priority decrease per second waiting

    def push(self, item, priority):
        """Add item with initial priority"""
        metadata = {
            'priority': priority,
            'added_at': time.time()
        }

        pipe = self.redis.pipeline()
        pipe.zadd(self.key, {item: priority})
        pipe.hset(self.metadata_key, item, json.dumps(metadata))
        pipe.execute()

    def _calculate_effective_priority(self, item, base_priority, added_at):
        """Calculate current effective priority with aging"""
        age_seconds = time.time() - added_at
        # Decrease score (higher priority) based on age
        effective = base_priority - (age_seconds * self.aging_factor)
        return max(0, effective)  # Don't go below 0

    def update_priorities(self):
        """Recalculate all priorities based on aging"""
        items = self.redis.zrange(self.key, 0, -1)

        if not items:
            return

        pipe = self.redis.pipeline()

        for item in items:
            meta_json = self.redis.hget(self.metadata_key, item)
            if meta_json:
                meta = json.loads(meta_json)
                effective = self._calculate_effective_priority(
                    item,
                    meta['priority'],
                    meta['added_at']
                )
                pipe.zadd(self.key, {item: effective})

        pipe.execute()

    def pop(self):
        """Remove and return highest effective priority item"""
        # Update priorities before popping
        self.update_priorities()

        result = self.redis.zpopmin(self.key)
        if result:
            item = result[0][0]
            # Clean up metadata
            self.redis.hdel(self.metadata_key, item)
            return item
        return None

    def get_queue_state(self):
        """Get current queue state with effective priorities"""
        items = self.redis.zrange(self.key, 0, -1, withscores=True)
        state = []

        for item, score in items:
            meta_json = self.redis.hget(self.metadata_key, item)
            if meta_json:
                meta = json.loads(meta_json)
                age = time.time() - meta['added_at']
                state.append({
                    'item': item,
                    'base_priority': meta['priority'],
                    'effective_priority': score,
                    'age_seconds': age
                })

        return state

# Usage
queue = FairPriorityQueue('tasks', r, aging_factor=0.5)  # 0.5 priority/second

# Add tasks
queue.push('high-priority-task', priority=1)
queue.push('low-priority-old-task', priority=10)
queue.push('medium-task', priority=5)

# Wait and see aging effect
time.sleep(5)

# Check state
print("Queue state after 5 seconds:")
for item in queue.get_queue_state():
    print(f"  {item['item']}: base={item['base_priority']}, "
          f"effective={item['effective_priority']:.2f}, "
          f"age={item['age_seconds']:.1f}s")

# Pop items
while True:
    item = queue.pop()
    if item is None:
        break
    print(f"Processing: {item}")
```

## Work Stealing Priority Queue

Multiple workers with work stealing for load balancing:

```python
import redis
import time
import json
import uuid
from threading import Thread

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class WorkStealingPriorityQueue:
    def __init__(self, name, num_workers, redis_client):
        self.name = name
        self.num_workers = num_workers
        self.redis = redis_client

    def _worker_queue_key(self, worker_id):
        return f"wspq:{self.name}:worker:{worker_id}"

    def _global_queue_key(self):
        return f"wspq:{self.name}:global"

    def push(self, item, priority, target_worker=None):
        """Add item to specific worker or global queue"""
        if target_worker is not None:
            key = self._worker_queue_key(target_worker)
        else:
            key = self._global_queue_key()

        self.redis.zadd(key, {item: priority})

    def pop(self, worker_id):
        """
        Pop from worker's queue first, then global, then steal.
        """
        # Try own queue
        result = self.redis.zpopmin(self._worker_queue_key(worker_id))
        if result:
            return result[0][0]

        # Try global queue
        result = self.redis.zpopmin(self._global_queue_key())
        if result:
            return result[0][0]

        # Try to steal from other workers
        for other_worker in range(self.num_workers):
            if other_worker == worker_id:
                continue

            result = self.redis.zpopmin(self._worker_queue_key(other_worker))
            if result:
                return result[0][0]

        return None

    def get_stats(self):
        """Get queue sizes for all workers and global"""
        stats = {
            'global': self.redis.zcard(self._global_queue_key()),
            'workers': {}
        }

        for i in range(self.num_workers):
            stats['workers'][i] = self.redis.zcard(self._worker_queue_key(i))

        return stats

# Usage
queue = WorkStealingPriorityQueue('processing', num_workers=4, redis_client=r)

# Add work to global queue
for i in range(20):
    queue.push(f'task-{i}', priority=i % 10)

# Add some work to specific workers
queue.push('worker-0-specific', priority=1, target_worker=0)
queue.push('worker-1-specific', priority=2, target_worker=1)

# Simulate workers
def worker_loop(worker_id, queue, max_items=10):
    processed = 0
    while processed < max_items:
        item = queue.pop(worker_id)
        if item is None:
            break
        print(f"Worker {worker_id}: Processing {item}")
        processed += 1
        time.sleep(0.1)
    print(f"Worker {worker_id}: Done, processed {processed} items")

# Start workers
threads = []
for i in range(4):
    t = Thread(target=worker_loop, args=(i, queue, 10))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print(f"Final stats: {queue.get_stats()}")
```

## Production Priority Queue

Complete implementation with monitoring and reliability:

```python
import redis
import time
import json
import uuid
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ProductionPriorityQueue:
    def __init__(self, name, redis_client):
        self.name = name
        self.redis = redis_client
        self.pending_key = f"ppq:{name}:pending"
        self.processing_key = f"ppq:{name}:processing"
        self.completed_key = f"ppq:{name}:completed"
        self.failed_key = f"ppq:{name}:failed"
        self.stats_key = f"ppq:{name}:stats"

    def enqueue(self, payload, priority=5, job_id=None):
        """Add job to queue"""
        job_id = job_id or str(uuid.uuid4())

        job = {
            'id': job_id,
            'payload': payload,
            'priority': priority,
            'created_at': time.time(),
            'attempts': 0
        }

        self.redis.zadd(self.pending_key, {json.dumps(job): priority})
        self.redis.hincrby(self.stats_key, 'enqueued', 1)

        return job_id

    def dequeue(self, worker_id):
        """Atomically move job from pending to processing"""
        lua_script = """
        local pending_key = KEYS[1]
        local processing_key = KEYS[2]
        local worker_id = ARGV[1]
        local now = ARGV[2]

        local result = redis.call('ZPOPMIN', pending_key)
        if #result == 0 then
            return nil
        end

        local job_json = result[1]
        local job = cjson.decode(job_json)

        job.worker_id = worker_id
        job.started_at = tonumber(now)
        job.attempts = job.attempts + 1

        local updated_json = cjson.encode(job)
        redis.call('HSET', processing_key, job.id, updated_json)

        return updated_json
        """

        result = self.redis.eval(
            lua_script,
            2,
            self.pending_key,
            self.processing_key,
            worker_id,
            time.time()
        )

        if result:
            self.redis.hincrby(self.stats_key, 'dequeued', 1)
            return json.loads(result)
        return None

    def complete(self, job_id, result=None):
        """Mark job as completed"""
        job_json = self.redis.hget(self.processing_key, job_id)

        if not job_json:
            return False

        job = json.loads(job_json)
        job['completed_at'] = time.time()
        job['result'] = result
        job['duration'] = job['completed_at'] - job['started_at']

        pipe = self.redis.pipeline()
        pipe.hdel(self.processing_key, job_id)
        pipe.lpush(self.completed_key, json.dumps(job))
        pipe.ltrim(self.completed_key, 0, 999)  # Keep last 1000
        pipe.hincrby(self.stats_key, 'completed', 1)
        pipe.execute()

        return True

    def fail(self, job_id, error, retry=True, max_attempts=3):
        """Mark job as failed, optionally retry"""
        job_json = self.redis.hget(self.processing_key, job_id)

        if not job_json:
            return False

        job = json.loads(job_json)
        job['failed_at'] = time.time()
        job['error'] = str(error)

        pipe = self.redis.pipeline()
        pipe.hdel(self.processing_key, job_id)

        if retry and job['attempts'] < max_attempts:
            # Requeue with lower priority (higher number)
            job['priority'] = job['priority'] + 1
            pipe.zadd(self.pending_key, {json.dumps(job): job['priority']})
            pipe.hincrby(self.stats_key, 'retried', 1)
        else:
            pipe.lpush(self.failed_key, json.dumps(job))
            pipe.ltrim(self.failed_key, 0, 999)
            pipe.hincrby(self.stats_key, 'failed', 1)

        pipe.execute()
        return True

    def recover_stalled(self, timeout_seconds=300):
        """Recover jobs stuck in processing"""
        now = time.time()
        processing = self.redis.hgetall(self.processing_key)
        recovered = 0

        for job_id, job_json in processing.items():
            job = json.loads(job_json)

            if now - job.get('started_at', 0) > timeout_seconds:
                # Job is stalled, requeue it
                self.redis.hdel(self.processing_key, job_id)
                job['stalled_recovery'] = True
                self.redis.zadd(self.pending_key, {json.dumps(job): job['priority']})
                recovered += 1

        return recovered

    def get_stats(self):
        """Get queue statistics"""
        stats = self.redis.hgetall(self.stats_key)

        return {
            'pending': self.redis.zcard(self.pending_key),
            'processing': self.redis.hlen(self.processing_key),
            'completed_total': int(stats.get('completed', 0)),
            'failed_total': int(stats.get('failed', 0)),
            'retried_total': int(stats.get('retried', 0)),
            'enqueued_total': int(stats.get('enqueued', 0))
        }

    def get_pending_by_priority(self):
        """Get count of pending jobs by priority"""
        jobs = self.redis.zrange(self.pending_key, 0, -1, withscores=True)
        by_priority = {}

        for job_json, score in jobs:
            priority = int(score)
            by_priority[priority] = by_priority.get(priority, 0) + 1

        return by_priority

# Usage
queue = ProductionPriorityQueue('email-sending', r)

# Enqueue jobs
for i in range(10):
    job_id = queue.enqueue(
        {'to': f'user{i}@example.com', 'template': 'welcome'},
        priority=i % 3 + 1
    )
    print(f"Enqueued: {job_id}")

# Worker loop
worker_id = f"worker-{uuid.uuid4().hex[:8]}"

for _ in range(5):
    job = queue.dequeue(worker_id)
    if job is None:
        break

    print(f"Processing job {job['id']}")

    try:
        # Simulate work
        time.sleep(0.1)

        # Mark complete
        queue.complete(job['id'], result={'sent': True})

    except Exception as e:
        queue.fail(job['id'], error=e)

# Check stats
print(f"Stats: {queue.get_stats()}")
print(f"By priority: {queue.get_pending_by_priority()}")
```

## Best Practices

1. **Use negative scores for "higher is better"**: If higher numbers mean higher priority, negate them
2. **Combine with timestamps for FIFO within priority**: Use composite scores
3. **Implement timeout and recovery**: Always handle stalled jobs
4. **Monitor queue depth by priority**: Alert on priority inversion
5. **Use Lua scripts for atomicity**: Critical for reliable dequeue

## Conclusion

Redis sorted sets provide an excellent foundation for priority queues. Key patterns:

- Basic queue with ZADD/ZPOPMIN
- Multi-level priorities with composite scores
- Delayed execution with scheduled time as score
- Fair queuing with priority aging
- Production features: retry, recovery, monitoring

Choose the pattern that fits your use case, and remember that reliability often matters more than raw performance for job queues.
