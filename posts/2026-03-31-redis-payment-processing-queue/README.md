# How to Build a Payment Processing Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Finance, Payment, Queue, Stream

Description: Build a reliable payment processing queue with Redis Streams to handle transaction submissions, ensure at-least-once delivery, and track payment status with consumer groups.

---

Payment processing requires reliable queuing: no transaction can be dropped, failed payments must be retried, and the system must handle bursts without losing messages. Redis Streams provide the durability, consumer groups, and acknowledgment semantics needed for production payment pipelines.

## Payment Submission

Enqueue a payment event to the stream:

```python
import redis
import time
import json

r = redis.Redis()

def submit_payment(payment_id, amount, currency, from_account, to_account):
    r.xadd("payments:queue", {
        "payment_id": payment_id,
        "amount": str(amount),
        "currency": currency,
        "from": from_account,
        "to": to_account,
        "submitted_at": time.time()
    })
    r.hset(f"payment:{payment_id}", mapping={
        "status": "queued",
        "amount": amount,
        "currency": currency
    })
```

## Consumer Group Setup

Create a consumer group for payment processors:

```python
def setup_consumer_group():
    try:
        r.xgroup_create("payments:queue", "payment-processors", id="0", mkstream=True)
    except redis.exceptions.ResponseError:
        pass  # Already exists
```

## Processing Payments

Workers read from the group and process payments:

```python
def process_payments(worker_name):
    while True:
        messages = r.xreadgroup(
            "payment-processors", worker_name,
            {"payments:queue": ">"},
            count=10, block=5000
        )
        for _, entries in (messages or []):
            for msg_id, fields in entries:
                payment_id = fields[b"payment_id"].decode()
                try:
                    execute_payment(fields)
                    r.hset(f"payment:{payment_id}", "status", "completed")
                    r.xack("payments:queue", "payment-processors", msg_id)
                except Exception as e:
                    r.hset(f"payment:{payment_id}", mapping={
                        "status": "failed", "error": str(e)
                    })
                    move_to_dead_letter(msg_id, fields)
```

## Dead Letter Queue

Move failed payments to a separate stream for manual review:

```python
def move_to_dead_letter(original_msg_id, fields):
    fields["original_msg_id"] = original_msg_id
    fields["failed_at"] = time.time()
    r.xadd("payments:dead_letter", fields)
    r.xack("payments:queue", "payment-processors", original_msg_id)
```

## Handling Pending Messages (Crashes)

Reclaim messages that were claimed but not acknowledged after a timeout:

```python
def reclaim_stale_messages(min_idle_ms=30000):
    pending = r.xpending_range(
        "payments:queue", "payment-processors",
        min="-", max="+", count=50
    )
    for entry in pending:
        if entry["time_since_delivered"] > min_idle_ms:
            r.xclaim(
                "payments:queue", "payment-processors",
                "recovery-worker", min_idle_ms,
                [entry["message_id"]]
            )
```

## Payment Status API

Check status at any time:

```bash
HGETALL payment:pay-abc123
```

```python
def get_payment_status(payment_id):
    return r.hgetall(f"payment:{payment_id}")
```

## Throughput Monitoring

Track processing rates:

```bash
INCR payments:stats:processed
INCR payments:stats:failed
```

## Summary

Redis Streams give payment processing systems durable, ordered queuing with consumer group semantics and acknowledgment-based delivery guarantees. Dead letter queues catch failed payments for review, and automatic reclaim logic ensures no transaction is silently abandoned even when a worker crashes mid-processing.
