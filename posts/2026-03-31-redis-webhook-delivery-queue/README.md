# How to Build a Webhook Delivery Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Webhook, Queue, Reliability

Description: Build a reliable webhook delivery queue with Redis - enqueue events, deliver with retry logic, track delivery status per endpoint, and handle dead letters.

---

Reliable webhook delivery requires queueing, retries with backoff, and delivery tracking. Redis Lists and Sorted Sets provide the primitives to build this without a dedicated message broker.

## Data Model

```text
webhook:queue            -> List: pending delivery jobs
webhook:delayed          -> Sorted Set: jobId -> retry_at timestamp
webhook:dlq              -> List: dead-letter queue for exhausted retries
webhook:status:{jobId}   -> Hash: state, attempts, last_error, delivered_at
webhook:endpoint:{endpointId} -> Hash: url, secret, active
```

## Registering a Webhook Endpoint

```python
import redis
import json
import uuid
import time
import hmac
import hashlib

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def register_endpoint(url, secret, events=None):
    endpoint_id = str(uuid.uuid4())
    r.hset(f"webhook:endpoint:{endpoint_id}", mapping={
        "url": url,
        "secret": secret,
        "events": json.dumps(events or ["*"]),
        "active": "1",
        "created_at": str(time.time()),
    })
    return endpoint_id
```

## Enqueuing a Webhook Event

```python
def enqueue_webhook(endpoint_id, event_type, payload):
    endpoint = r.hgetall(f"webhook:endpoint:{endpoint_id}")
    if not endpoint or endpoint.get("active") != "1":
        return None

    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "endpoint_id": endpoint_id,
        "url": endpoint["url"],
        "secret": endpoint["secret"],
        "event_type": event_type,
        "payload": payload,
        "attempts": 0,
        "enqueued_at": time.time(),
    }

    pipe = r.pipeline()
    pipe.rpush("webhook:queue", json.dumps(job))
    pipe.hset(f"webhook:status:{job_id}", mapping={
        "state": "pending",
        "attempts": "0",
        "enqueued_at": str(time.time()),
    })
    pipe.execute()
    return job_id
```

## Delivering a Webhook

```python
import urllib.request

MAX_RETRIES = 5

def sign_payload(secret, payload):
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

def deliver_webhook(job, http_client_fn=None):
    payload_str = json.dumps(job["payload"])
    signature = sign_payload(job["secret"], payload_str)

    try:
        req = urllib.request.Request(
            job["url"],
            data=payload_str.encode(),
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
                "X-Event-Type": job["event_type"],
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status < 400, resp.status
    except Exception as e:
        return False, str(e)

def process_webhook_queue():
    job_data = r.lpop("webhook:queue")
    if not job_data:
        return None

    job = json.loads(job_data)
    job_id = job["id"]
    job["attempts"] += 1

    success, result = deliver_webhook(job)

    if success:
        r.hset(f"webhook:status:{job_id}", mapping={
            "state": "delivered",
            "attempts": str(job["attempts"]),
            "delivered_at": str(time.time()),
        })
        return {"success": True, "job_id": job_id}

    # Retry with exponential backoff
    if job["attempts"] < MAX_RETRIES:
        delay = min(2 ** job["attempts"] * 30, 3600)  # Max 1 hour delay
        retry_at = time.time() + delay
        job["last_error"] = str(result)
        r.zadd("webhook:delayed", {json.dumps(job): retry_at})
        r.hset(f"webhook:status:{job_id}", mapping={
            "state": "retrying",
            "attempts": str(job["attempts"]),
            "last_error": str(result),
        })
    else:
        r.rpush("webhook:dlq", json.dumps(job))
        r.hset(f"webhook:status:{job_id}", mapping={
            "state": "failed",
            "attempts": str(job["attempts"]),
            "last_error": str(result),
        })

    return {"success": False, "job_id": job_id}
```

## Flushing Delayed Jobs

```python
def flush_delayed_webhooks():
    now = time.time()
    due = r.zrangebyscore("webhook:delayed", 0, now)
    if due:
        pipe = r.pipeline()
        for job_data in due:
            pipe.zrem("webhook:delayed", job_data)
            pipe.rpush("webhook:queue", job_data)
        pipe.execute()
    return len(due)
```

## Example Usage

```bash
# Enqueue webhook
RPUSH webhook:queue '{"id":"abc","url":"https://example.com/webhook","event_type":"payment.completed"}'

# Check status
HGETALL webhook:status:abc

# Queue depths
LLEN webhook:queue
ZCARD webhook:delayed
LLEN webhook:dlq
```

## Summary

Redis Lists provide FIFO webhook delivery queues with O(1) enqueue and dequeue. A Sorted Set delay scheduler implements exponential backoff without blocking the main queue. Dead-letter queuing captures exhausted retries for debugging. HMAC signature generation protects endpoint authenticity, and per-job status Hashes give operators visibility into delivery state.
