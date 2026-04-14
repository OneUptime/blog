# How to Test Dapr Distributed Lock Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Testing, Local Development, Redis

Description: Test Dapr distributed lock behavior locally using self-hosted mode, the Dapr CLI, and Redis to verify acquire, release, expiry, and contention scenarios before deploying.

---

Testing distributed lock logic before deployment saves significant debugging time in production. Dapr's self-hosted mode lets you run a full lock store environment locally using Docker Redis. This guide walks through comprehensive local testing scenarios.

## Setup

Initialize Dapr locally:

```bash
dapr init
```

Create the lock store component:

```yaml
# components/lockstore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

## Test 1: Basic Acquire and Release

Start your app and verify the lock lifecycle via HTTP:

```bash
# Acquire a lock
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"test-lock","lockOwner":"local-test","expiryInSeconds":30}'
# Expected: {"success":true}

# Verify in Redis
redis-cli TTL "lockstore||test-lock"
# Expected: some positive number < 30

# Release the lock
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/lockstore \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"test-lock","lockOwner":"local-test"}'
# Expected: {"status":0}
```

## Test 2: Contention - Two Instances

Simulate multiple instances competing for the same lock:

```bash
# Terminal 1: Acquire with owner-A
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"shared-resource","lockOwner":"owner-A","expiryInSeconds":60}'
# Returns: {"success":true}

# Terminal 2: Try to acquire same resource with owner-B (different port/app)
curl -X POST http://localhost:3502/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"shared-resource","lockOwner":"owner-B","expiryInSeconds":60}'
# Returns: {"success":false}  -- Contention verified!
```

Start a second Dapr app on a different port for the second "instance":

```bash
dapr run --app-id app-b --dapr-http-port 3502 --resources-path ./components -- sleep 3600
```

## Test 3: Lock Expiry

Verify that a lock expires automatically:

```bash
# Acquire with 5-second expiry
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"expiry-test","lockOwner":"owner-A","expiryInSeconds":5}'

# Wait 6 seconds, then try to acquire as owner-B
sleep 6
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"expiry-test","lockOwner":"owner-B","expiryInSeconds":30}'
# Expected: {"success":true} -- Lock expired and owner-B acquired it
```

## Test 4: Wrong Owner Unlock

Verify that only the lock owner can release it:

```bash
# Acquire as owner-A
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"owner-test","lockOwner":"owner-A","expiryInSeconds":60}'

# Try to unlock as owner-B (should fail)
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/lockstore \
  -d '{"resourceId":"owner-test","lockOwner":"owner-B"}'
# Expected: {"status":2} -- LOCK_BELONGS_TO_OTHERS
```

## Test 5: Unit Testing with a Mock

For unit tests, inject a lock client interface:

```python
from unittest.mock import MagicMock

def test_process_once_with_lock():
    mock_client = MagicMock()
    mock_client.try_lock.return_value = MagicMock(success=True)
    mock_client.unlock.return_value = MagicMock(status=0)

    result = process_message_with_lock(mock_client, "msg-123", {"data": "test"})

    mock_client.try_lock.assert_called_once()
    mock_client.unlock.assert_called_once()
    assert result is True

def test_skip_when_lock_unavailable():
    mock_client = MagicMock()
    mock_client.try_lock.return_value = MagicMock(success=False)

    result = process_message_with_lock(mock_client, "msg-123", {"data": "test"})
    assert result is False
```

## Summary

Local Dapr distributed lock testing covers four scenarios: basic acquire/release, contention between instances, automatic expiry, and owner enforcement. Use the Dapr HTTP API and Redis CLI for manual verification, and inject mock lock clients for unit testing. Running two separate Dapr sidecars locally accurately simulates multi-instance contention before Kubernetes deployment.
