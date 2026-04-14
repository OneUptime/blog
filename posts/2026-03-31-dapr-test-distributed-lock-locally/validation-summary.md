# Validation Summary: How to Test Dapr Distributed Lock Locally

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) - distributed lock building block
- Redis - as the lock store backend
- Dapr CLI (`dapr init`, `dapr run`)
- Dapr HTTP API (lock/unlock endpoints)
- Python `unittest.mock` for unit testing
- Docker (implicit via `dapr init`)

## Sources Consulted
- Dapr Distributed Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Lock component (Redis) specification: https://docs.dapr.io/reference/components-reference/supported-lock/redis-lock/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr components-contrib lock/redis source for Redis key format verification
- Dapr unlock response status enum (UnlockResponse proto definition): 0=SUCCESS, 1=LOCK_DOES_NOT_EXIST, 2=LOCK_BELONGS_TO_OTHERS, 3=INTERNAL_ERROR

## Issues Found

1. **Incorrect Redis key format (Test 1, line 51)**: The Redis CLI command used the key `"lockstore||test-lock||local-test"`, which incorrectly includes the lock owner in the key. In Dapr's Redis lock implementation, the key format is `storeName||resourceId` and the owner is stored as the value at that key. Including the owner in the key would break mutual exclusion (different owners would create different keys). Fixed to `"lockstore||test-lock"`.

2. **Wrong unlock status code (Test 4, line 111)**: The expected response for unlocking with the wrong owner was listed as `{"status":1} or {"status":3}`. Status 1 is LOCK_DOES_NOT_EXIST and status 3 is INTERNAL_ERROR - neither is correct for this scenario. The correct status is `{"status":2}` (LOCK_BELONGS_TO_OTHERS). Fixed to `{"status":2}`.

3. **Deprecated CLI flag (Test 2, line 80)**: The `--components-path` flag was deprecated in Dapr 1.11 in favor of `--resources-path`. While the old flag may still work as an alias, updated to use the current flag name.

## Review Notes
- The Dapr distributed lock API path (`v1.0-alpha1`) was correct at the time the API was introduced. Depending on the Dapr version in use, the stable path (`v1.0`) may now be available. The alpha path should continue to work for backward compatibility.
- Test 2's presentation shows the curl commands before the `dapr run` command to start the second instance. Readers should start the second Dapr sidecar first before running the contention curl commands. This is a minor readability concern, not a technical error.
- The Python unit test references an undefined `process_message_with_lock` function, which is intentional - it's a conceptual example showing how to structure mock-based tests around the Dapr lock client interface.
- The curl commands in Tests 2-4 omit the `-H "Content-Type: application/json"` header that is included in Test 1. Dapr's HTTP API typically infers JSON from the request body, but including the header consistently would be best practice.
