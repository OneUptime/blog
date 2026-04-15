# Validation Summary: How to Use Dapr Azure Event Hubs Binding for Event Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings building block)
- Azure Event Hubs
- Azure Blob Storage (checkpoint management)
- Azure CLI
- Node.js / JavaScript (Dapr JS SDK, Express)
- Kubernetes (secrets)

## Sources Consulted
- Dapr Azure Event Hubs binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/eventhubs/
- Dapr input bindings how-to: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr JS SDK source (IClientBinding interface): https://github.com/dapr/js-sdk
- Dapr components-contrib Event Hubs source (metadata keys): https://github.com/dapr/components-contrib
- Azure CLI `az eventhubs eventhub create --help` (local verification)
- Azure Event Hubs AMQP system properties documentation

## Issues Found

1. **Incorrect Event Hubs metadata header names (line 115-117)**: The blog used `x-eventhubs-partition-id`, `x-eventhubs-sequence-number`, and `x-eventhubs-offset` as HTTP header names for input binding metadata. The correct header names use the AMQP `x-opt-` prefix: `x-opt-partition-id`, `x-opt-sequence-number`, and `x-opt-offset`. Fixed all three header references.

2. **Deprecated Azure CLI flag `--message-retention` (line 29)**: The `--message-retention` parameter no longer exists in the current Azure CLI for `az eventhubs eventhub create`. The correct parameter is `--retention-time` (alias: `--retention-time-in-hours`), which specifies retention in hours rather than days. Changed `--message-retention 3` to `--retention-time 72` (72 hours = 3 days).

## Review Notes
- The Dapr component YAML correctly uses `secretKeyRef` for sensitive values (connection string and storage key), which is a good security practice.
- The blog only shows connection string authentication. Azure AD / managed identity authentication is also supported and is the recommended approach for production. This is not an error but could be noted in a future update.
- The `consumerGroup` value `dapr-consumer` is a custom group; users must create it in Event Hubs before deploying (not shown in the blog). The default consumer group `$Default` would work without this step.
- The top-level `await` in the publishing code example (line 92) requires either an async wrapper function or top-level await support (ES modules with Node.js 14.8+). This is a minor stylistic choice, not an error.
