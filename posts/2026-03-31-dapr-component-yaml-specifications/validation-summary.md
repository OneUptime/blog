# Validation Summary: How to Write Dapr Component YAML Specifications

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component YAML specification
- Redis state store component
- RabbitMQ pub/sub component
- Dapr CLI
- Kubernetes (for component deployment)

## Sources Consulted
- Dapr Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis State Store Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr RabbitMQ Pub/Sub Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr CLI `dapr components` Reference: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr Components Concept: https://docs.dapr.io/concepts/components-concept/

## Issues Found

1. **`spec.type` template used slash instead of dot separator**: The component YAML structure template showed `type: <component-type>/<provider>` with a slash separator. The correct Dapr convention uses a dot separator (e.g., `state.redis`, `pubsub.rabbitmq`). The post's own concrete examples already used dots correctly, but the template was inconsistent. Fixed to `type: <component-type>.<provider>`.

2. **RabbitMQ pub/sub connection field name was incorrect**: The RabbitMQ example used `host` as the metadata field for the connection string. The correct field name per Dapr documentation is `connectionString`. The `host` field does not exist in the RabbitMQ pub/sub component spec. Fixed `host` to `connectionString`.

3. **`dapr components` CLI command context was misleading**: The validation section showed `dapr components` as a standalone command after a self-hosted `dapr run`. However, `dapr components` is a Kubernetes-only command requiring the `-k` flag. It does not work in self-hosted mode. Fixed by separating the self-hosted validation (`dapr run`) from the Kubernetes component listing (`dapr components -k`) with a clarifying note.

## Review Notes
- The `auth.secretStore` field is shown with camelCase in the blog. The official schema reference uses lowercase `secretstore`, but many Dapr docs examples use camelCase `secretStore`. Both forms appear to work in practice. No change made.
- The `deletedWhenUnused` RabbitMQ metadata field name is confirmed correct per official docs.
- All Redis state store metadata field names (`redisHost`, `redisPassword`, `enableTLS`, `maxRetries`) are confirmed correct per official docs.
- The `secretKeyRef` syntax with `name` and `key` subfields is confirmed correct.
- The `scopes` and `auth` fields are correctly placed at the top level of the YAML (not nested under `spec`).
- The `--resources-path` flag is the current, non-deprecated flag (replacing the older `--components-path`).
