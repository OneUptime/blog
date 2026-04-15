# Validation Summary: How to Use Dapr with Confluent Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka (Confluent distribution)
- Confluent Schema Registry
- Go (Dapr Go SDK)
- Kubernetes
- YAML component configuration

## Sources Consulted
- [Dapr Kafka Pub/Sub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/) — verified all component metadata field names and valid values
- [Dapr Dead Letter Topics](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/) — verified dead letter topic configuration level and syntax
- [Dapr Go SDK Client Documentation](https://docs.dapr.io/developing-applications/sdks/go/go-client/) — verified PublishEvent method signature and data parameter type
- [Dapr Pub/Sub API Reference](https://docs.dapr.io/reference/api/pubsub_api/) — verified HTTP publish endpoint format

## Issues Found

1. **`authType` value incorrect**: The post used `authType: "sasl"`, but `"sasl"` is not a valid value. Per the official Dapr Kafka component docs, the valid values are `none`, `password`, `mtls`, `oidc`, `oidc_private_key_jwt`, and `awsiam`. Changed to `"password"`.

2. **`saslMechanism` value incorrect**: The post used `saslMechanism: "PLAIN"`, but the Dapr Kafka component accepts `"PLAINTEXT"`, `"SHA-256"`, or `"SHA-512"`. Changed to `"PLAINTEXT"`.

3. **`PublishEvent` data parameter type**: The post passed a `map[string]interface{}` directly to `client.PublishEvent()`. While the method signature accepts `interface{}`, the official Dapr Go SDK documentation shows `[]byte` as the expected data type. Changed the code to JSON-marshal the map to `[]byte` before passing it to `PublishEvent`.

4. **Dead letter topic configured at wrong level**: The post showed `deadLetterTopic` as a component-level metadata field. Per the Dapr docs, dead letter topics are configured at the subscription level, not the component level. Replaced the component metadata snippet with a full declarative subscription YAML (`dapr.io/v2alpha1 Subscription` kind). Also added a note about pairing with a retry resiliency policy, per the official recommendation.

## Review Notes
- The subscription Go code section is missing import statements for the `daprd`, `common`, and `log` packages. This is a minor omission typical for blog post snippets and was left as-is since the pattern is clear to Go developers.
- The Schema Registry section correctly shows `schemaRegistryURL`, `schemaRegistryAPIKey`, and `schemaRegistryAPISecret` as component metadata fields, all verified against official docs.
- The Dapr HTTP publish endpoint format (`/v1.0/publish/{pubsubname}/{topic}`) is correct.
- The kubectl command for creating the Kubernetes secret is correct.
