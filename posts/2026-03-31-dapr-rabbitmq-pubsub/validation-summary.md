# Validation Summary: How to Configure Dapr with RabbitMQ Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- RabbitMQ (AMQP message broker)
- RabbitMQ Cluster Kubernetes Operator
- Kubernetes
- JavaScript / Node.js (@dapr/dapr SDK)
- Express.js

## Sources Consulted
- Dapr RabbitMQ Pub/Sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr pub/sub CloudEvents documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr components-contrib source code (pubsub/rabbitmq/metadata.go) — https://github.com/dapr/components-contrib/blob/master/pubsub/rabbitmq/metadata.go
- RabbitMQ Cluster Operator documentation — https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator issue #1018 (default_user Secret mismatch) — https://github.com/rabbitmq/cluster-operator/issues/1018
- RabbitMQ configuration reference — https://www.rabbitmq.com/docs/configure
- Dapr declarative subscription spec — https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **`host` metadata field deprecated; replaced with `connectionString`** — The Dapr RabbitMQ pub/sub component renamed the `host` metadata field to `connectionString`. The old name still works as a deprecated alias, but `connectionString` is the current/preferred name per the source code mapstructure tag. Changed `host` to `connectionString`.

2. **`reconnectWait` should be `reconnectWaitSeconds`** — The Dapr source code mapstructure tag for this field is `reconnectWaitSeconds`, which accepts an integer number of seconds, not a duration string. Changed from `reconnectWait: "5s"` to `reconnectWaitSeconds: "5"`.

3. **Subscriber code used `req.body` instead of `req.body.data`** — Dapr wraps all pub/sub messages in a CloudEvents v1.0 envelope by default. The actual published payload is in the `.data` field of the envelope. Using `req.body` directly would give the subscriber the full CloudEvents envelope (with `id`, `source`, `specversion`, `type`, `data`, etc.) rather than the invoice object. Changed `req.body` to `req.body.data`.

4. **`rabbitmqctl eval` command used unstable internal Erlang API** — The `rabbit_amqqueue:declare/6` function is an internal RabbitMQ Erlang API that is not stable across versions, not documented, and can change without notice. In RabbitMQ 3.11+ the function signature has changed. Replaced with `rabbitmqadmin declare queue` which is the officially supported CLI approach.

5. **`default_user`/`default_pass` in RabbitmqCluster `additionalConfig` causes credential Secret mismatch** — Setting default credentials via `additionalConfig` is a known issue (rabbitmq/cluster-operator#1018). The operator auto-generates a Kubernetes Secret named `<cluster-name>-default-user`, but overriding credentials in `additionalConfig` does not update that Secret, causing authentication failures for tooling that reads the Secret. Replaced with the recommended approach of pre-creating the default user Secret before the RabbitmqCluster resource.

## Review Notes
- The `persistence.storage` field works without `storageClassName` only if the Kubernetes cluster has a default StorageClass configured. For production deployments, explicitly setting `storageClassName` is recommended.
- The `deletedWhenUnused` field name was verified as correct per the Dapr source code mapstructure tag (despite looking like it might be a typo of `deleteWhenUnused`).
- The subscriber error handling uses HTTP status codes (200/500) which is the simpler backward-compatible approach. Dapr also supports returning JSON bodies with `{ "status": "SUCCESS" }`, `{ "status": "RETRY" }`, or `{ "status": "DROP" }` for more granular control.
