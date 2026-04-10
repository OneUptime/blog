# How to Build a Push Notification Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Notification, Queue, List

Description: Build a reliable push notification queue with Redis Lists - enqueue notifications, batch process them for FCM/APNs, handle delivery failures, and track device tokens.

---

Push notifications require a queue to decouple notification creation from delivery. Redis Lists act as a fast, reliable queue for push notification jobs that worker processes consume.

## Data Model

```text
push:queue:high         -> List: high-priority notification jobs
push:queue:normal       -> List: normal-priority notification jobs
push:processing         -> Sorted Set: jobs being processed (with expiry score)
push:failed             -> List: failed jobs for retry
push:tokens:{userId}    -> Set: FCM/APNs device tokens for a user
```

## Registering Device Tokens

```python
import redis
import json
import time
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_TOKENS_PER_USER = 10

def register_token(user_id, token, platform):
    key = f"push:tokens:{user_id}"
    # Store token with platform metadata
    token_data = json.dumps({"token": token, "platform": platform})
    r.sadd(key, token_data)
    # Trim if too many tokens (Sets are unordered, removes an arbitrary token)
    all_tokens = r.smembers(key)
    if len(all_tokens) > MAX_TOKENS_PER_USER:
        for td in all_tokens:
            if td != token_data:
                r.srem(key, td)
                break

def get_user_tokens(user_id):
    token_data_set = r.smembers(f"push:tokens:{user_id}")
    return [json.loads(td) for td in token_data_set]

def remove_token(user_id, token):
    key = f"push:tokens:{user_id}"
    all_tokens = r.smembers(key)
    for td in all_tokens:
        if json.loads(td)["token"] == token:
            r.srem(key, td)
            break
```

## Enqueuing a Notification

```python
def enqueue_push(user_id, title, body, data=None, priority="normal"):
    tokens = get_user_tokens(user_id)
    if not tokens:
        return 0

    job = json.dumps({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tokens": tokens,
        "title": title,
        "body": body,
        "data": data or {},
        "enqueued_at": time.time(),
    })

    queue_key = f"push:queue:{priority}"
    r.rpush(queue_key, job)
    return len(tokens)
```

## Processing the Queue

```python
VISIBILITY_TIMEOUT = 60  # seconds

def dequeue_push(priority="normal"):
    queue_key = f"push:queue:{priority}"
    job_data = r.lpop(queue_key)
    if not job_data:
        return None

    job = json.loads(job_data)
    # Mark as processing with timeout
    r.zadd("push:processing", {job_data: time.time() + VISIBILITY_TIMEOUT})
    return job, job_data

def ack_push(job_data):
    r.zrem("push:processing", job_data)

def nack_push(job_data, max_retries=3):
    r.zrem("push:processing", job_data)
    job = json.loads(job_data)
    retries = job.get("retries", 0)
    if retries < max_retries:
        job["retries"] = retries + 1
        r.rpush("push:queue:normal", json.dumps(job))
    else:
        r.lpush("push:failed", job_data)
```

## Re-queuing Stuck Jobs

```python
def requeue_stuck_jobs():
    now = time.time()
    stuck = r.zrange("push:processing", 0, now, byscore=True)
    if stuck:
        pipe = r.pipeline()
        for job_data in stuck:
            pipe.zrem("push:processing", job_data)
            pipe.rpush("push:queue:normal", job_data)
        pipe.execute()
    return len(stuck)
```

## Example Usage

```bash
# Enqueue
RPUSH push:queue:normal '{"id":"abc","user_id":"user:1","title":"Hello","body":"World"}'

# Dequeue (worker)
LPOP push:queue:normal

# Check queue depth
LLEN push:queue:normal
LLEN push:queue:high
```

## Summary

Redis Lists provide a fast FIFO queue for push notifications with O(1) enqueue and dequeue. A processing Sorted Set with expiry scores enables visibility timeouts so stuck jobs are automatically requeued. Priority queues are implemented as separate Lists, and workers simply check high-priority first before normal. Failed jobs accumulate in a separate List for manual inspection or retry.
