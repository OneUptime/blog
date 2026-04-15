# How to Acquire and Release a Lock in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Concurrency, Redis, Microservice

Description: Step-by-step guide to acquiring and releasing distributed locks in Dapr using the HTTP API and Python SDK with real-world examples.

---

Dapr's Distributed Lock API enables microservices to coordinate access to shared resources. Properly acquiring and releasing locks - and handling edge cases like crashes or timeouts - is critical for building reliable systems. This guide walks through the full lock lifecycle.

## Prerequisites

Deploy a Redis-backed lock store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

## Generating a Unique Lock Owner ID

Each service instance needs a unique identifier to own locks:

```python
import uuid
import socket

LOCK_OWNER = f"{socket.gethostname()}-{uuid.uuid4()}"
print(f"Lock owner: {LOCK_OWNER}")
```

## Acquiring a Lock

Use the Dapr Python SDK to request a lock:

```python
from dapr.clients import DaprClient

STORE_NAME = "lockstore"
RESOURCE_ID = "payment-processor"
EXPIRY_SECONDS = 30

with DaprClient() as client:
    response = client.try_lock(
        store_name=STORE_NAME,
        resource_id=RESOURCE_ID,
        lock_owner=LOCK_OWNER,
        expiry_in_seconds=EXPIRY_SECONDS
    )
    if response.success:
        print("Lock acquired")
    else:
        print("Lock not available - skipping")
```

## Releasing a Lock

Always release the lock after completing the critical section:

```python
from dapr.clients.grpc._response import UnlockResponseStatus

with DaprClient() as client:
    result = client.unlock(
        store_name=STORE_NAME,
        resource_id=RESOURCE_ID,
        lock_owner=LOCK_OWNER
    )
    if result.status == UnlockResponseStatus.success:
        print("Lock released successfully")
    else:
        print(f"Unlock failed with status: {result.status}")
```

## Full Try-Lock-Release Pattern

Combine acquire and release in a safe wrapper:

```python
from contextlib import contextmanager
from dapr.clients import DaprClient

@contextmanager
def dapr_lock(client, store_name, resource_id, lock_owner, expiry=30):
    response = client.try_lock(
        store_name=store_name,
        resource_id=resource_id,
        lock_owner=lock_owner,
        expiry_in_seconds=expiry
    )
    acquired = response.success
    try:
        yield acquired
    finally:
        if acquired:
            client.unlock(
                store_name=store_name,
                resource_id=resource_id,
                lock_owner=lock_owner
            )

# Usage
with DaprClient() as client:
    with dapr_lock(client, STORE_NAME, RESOURCE_ID, LOCK_OWNER) as acquired:
        if acquired:
            process_payment()
        else:
            print("Skipped - lock not available")
```

## Handling Lock Failures

Consider retry logic when a lock is temporarily unavailable:

```python
import time

def acquire_with_retry(client, store, resource, owner, retries=3, delay=1):
    for attempt in range(retries):
        resp = client.try_lock(store, resource, owner, expiry_in_seconds=30)
        if resp.success:
            return True
        print(f"Attempt {attempt + 1} failed, retrying in {delay}s...")
        time.sleep(delay)
    return False
```

## Summary

Properly acquiring and releasing Dapr locks requires generating a unique owner ID per instance, setting a reasonable expiry, and always releasing in a finally block. The context manager pattern shown here makes lock management clean and prevents accidental lock leaks. Retry logic handles temporary contention gracefully without busy-waiting indefinitely.
