# Validation Summary: How to Use Dapr with Amazon ElastiCache Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management and pub/sub components)
- Amazon ElastiCache for Redis
- AWS CLI (ElastiCache commands)
- Kubernetes (secrets management)
- Python (requests, Flask)
- Dapr HTTP API (state store and pub/sub)

## Sources Consulted
- AWS CLI reference for `elasticache create-replication-group` (`aws elasticache create-replication-group help`) — confirmed parameter is `--replication-group-description`, not `--description`
- AWS ElastiCache documentation on Redis port configuration — confirmed default port is 6379 for both TLS and non-TLS connections
- Dapr Redis state store component specification — confirmed `redisHost`, `redisPassword`, `enableTLS`, `maxRetries`, `maxRetryBackoff`, `ttlInSeconds` are valid metadata fields
- Dapr Redis pub/sub component specification — confirmed `redisHost`, `redisPassword`, `enableTLS`, `consumerID` with `{appID}` template are valid
- Dapr State Management HTTP API reference — confirmed GET returns 204 for missing keys, POST accepts `ttlInSeconds` in per-request metadata

## Issues Found
1. **Incorrect AWS CLI parameter name (line 26):** `--description` was changed to `--replication-group-description`. The `create-replication-group` command requires the full parameter name; `--description` is not a valid flag.
2. **Incorrect Redis port for ElastiCache TLS (lines 63, 91):** Port `6380` was changed to `6379` in both the state store and pub/sub component configurations. AWS ElastiCache Redis uses port 6379 for both TLS and non-TLS connections. Port 6380 is an Azure Cache for Redis convention, not AWS.

## Review Notes
- The `ttlInSeconds` field is used both at the component level (setting a default TTL) and in per-request metadata (overriding per operation). Both usages in the post are correct.
- The `cache.r7g.medium` node type and Redis engine version 7.0 are valid for ElastiCache.
- The Python code examples use correct Dapr HTTP API patterns and handle the 204 status code for missing keys appropriately.
- The subscriber Flask app correctly implements the Dapr programmatic subscription pattern via the `/dapr/subscribe` endpoint.
