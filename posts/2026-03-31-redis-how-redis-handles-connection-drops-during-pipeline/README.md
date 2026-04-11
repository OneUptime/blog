# How Redis Handles Connection Drops During Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipelining, Reliability

Description: Learn what happens when a connection drops mid-pipeline in Redis, which commands execute, which do not, and how to write resilient pipelining code.

---

Redis pipelining lets you send multiple commands without waiting for responses between them. But what happens if the connection drops while commands are in flight? Understanding this behavior is critical for writing reliable code.

## How Pipelining Works

In pipelining, commands are buffered on the client side and sent to Redis in a single batch. Redis processes them in order and sends all responses back together:

```python
import redis

r = redis.Redis()
pipe = r.pipeline(transaction=False)
pipe.set("key1", "value1")
pipe.set("key2", "value2")
pipe.incr("counter")
results = pipe.execute()
```

## What Happens on Connection Drop

If the connection drops before the pipeline is sent, no commands execute. The client receives a connection error.

If the connection drops after some commands are sent but before Redis responds:
- Commands that reached Redis and were processed are already executed
- Commands that did not reach Redis were not executed
- The client has no way to know which commands succeeded

This is the partial execution problem.

## No Atomicity Guarantee Without MULTI/EXEC

A pipeline without MULTI/EXEC is not a transaction. Commands can partially execute on connection failure. To make a pipeline atomic, wrap it in a transaction:

```python
pipe = r.pipeline(transaction=True)  # Uses MULTI/EXEC
pipe.set("key1", "value1")
pipe.set("key2", "value2")
results = pipe.execute()
```

With MULTI/EXEC, if the connection drops before EXEC, the server discards the queued commands as part of connection cleanup and EXEC is never performed.

## Detecting and Handling Errors

Catch connection errors and implement retry logic with idempotent commands:

```python
import redis
from redis.exceptions import ConnectionError, TimeoutError

def execute_pipeline_safely(r, commands):
    for attempt in range(3):
        try:
            pipe = r.pipeline(transaction=False)
            for cmd, args in commands:
                getattr(pipe, cmd)(*args)
            return pipe.execute()
        except (ConnectionError, TimeoutError):
            if attempt == 2:
                raise
```

## Idempotency Is Key

Design pipeline operations to be idempotent where possible. SET is idempotent - running it twice has the same result as once. INCR is not idempotent - retrying it increments the counter twice:

```bash
# Safe to retry
SET counter 5

# Not safe to retry without checking current state
INCR counter
```

## Monitoring Pipeline Errors

Track pipeline-related errors in your Redis client metrics. In Node.js with ioredis:

```javascript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.exec((err, results) => {
  if (err) {
    console.error('Pipeline failed:', err);
  }
});
```

## Summary

Redis pipelines do not guarantee atomicity on connection failure. Commands that reached Redis before the drop are executed; others are not. Wrapping pipeline commands in MULTI/EXEC provides atomicity. For non-transactional pipelines, use idempotent operations and retry logic to handle partial failures safely.
