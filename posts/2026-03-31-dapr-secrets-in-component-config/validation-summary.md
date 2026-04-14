# Validation Summary: How to Reference Dapr Secrets in Component Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secret Stores (Kubernetes Secrets, Azure Key Vault, HashiCorp Vault, Local File)
- Dapr Component Configuration (YAML)
- Kubernetes Secrets
- Redis State Store (`state.redis`)
- PostgreSQL State Store (`state.postgresql`)
- Azure Service Bus Pub/Sub (`pubsub.azure.servicebus.queues`)
- Apache Kafka Pub/Sub (`pubsub.kafka`)

## Sources Consulted
- Dapr official docs — Component Secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr official docs — Component Schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr official docs — Supported Secret Stores: https://docs.dapr.io/reference/components-reference/supported-secret-stores/
- Dapr official docs — Local File Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr official docs — PostgreSQL State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr official docs — Azure Service Bus Queues Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-queues/
- Dapr official docs — Apache Kafka Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/

## Issues Found
1. **Incorrect self-hosted default secret store claim**: The post stated that in self-hosted (local) mode, Dapr defaults to using the `local.file` secret store. This is not supported by official documentation. In Kubernetes, the `kubernetes` secret store is automatically assumed when `auth.secretStore` is empty — this is documented. However, in self-hosted mode, no default secret store is assumed automatically. Users must explicitly configure a secret store component and reference it via `auth.secretStore`. The text was corrected to reflect this, while noting that `dapr init` does create a default local file secret store component in `~/.dapr/components/`.

## Review Notes
- The `secretKeyRef` syntax with `name` and `key` subfields is correct per official docs.
- The `auth.secretStore` field placement as a top-level field (sibling to `spec`) is correct. The official schema reference uses lowercase `secretstore` while the how-to docs use camelCase `secretStore` — both are accepted by Dapr. The blog uses `secretStore` which matches the how-to documentation style.
- All component types used in examples (`state.redis`, `state.postgresql`, `pubsub.azure.servicebus.queues`, `pubsub.kafka`, `secretstores.local.file`) are correct.
- The `kubectl create secret generic` command syntax is correct.
- The local file secret store metadata fields (`secretsFile`, `nestedSeparator`) are correct per official docs.
- The bootstrap/circular dependency warning about secret stores is a reasonable and accurate caution, even if the exact component initialization order isn't explicitly documented on the main docs pages.
- The mermaid sequence diagram references "redis-password" as the secret name while Example 1 uses "redis-secret" — this is a minor illustrative inconsistency but acceptable since the diagram is generic.
