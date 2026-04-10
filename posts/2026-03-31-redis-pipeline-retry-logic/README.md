# How to Implement Pipeline with Retry Logic in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Retry, Reliability

Description: Implement retry logic for Redis pipelines, handling transient connection errors and partial failures with exponential backoff and command-level error tracking.

---

Redis pipelines can fail at two levels: the entire batch fails due to a connection error, or individual commands fail due to type errors or key mismatches. Retry logic must handle both cases differently.

## Types of Pipeline Failures

```text
1. Connection error - network drop, Redis restart, timeout
   Result: entire batch must be retried

2. Command error - WRONGTYPE, wrong arity, Lua error
   Result: only that command failed; retrying will fail again

3. Partial execution - connection dropped mid-pipeline during send or response read
   Result: unknown how many commands were processed
```

## Basic Retry for Connection Errors

```python
import redis
import time
import logging

def execute_pipeline_with_retry(r, commands, max_retries=3, backoff=0.5):
    """
    commands: list of (method_name, *args) tuples
    Returns list of results or raises after max_retries
    """
    attempt = 0
    while attempt <= max_retries:
        pipe = r.pipeline(transaction=False)
        for method, *args in commands:
            getattr(pipe, method)(*args)
        try:
            results = pipe.execute(raise_on_error=False)
            return results
        except (redis.ConnectionError, redis.TimeoutError) as e:
            attempt += 1
            if attempt > max_retries:
                raise
            wait = backoff * (2 ** (attempt - 1))
            logging.warning(
                f"Pipeline attempt {attempt} failed: {e}. Retrying in {wait:.1f}s"
            )
            time.sleep(wait)
```

## Separating Retriable vs Non-Retriable Errors

```python
import redis

RETRIABLE_ERRORS = (redis.ConnectionError, redis.TimeoutError)

def classify_results(results):
    permanent_failures = []
    successes = []
    for i, result in enumerate(results):
        if isinstance(result, redis.ResponseError):
            permanent_failures.append((i, result))
        else:
            successes.append((i, result))
    return successes, permanent_failures

commands = [
    ("set", "user:1", "alice"),
    ("incr", "user:1"),    # will fail - user:1 is a string
    ("set", "user:2", "bob"),
]

results = execute_pipeline_with_retry(r, commands)
successes, failures = classify_results(results)

for i, err in failures:
    logging.error(f"Permanent failure at command {i}: {err}")
    # Do NOT retry these - they will fail again
```

## Idempotent Commands and Retry Safety

Not all commands are safe to retry:

```text
Command     Idempotent?   Notes
SET         Yes           Overwriting with same value is safe
GET         Yes           Read-only
INCR        No            Will double-count on retry
RPUSH       No            Will add duplicates
EXPIRE      Yes           Safe to set TTL again
SETNX       Yes           No-op if key already exists
```

For non-idempotent commands, use a deduplication pattern:

```python
import uuid

def safe_increment(r, key, request_id):
    """Idempotent increment using a request ID.
    Pass the same request_id across retries to prevent double-counting."""
    lock_key = f"incr_lock:{key}:{request_id}"

    pipe = r.pipeline(transaction=False)
    pipe.set(lock_key, "1", nx=True, ex=10)  # claim slot
    result = pipe.execute()

    if result[0]:  # True if key was newly set
        return r.incr(key)
    else:
        return None  # already processed
```

## Retry with Exponential Backoff and Jitter

```python
import random

def backoff_with_jitter(attempt, base=0.1, cap=30.0):
    """Full jitter exponential backoff."""
    sleep = min(cap, base * (2 ** attempt))
    return random.uniform(0, sleep)

def robust_pipeline(r, commands, max_retries=5):
    for attempt in range(max_retries + 1):
        try:
            pipe = r.pipeline(transaction=False)
            for method, *args in commands:
                getattr(pipe, method)(*args)
            return pipe.execute(raise_on_error=False)
        except RETRIABLE_ERRORS as e:
            if attempt == max_retries:
                raise RuntimeError(f"Pipeline failed after {max_retries} retries") from e
            wait = backoff_with_jitter(attempt)
            time.sleep(wait)
```

## Detecting Partial Execution

When a connection drops mid-pipeline (after partial commands were sent), it is hard to know which commands ran. Use a sentinel to detect this:

```python
def pipeline_with_sentinel(r, commands):
    sentinel_key = f"sentinel:{uuid.uuid4()}"
    full_commands = commands + [("set", sentinel_key, "done")]

    try:
        results = r.pipeline(transaction=False)
        for method, *args in full_commands:
            getattr(results, method)(*args)
        responses = results.execute(raise_on_error=False)
        # If last response is True, all commands reached the server
        if responses[-1] is not True:
            raise RuntimeError("Partial execution detected")
        return responses[:-1]
    except redis.ConnectionError:
        # Check if sentinel was set (commands may have run)
        if r.exists(sentinel_key):
            r.delete(sentinel_key)
            raise RuntimeError("Commands may have partially executed - check state")
        raise  # clean failure, safe to retry
```

## Summary

Redis pipeline retry logic must distinguish connection errors (safe to retry the entire batch) from command errors (permanent, do not retry). Use exponential backoff with jitter for connection retries, verify command idempotency before retrying non-read operations, and use sentinel keys to detect partial execution after mid-pipeline connection drops.
