# Validation Summary: How to Choose Between AWS DynamoDB and Redis for Dapr State Store

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Dapr (state management API, component configuration)
- AWS DynamoDB (state store backend)
- Redis / Amazon ElastiCache (state store backend)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr DynamoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr JavaScript SDK source (`IClientState` interface for `get` and `save` method signatures)
- AWS DynamoDB documentation (item size limits, billing modes, Global Tables, consistency model)
- Redis documentation (string value size limits, persistence options, cluster replication)

## Issues Found
No technical issues found.

## Review Notes
- The DynamoDB component type `state.aws.dynamodb` and all metadata fields (`table`, `region`, `ttlAttributeName`) are correct per official Dapr docs.
- The Redis component type `state.redis` and metadata fields (`redisHost`, `redisPassword` with `secretKeyRef`, `enableTLS`) are correct per official Dapr docs.
- The Dapr State API GET endpoint format `/v1.0/state/{store-name}/{key}` on default port 3500 is accurate.
- The JavaScript SDK usage (`client.state.get(storeName, key)` and `client.state.save(storeName, [{key, value}])`) matches the `IClientState` interface in `@dapr/dapr`.
- DynamoDB 400KB max item size and Redis 512MB max string value size are both accurate per official AWS and Redis documentation.
- The comparison table's "Strong consistency" row for Redis states "Eventual (Cluster), Strong (single)" which is a reasonable simplification — in Redis Cluster mode, reads from replicas are eventually consistent while reads from the primary remain strongly consistent.
- The hybrid cache-aside pattern is a well-known architecture pattern and the implementation shown is correct.
