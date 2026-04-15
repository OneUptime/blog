# Validation Summary: How to Define a Dapr Component YAML File

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- YAML component configuration
- Dapr state stores (Redis, PostgreSQL, Azure CosmosDB)
- Dapr pub/sub (Kafka, Azure Service Bus)
- Dapr bindings (Cron, AWS S3)
- Dapr secret stores (HashiCorp Vault)
- Kubernetes secrets integration

## Sources Consulted
- Dapr Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Azure CosmosDB State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Kafka Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Azure Service Bus Topics: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Cron Binding: https://docs.dapr.io/reference/components-reference/supported-bindings/cron/
- Dapr AWS S3 Binding: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr HashiCorp Vault Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/

## Issues Found

1. **Fabricated annotation `dapr.io/component-requires-restart`**: This annotation does not exist in Dapr's documented annotations. Replaced with a generic annotation example (`example.com/team: "platform"`) to illustrate the annotations field without implying a non-existent Dapr-specific annotation.

2. **PostgreSQL v2 state store: `tableName` field does not exist**: The correct metadata field is `tablePrefix`, which sets the prefix for the state table name. Changed `tableName` to `tablePrefix`.

3. **Kafka pub/sub: `authType: "certificate"` is not a valid value**: The valid auth type values for the Kafka component are `none`, `password`, `mtls`, `oidc`, `oidc_private_key_jwt`, and `awsiam`. For certificate-based mutual TLS authentication, the correct value is `"mtls"`. Changed `certificate` to `mtls`.

4. **Azure Service Bus: `prefetchCount` is not a documented metadata field**: This field does not exist in the Azure Service Bus Topics component specification. Replaced with `maxActiveMessages`, which is a valid documented field that controls the maximum number of messages the subscriber can receive simultaneously.

5. **AWS S3 binding: `direction` is not a valid metadata field**: Unlike the cron binding, the AWS S3 binding does not have a `direction` metadata field. The S3 binding is output-only by design. Removed the `direction` field from the S3 example.

## Review Notes
- The `envRef` feature for reading metadata values from environment variables is a valid but relatively newer Dapr feature. It may not be fully documented on the main Dapr docs site yet, but it has been merged into the codebase.
- The `vaultKVPrefix` field in the HashiCorp Vault example uses `secret` as the value, while the default is `dapr`. This is fine as a custom configuration example.
- The post correctly notes that PostgreSQL state store uses version `v2` (which has a different schema from v1). This is accurate and important guidance.
