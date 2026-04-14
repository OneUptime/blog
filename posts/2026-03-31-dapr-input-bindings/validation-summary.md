# Validation Summary: How to Use Dapr Input Bindings to Trigger Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (input bindings building block)
- Apache Kafka (binding source)
- AWS SQS (binding source)
- Azure Queue Storage (binding source)
- RabbitMQ (binding source)
- Python / Flask
- Node.js / Express
- Go (net/http)

## Sources Consulted
- Dapr Input Bindings How-To: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr Kafka Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr AWS SQS Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/sqs/
- Dapr Azure Storage Queues Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/storagequeues/
- Dapr RabbitMQ Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/rabbitmq/
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **Deprecated `authRequired` field in Kafka binding YAML**: The blog used `authRequired: "false"` which is deprecated. Changed to `authType: "none"` per current Dapr Kafka binding documentation.

2. **Incorrect event format (CloudEvents envelope)**: The blog claimed Dapr input bindings deliver events in a CloudEvents-like JSON envelope with fields like `specversion`, `source`, `type`, `datacontenttype`, `id`, and `time`. This is incorrect — CloudEvents format applies to Dapr pub/sub, not input bindings. Dapr input bindings POST the raw event data directly as the request body, with binding-specific metadata passed via HTTP headers. Rewrote the "Input Binding Event Format" section and updated all handler examples (Python, Node.js, Go) to read the data directly from the request body instead of extracting from a non-existent envelope.

3. **Wrong Azure Queue Storage metadata field names**: The blog used `storageAccount`, `storageAccessKey`, and `queue`. The correct field names per official docs are `accountName`, `accountKey`, and `queueName`. Fixed all three.

## Review Notes
- The `direction` metadata field included in all binding YAMLs is optional (Dapr can infer direction from usage), but including it is not harmful and adds clarity. No change made.
- The post does not mention the OPTIONS endpoint that Dapr calls on startup to verify the app can handle the binding. This is a minor omission but not technically incorrect.
- AWS SQS, RabbitMQ, and the Dapr CLI command configurations were all verified correct.
- The response format for forwarding to output bindings (`data` and `to` fields) is correct per the Bindings API reference.
