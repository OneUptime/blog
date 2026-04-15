# Validation Summary: How to Configure Dapr Binding with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Redis output binding (`bindings.redis`)
- Redis
- Python / Flask
- Docker
- Kubernetes / Helm
- Dapr CLI

## Sources Consulted
- Dapr Redis binding component specification: https://docs.dapr.io/reference/components-reference/supported-bindings/redis/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr components-contrib Redis binding source code: https://github.com/dapr/components-contrib/blob/master/bindings/redis/redis.go

## Issues Found

1. **Incorrect operation name `set` — changed to `create`**: The blog used `"operation": "set"` throughout, but the Dapr Redis binding uses `create` (which maps to Redis SET). This affected the curl examples, the Python `cache_set` function, and the operations table. All instances were corrected to `create`.

2. **Incorrect operation name `incr` — changed to `increment`**: The blog used `"operation": "incr"`, but the correct Dapr operation name is `increment`. Fixed in the curl example, the Python `cache_incr` function, and the operations table.

3. **Fabricated operations removed from the supported operations table**: The blog listed 11 operations (`get`, `set`, `delete`, `mget`, `mset`, `incr`, `expire`, `hget`, `hset`, `llen`, `lpush`), but the Dapr Redis binding only supports 4: `create`, `get`, `delete`, and `increment`. Removed all non-existent operations from the table.

4. **Removed entire MSET and MGET section**: The `mset` and `mget` operations do not exist in the Dapr Redis binding. The entire section with fabricated payload formats was removed.

5. **Removed non-existent standalone `expire` operation**: The blog showed `expire` as a standalone operation in the Python rate-check endpoint. The Dapr Redis binding does not have an `expire` operation — TTL is applied via `ttlInSeconds` metadata on `create` and `increment` operations. Refactored the rate-check code to pass `ttl_seconds` through the `increment` call's metadata instead.

6. **Removed unused `from functools import wraps` import**: The Python code imported `wraps` from `functools` but never used it. Removed the unused import.

7. **Updated overview and summary text**: The overview claimed support for a "rich set of Redis commands" including many non-existent operations. Updated to accurately reflect the four supported operations. The summary section was similarly corrected.

8. **Updated post description**: Removed "list management" from the description since list operations (lpush, llen) don't exist in this binding.

## Review Notes
- The `increment` operation exists in the Dapr source code (added via components-contrib PR #2654) but is not yet documented on the official Dapr docs site. It is included here since it is functional in the codebase.
- The component configuration (apiVersion, kind, spec fields, metadata fields like `redisHost`, `redisPassword`, `enableTLS`, `failover`) is correct per the official docs.
- The Dapr HTTP API endpoint `/v1.0/bindings/<binding-name>` and the POST method are correct per the Bindings API reference.
- The Docker and Helm deployment commands for Redis are standard and correct.
- The `dapr run` CLI flags are correct.
- The `secretKeyRef` pattern for referencing Kubernetes secrets in the component YAML is correct.
