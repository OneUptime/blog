# Validation Summary: How to Choose Cost-Effective Dapr Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component model, state stores, pub/sub, bindings)
- Redis (state store and pub/sub via Redis Streams)
- Apache Kafka (pub/sub)
- PostgreSQL, Azure Cosmos DB, AWS DynamoDB (mentioned in cost comparison)
- Kubernetes (component CRDs, kubectl)
- Prometheus (metrics querying)

## Sources Consulted
- Dapr Redis state store component spec (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr Redis pub/sub component spec (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr Kafka pub/sub component spec (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr HTTP binding component spec (https://docs.dapr.io/reference/components-reference/supported-bindings/http/)
- Dapr observability and metrics documentation (https://docs.dapr.io/operations/observability/metrics/)
- Dapr state management TTL documentation (https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/)
- Cross-referenced with validated sibling blog post: posts/2026-03-31-dapr-component-health-metrics/README.md

## Issues Found

1. **Removed invalid `ttlInSeconds` component metadata field from state.redis spec.**
   - The post included `ttlInSeconds` as a metadata field in the Redis state store component YAML. This is not a valid component-level metadata field for `state.redis`. In Dapr, TTL for state entries is set per-request via the State Management API (as request metadata), not as a component configuration field. Removed the field to avoid misleading readers into thinking it would apply a default TTL.

2. **Fixed incorrect Prometheus metric name `dapr_state_get_total`.**
   - Changed to `dapr_component_state_get_total`. Dapr component-level metrics follow the `dapr_component_<type>_<operation>_<metric>` naming convention. The original name omitted the `component_` prefix. Confirmed against the validated Dapr component health metrics blog post in this same blog.

3. **Fixed incorrect Prometheus metric name `dapr_component_operation_count`.**
   - Changed to `dapr_component_state_count`. There is no generic `dapr_component_operation_count` metric in Dapr. The correct metric for tracking state store operation counts is `dapr_component_state_count`. Confirmed against validated sibling blog posts.

## Review Notes
- The cost figures in the comparison table (e.g., DynamoDB at $0.25/million reads, Cosmos DB at ~$0.008/RU) are approximate and subject to change with cloud provider pricing updates. They are reasonable as ballpark figures at the time of writing.
- The `maxLenApprox` field for `pubsub.redis` is valid — it maps to Redis Streams' XADD MAXLEN ~ option for capping stream length.
- The Kubernetes labels on the Component CRD metadata section is valid standard Kubernetes labeling and works correctly for cost allocation tagging.
- All component YAML structures use `apiVersion: dapr.io/v1alpha1` and `version: v1`, which are current and valid.
