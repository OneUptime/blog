# Validation Summary: How to Configure a State Store and Pub/Sub Message Broker in Dapr

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Dapr (state management and pub/sub building blocks)
- Redis (as state store and pub/sub broker)
- PostgreSQL (as alternative state store, v2 component)
- Apache Kafka (as alternative pub/sub broker)
- Python (Flask for subscriber, requests for publisher)
- Docker (for running PostgreSQL and Kafka locally)
- Kubernetes (production component configuration with secrets)

## Sources Consulted
- [Dapr Redis State Store Component](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/) - verified metadata field names (redisHost, redisPassword, enableTLS, maxRetries, failover, actorStateStore)
- [Dapr PostgreSQL v2 State Store Component](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/) - verified metadata fields; confirmed `tablePrefix` is the correct field (not `tableName`), and that v2 auto-creates tables
- [Dapr PostgreSQL v1 State Store Component](https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/) - confirmed `tableName` exists only in v1, not v2
- [Dapr Redis Pub/Sub Component](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/) - verified metadata field names (redisHost, redisPassword, enableTLS, consumerID)
- [Dapr Apache Kafka Pub/Sub Component](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/) - verified `initialOffset` is the correct field name (not `autoOffsetReset`), with values `oldest`/`newest`
- [Dapr Metadata API Reference](https://docs.dapr.io/reference/api/metadata_api/) - confirmed the response field is `components` (not `registeredComponents`)
- [Dapr State Management API Reference](https://docs.dapr.io/reference/api/state_api/) - verified HTTP endpoints for state operations
- [Dapr Pub/Sub API Reference](https://docs.dapr.io/reference/api/pubsub_api/) - verified HTTP endpoints for publish operations
- [Dapr Programmatic Subscription Methods](https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/) - verified programmatic subscription format
- [Dapr Component Schema](https://docs.dapr.io/reference/resource-specs/component-schema/) - verified `auth` and `scopes` placement at root level

## Issues Found

1. **Kafka pub/sub: incorrect metadata field name and value** - The Kafka component used `autoOffsetReset: earliest`, but the correct Dapr metadata field is `initialOffset` with value `oldest`. Changed to `initialOffset: oldest`.

2. **PostgreSQL v2: invalid `tableName` metadata field** - The PostgreSQL v2 component specified `tableName: state`, but `tableName` is not a valid metadata field in v2 (it exists only in v1). The v2 equivalent is `tablePrefix`. Since the default behavior already creates a table named `state`, the field was removed entirely.

3. **PostgreSQL v2: unnecessary manual table creation** - The post included a manual `CREATE TABLE` SQL statement for the PostgreSQL state table. Dapr's PostgreSQL v2 component auto-creates the required tables with the correct schema on first use. The manual creation was removed and replaced with a note about auto-creation, as a user-created table with a slightly different schema could conflict with Dapr's expectations.

4. **Metadata API: incorrect JSON field name** - The `jq` query used `.registeredComponents` but the Dapr metadata API response uses `.components`. Changed to the correct field name.

## Review Notes
- The programmatic subscription in the Flask subscriber uses the simple `route` field. Current Dapr documentation favors the `routes` object format (with `rules` and `default`), but the simple `route` string is still accepted by the Dapr runtime for backward compatibility. This is not incorrect but readers should be aware that the `routes` format is now the recommended approach.
- The Kubernetes component YAML correctly places `auth` and `scopes` at the root level (same level as `spec`), which matches the official component schema.
- All Dapr HTTP API endpoints (`/v1.0/state/`, `/v1.0/publish/`, `/v1.0/metadata`) are correct.
- The Redis component configurations (both state store and pub/sub) use correct and current metadata field names.
- The Bitnami Kafka KRaft-mode Docker command is correct for local development.
