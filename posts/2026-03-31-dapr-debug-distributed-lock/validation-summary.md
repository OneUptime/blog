# Validation Summary: How to Debug Distributed Lock Issues in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed lock building block)
- Redis (as lock store backend)
- Go (Dapr Go SDK)
- OpenTelemetry / Zipkin (distributed tracing)
- Dapr CLI
- Dapr HTTP API

## Sources Consulted
- Dapr Distributed Lock API Reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Distributed Lock Overview: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/distributed-lock-api-overview/
- Dapr Go SDK Client Documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK source (pkg.go.dev): https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr components-contrib Redis lock source: https://github.com/dapr/components-contrib/blob/master/lock/redis/standalone.go
- Dapr runtime lock key config source: https://github.com/dapr/dapr/blob/master/pkg/components/lock/lock_config.go
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Tracing Setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/

## Issues Found

### 1. Incorrect Redis key format throughout the post
**What was wrong:** The post used `lockstore||<resourceID>||<lockOwner>` as the Redis key format (e.g., `lockstore||my-resource||worker-1`). This was wrong in three ways: (a) the key prefix is `lock`, not the store component name; (b) the second segment is the app ID, not the resource ID; (c) the lock owner is stored as the Redis string value, not as part of the key. The actual default key format is `lock||<appID>||<resourceID>`.

**What was changed:** Updated all Redis CLI commands to use the correct key format `lock||<appID>||<resourceID>`. Added an explanatory sentence clarifying that the lock owner is stored as the value, not part of the key.

**Why:** The Dapr runtime's `GetModifiedLockKey` function (in `lock_config.go`) prepends `lock||<appID>||` to the resource ID by default (using the `appid` key prefix strategy). The Redis lock component (`standalone.go`) stores the lock owner as the value via `SetNX(ctx, resourceID, lockOwner, expiry)`.

### 2. Non-existent Go SDK constant `dapr.UnlockSuccess`
**What was wrong:** The Go code example used `dapr.UnlockSuccess` to check the unlock response status. This constant does not exist in the Dapr Go SDK.

**What was changed:** Replaced `dapr.UnlockSuccess` with the string literal `"SUCCESS"`, which is what the SDK's `UnlockResponse.Status` field contains on success (derived from the protobuf enum `UnlockResponse_SUCCESS`).

**Why:** The Dapr Go SDK does not export a `UnlockSuccess` constant. The `Status` field on `UnlockResponse` is a string populated from the protobuf enum name.

## Review Notes
- The distributed lock API remains in alpha (`v1.0-alpha1`). The post correctly uses this prefix, but readers should be aware the API may change.
- The Redis key prefix strategy is configurable (appid, name, none, or custom). The post now uses the default `appid` strategy. Users with a different `keyPrefix` configuration will see different key formats.
- The `redis-cli KEYS` command used for inspecting and counting locks is fine for debugging but should not be used in production monitoring on large Redis instances due to its O(N) blocking behavior. The post appropriately frames these as debugging techniques.
