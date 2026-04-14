# Validation Summary: How to Set Up Dapr Pub/Sub with RabbitMQ

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- RabbitMQ (AMQP message broker)
- Docker
- Kubernetes (Deployments, Services, Secrets)
- Python (Dapr SDK, Flask)
- Dapr CLI

## Sources Consulted
- Dapr RabbitMQ pub/sub component documentation — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr pub/sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK documentation — https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (publish_event signature) — https://github.com/dapr/python-sdk
- Dapr subscription specification — https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr components-contrib RabbitMQ metadata — https://github.com/dapr/components-contrib/tree/master/pubsub/rabbitmq
- RabbitMQ Docker image documentation — https://hub.docker.com/_/rabbitmq

## Issues Found

### 1. Deprecated metadata field name `host` (changed to `connectionString`)
- **What was wrong:** The Dapr component YAML used `name: host` for the AMQP connection string. The `host` field is deprecated in favor of `connectionString` in current Dapr documentation and component metadata schemas.
- **What was changed:** Replaced `name: host` with `name: connectionString` in the main component configuration, the Kubernetes secret reference example, and the TLS configuration section.
- **Why:** Using the current recommended field name ensures the configuration matches official documentation and avoids reliance on a deprecated alias.

### 2. Incorrect metadata field name `reconnectWait` (changed to `reconnectWaitSeconds`)
- **What was wrong:** The Dapr component YAML used `name: reconnectWait`. The correct metadata field name is `reconnectWaitSeconds`. Using the wrong name would cause the setting to be silently ignored.
- **What was changed:** Replaced `name: reconnectWait` with `name: reconnectWaitSeconds`.
- **Why:** The mapstructure tag in the Dapr source code maps to `reconnectWaitSeconds`. The incorrect field name would not be recognized, and the component would fall back to the default value.

## Review Notes
- The Subscription resource uses `apiVersion: dapr.io/v1alpha1`, which still works but `dapr.io/v2alpha1` is the newer version supporting CEL-based routing rules. For a simple single-route subscription like this, v1alpha1 is adequate.
- The post creates `rabbitmq-secret` via `kubectl create secret` in two separate sections (once for the RabbitMQ deployment password, once for the Dapr component connection string). If a reader runs both commands sequentially, the second will fail because the secret already exists. In practice, users should create the secret once with all needed keys or use separate secret names.
- The `reconnectWaitSeconds: "0"` setting means immediate reconnection on disconnect, which could cause tight retry loops in production. A non-zero value (e.g., `"5"`) would be more appropriate for production deployments.
- The `exchangeKind: "fanout"` is the default and could be omitted, but including it explicitly is fine for clarity.
- Python SDK code, Flask subscriber, Docker commands, Kubernetes manifests, curl commands, TLS configuration, and the Mermaid diagram are all technically correct.
