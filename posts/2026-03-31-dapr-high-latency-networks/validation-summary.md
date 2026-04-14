# Validation Summary: How to Configure Dapr for High-Latency Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API
- Dapr Redis State Store component (`state.redis`)
- Dapr RabbitMQ Pub/Sub component (`pubsub.rabbitmq`)
- Dapr Actor runtime configuration
- Node.js / JavaScript (application-level retry example)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Redis State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr RabbitMQ Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/

## Issues Found

1. **Default timeout claim: "Actor invocation: 60 seconds"** — The claimed 60-second default actor invocation timeout is not documented in Dapr. The 60-second value corresponds to `drainOngoingCallTimeout` (how long to wait for active calls during rebalancing), not a general actor invocation timeout. Changed to "Actor drain ongoing call timeout: 60 seconds".

2. **Per-Service Timeout Configuration used inline policy definitions** — The original YAML showed inline timeout values (e.g., `timeout: 45s`) and nested retry objects directly under `targets.apps.<appId>`. Dapr resiliency targets only support named policy references, not inline definitions. Fixed by adding a complete Resiliency resource with named policies under `spec.policies` and referencing them by name in `targets`.

3. **Redis State Store: wrong field names** — `redisConnectTimeout`, `redisReadTimeout`, and `redisWriteTimeout` are not valid Dapr Redis component metadata fields. The correct field names are `dialTimeout`, `readTimeout`, and `writeTimeout`. Fixed all three.

4. **Redis State Store: wrong value format** — Timeout values were specified as millisecond strings (e.g., `"10000"`, `"30000"`). Dapr Redis component uses Go duration strings (e.g., `"10s"`, `"30s"`). Fixed all timeout values including `poolTimeout`.

5. **RabbitMQ Pub/Sub: `host` field does not exist** — The correct metadata field is `connectionString`. Fixed.

6. **RabbitMQ Pub/Sub: `connectionAttempts` does not exist** — This is not a valid Dapr RabbitMQ metadata field. Removed.

7. **RabbitMQ Pub/Sub: `connectionWait` should be `reconnectWait`** — The correct field name for the wait duration between reconnection attempts is `reconnectWait`. Fixed.

8. **RabbitMQ Pub/Sub: `publishTimeout` does not exist** — This is not a valid Dapr RabbitMQ metadata field. Removed.

## Review Notes
- The Actor Configuration section uses a YAML `Configuration` resource with `spec.actor` path. While the field names (`actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, `drainRebalancedActors`) are correct, actor runtime configuration is typically done programmatically through the Dapr SDK rather than via a Configuration CRD. This may work in some deployment scenarios but readers should consult the Dapr actor runtime configuration docs for their specific setup.
- The Resiliency API was introduced as an alpha feature in Dapr 1.7, which is historically accurate. The `apiVersion: dapr.io/v1alpha1` reflects this alpha status.
- The JavaScript application-level retry example is syntactically correct, uses the proper Dapr HTTP API endpoint (`/v1.0/invoke/{appId}/method/{method}`), and implements exponential backoff correctly.
- The circuit breaker example uses `consecutiveFailures >= 3`, which is a valid but more aggressive threshold than the Dapr default of `consecutiveFailures > 5`. This is reasonable for the blog's high-latency context.
