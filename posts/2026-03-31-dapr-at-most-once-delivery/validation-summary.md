# Validation Summary: How to Implement At-Most-Once Delivery in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Resiliency resources, Pub/Sub components)
- Apache Kafka (Dapr pubsub.kafka component)
- RabbitMQ (Dapr pubsub.rabbitmq component)
- Node.js / Express.js (handler and publisher examples)
- Dapr JavaScript SDK

## Sources Consulted
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Apache Kafka pubsub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr RabbitMQ pubsub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr JavaScript Client SDK: https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found

1. **Kafka component used non-existent metadata fields `ackWaitTime` and `maxRetryTime`.**
   The Dapr Kafka pubsub component does not have `ackWaitTime` or `maxRetryTime` metadata fields. To disable consumer-side retries for at-most-once semantics, the correct field is `consumeRetryEnabled` set to `"false"`. Replaced both invalid fields with `consumeRetryEnabled: "false"`.

2. **RabbitMQ component used deprecated `host` metadata field.**
   The `host` field is a deprecated alias for `connectionString` in the Dapr RabbitMQ pubsub component. Replaced `host` with `connectionString` to use the current, non-deprecated field name.

3. **Express.js handler example missing `app` initialization.**
   The code declared `const express = require("express")` and immediately used `app.use(...)` without first creating the app with `const app = express()`. Added the missing initialization line.

## Review Notes
- The `duration: 0s` in the retry policy is harmless but unnecessary when `maxRetries: 0` since no retries will occur. Not changed as it is not incorrect.
- The use of billing events as an example of at-most-once delivery is debatable. In practice, billing systems typically use at-least-once with idempotency keys to avoid both double-charging and lost charges. However, the post's framing (duplicates are worse than loss) is a valid theoretical perspective, so it was left as-is.
- The Resiliency resource structure, `maxRetries: 0` semantics, `inbound` target, RabbitMQ `autoAck` behavior, JS SDK publish call, and the comparison table are all accurate.
