# Validation Summary: How to Configure RocketMQ for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache RocketMQ 5.1.0
- Dapr pub/sub component (pubsub.rocketmq)
- Docker Compose
- Dapr Java SDK (DaprClient, DaprClientBuilder)
- Spring Boot with Dapr annotations (@Topic)
- CloudEvents

## Sources Consulted
- Dapr RocketMQ pub/sub component source code: https://github.com/dapr/components-contrib/blob/master/pubsub/rocketmq/metadata.go — verified all metadata field names against the Go struct and mapstructure tags
- Dapr official documentation for RocketMQ pub/sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rocketmq/ — verified metadata field names, types, defaults, and descriptions
- Dapr supported pub/sub components list: https://docs.dapr.io/reference/components-reference/supported-pubsub/ — confirmed RocketMQ is an Alpha-status v1 component since Dapr 1.8

## Issues Found

1. **`accessProto` metadata field does not exist** (line 88 in original). The blog included `accessProto` with value `"tcp"` in the Dapr component configuration. This field is not present in the Dapr RocketMQ component metadata struct (source code) nor in the official documentation. Removed the field from the component YAML.

2. **`consumeConcurrently` metadata field does not exist** (line 165 in original). The "Ordered Consumption" section included a `consumeConcurrently` field set to `"false"`. This field does not exist in the Dapr RocketMQ component. The related field is `consumeConcurrentlyMaxSpan` (an integer controlling max span), which is different in purpose. Setting `consumeOrderly` to `"true"` is sufficient to enable ordered consumption. Removed the invalid field.

## Review Notes
- The `groupName` metadata field is marked as deprecated in the official Dapr docs. The recommended alternatives are `consumerGroup` and `producerGroup` for more explicit control. The field still works but may be removed in a future Dapr version.
- The RocketMQ component has Alpha certification status in Dapr, meaning its API surface may change in future releases.
- The Docker Compose setup, mqadmin commands, Java publisher code, and Spring Boot subscriber code are all correct.
- The `autoCommit` field is confirmed valid in both the source code struct and official documentation (defaults to `true`).
