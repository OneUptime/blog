# Validation Summary: How to Configure Pub/Sub Component Metadata in Dapr

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Apache Kafka (pub/sub component)
- RabbitMQ (pub/sub component)
- Redis Streams (pub/sub component)
- Kubernetes Secrets
- HashiCorp Vault (secret store reference)

## Sources Consulted
- [Dapr Kafka Pub/Sub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- [Dapr RabbitMQ Pub/Sub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/)
- [Dapr Redis Pub/Sub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- [Dapr RabbitMQ metadata.go source code](https://github.com/dapr/components-contrib/blob/main/pubsub/rabbitmq/metadata.go)
- [Dapr Kafka metadata.yaml source code](https://github.com/dapr/components-contrib/blob/main/pubsub/kafka/metadata.yaml)

## Issues Found

1. **Kafka `authRequired` is deprecated**: The post used `authRequired: "true"`, which has been deprecated since Dapr v1.6. Changed to `authType: "password"`, which is the current recommended field for SASL authentication.

2. **Kafka `saslMechanism` invalid value**: The post used `SCRAM-SHA-256` as the value for `saslMechanism`. Dapr's valid values are `PLAINTEXT`, `SHA-256`, and `SHA-512`. Changed to `SHA-256`.

3. **RabbitMQ `host` field is deprecated**: The post used `host` as the metadata field name for the RabbitMQ connection string. This has been deprecated in favor of `connectionString` (or the individual `protocol`, `hostname`, `username`, `password` fields). Changed to `connectionString`.

4. **RabbitMQ `concurrency` wrong field name**: The post used `concurrency` as the metadata field name. The correct field name per the Dapr documentation is `concurrencyMode`. Changed to `concurrencyMode`.

## Review Notes
- The RabbitMQ `exchangeKind` comment lists `direct, fanout, topic, or headers` as valid values. The official documentation only lists `fanout` and `topic`, but the Dapr source code validates all four AMQP exchange types. The comment is technically accurate at the code level, though users should be aware that `direct` and `headers` are not documented.
- The `deletedWhenUnused` field name was confirmed correct against both the Dapr documentation and source code (the Go struct maps it via `mapstructure:"deletedWhenUnused"`).
- The Redis Streams metadata fields (`redisHost`, `consumerID`, `processingTimeout`, `redeliverInterval`, `maxLenApprox`, `enableTLS`) were all verified as correct.
- The Dapr metadata API endpoint (`/v1.0/metadata`), `secretKeyRef` syntax, and `auth.secretStore` syntax are all correct.
- The `kubectl create secret` command syntax is correct.
