# Validation Summary: How to Configure Lock Timeout in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Distributed Lock API (alpha)
- Redis (as lock store backend)
- Go (Dapr Go SDK)
- Python (Dapr Python SDK)

## Sources Consulted
- Dapr Distributed Lock API Reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Redis Lock Component Spec: https://docs.dapr.io/reference/components-reference/supported-locks/redis-lock/
- Dapr Distributed Lock Overview: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/distributed-lock-api-overview/
- Dapr Go SDK lock.go source: https://github.com/dapr/go-sdk/blob/main/client/lock.go
- Dapr Python SDK client.py source: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr components-contrib Redis lock source: https://github.com/dapr/components-contrib/blob/main/lock/redis/standalone.go
- Dapr lock key config source: https://github.com/dapr/dapr/blob/master/pkg/components/lock/lock_config.go

## Issues Found

1. **Redis key format was incorrect** (Verifying Lock TTL in Redis section): The post claimed the Redis key format was `lockstore||invoice-generator||worker-1`. This is wrong on multiple levels: (a) the prefix is always the literal string `lock`, not the store name; (b) the second segment is the Dapr app ID, not the resource ID; (c) the lock owner is never part of the key — it is stored as the value via `SetNX`. Fixed to `lock||<appID>||invoice-generator` with a note to replace `<appID>` with the actual Dapr application ID.

2. **Fabricated `maxLockWaitTimeInSeconds` metadata field** (Component-Level Max Lock Duration section): The entire section claimed that the Redis lock component supports a `maxLockWaitTimeInSeconds` metadata field to cap lock duration at the component level. This field does not exist in the Dapr Redis lock component spec. Lock TTL is set exclusively per-request via `expiryInSeconds` — there is no component-level mechanism to cap or override lock durations. The entire section was removed.

## Review Notes
- The Distributed Lock API remains in alpha (`v1.0-alpha1`). The API path and behavior may change in future Dapr releases.
- The Go SDK example uses `dapr.LockRequest` which assumes the common import alias `dapr "github.com/dapr/go-sdk/client"`. The struct is actually defined in the `client` package. This is acceptable given the common convention but could be clearer with an import statement shown.
- The Python SDK refresh_lock example uses positional arguments, so it works correctly despite the variable being named `owner` rather than `lock_owner`. The code is functional but could be slightly misleading about the actual parameter name.
- The lock renewal pattern shown (re-acquiring with `try_lock`) will only succeed if the same owner still holds the lock. If the lock has already expired and been acquired by another owner, the re-acquisition attempt will fail silently in the example code. Production implementations should check the return value.
