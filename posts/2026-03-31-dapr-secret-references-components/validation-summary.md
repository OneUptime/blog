# Validation Summary: How to Use Secret References in Dapr Component Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component YAML configuration
- Dapr Secret Store building block
- Kubernetes Secrets
- HashiCorp Vault
- Redis (state store)
- RabbitMQ (pub/sub)
- kubectl CLI

## Sources Consulted
- Dapr official docs: Component secrets — https://docs.dapr.io/operations/components/component-secrets/
- Dapr official docs: Supported secret stores — https://docs.dapr.io/reference/components-reference/supported-secret-stores/
- Dapr official docs: Secrets overview — https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/
- Dapr official docs: RabbitMQ pub/sub setup — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr official docs: Redis state store setup — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

1. **Incorrect Kubernetes secret store name**: The "Specifying the Secret Store for Component Auth" section used `kubernetes-secrets` as the `auth.secretStore` value. The correct built-in Kubernetes secret store name in Dapr is `kubernetes`. Changed `kubernetes-secrets` to `kubernetes`.

2. **Incorrect RabbitMQ metadata field name**: The "Multiple Secret References in One Component" section used `host` as a metadata field name for the RabbitMQ pub/sub component. According to the official Dapr RabbitMQ component documentation, the correct field name is `hostname`. Changed `host` to `hostname` in the YAML metadata, the corresponding Kubernetes secret `--from-literal` key, and the surrounding prose.

3. **Incorrect RabbitMQ hostname value**: The kubectl command used `amqp://rabbitmq:5672` as the value for the hostname secret. The `amqp://` protocol prefix does not belong in the `hostname` field (it belongs in the separate `protocol` field or within a `connectionString`). Changed the value to `rabbitmq:5672`.

## Review Notes
- The `secretKeyRef` structure (`name` and `key` fields) is correct per official docs.
- The `auth.secretStore` placement at the `spec` level (sibling to `metadata`) is correct.
- The Redis state store type (`state.redis`) and metadata fields (`redisHost`, `redisPassword`) are correct.
- The RabbitMQ pub/sub type (`pubsub.rabbitmq`) is correct.
- The Vault KV put command syntax is correct.
- The claim that Dapr "fetches credentials at startup" is a reasonable characterization of Dapr's component initialization behavior, though the docs describe it as resolution during component loading rather than using the exact phrase "at startup."
- The summary's claim about "supporting rotation without component YAML changes" is accurate — since secrets are fetched from the store, updating the secret value in the store is sufficient (though the component may need to be reloaded to pick up new values depending on the component type).
