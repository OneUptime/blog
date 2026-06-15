# Validation Summary: How to Implement Event-Driven Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Event-driven architecture
- TypeScript
- Jest
- AJV and ajv-formats
- Kafka and KafkaJS
- Confluent Kafka Docker images
- GitHub Actions
- Saga pattern testing

## Sources Consulted
- KafkaJS consuming messages documentation: https://kafka.js.org/docs/consuming
- KafkaJS producing messages documentation: https://kafka.js.org/docs/producing
- Jest CLI options documentation: https://jestjs.io/docs/cli
- Jest expect documentation: https://jestjs.io/docs/expect
- Jest timer mocks documentation: https://jestjs.io/docs/timer-mocks
- AJV ajv-formats documentation: https://ajv.js.org/packages/ajv-formats.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- GitHub Actions service container networking documentation: https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers

## Issues Found
- The post stated that order is not guaranteed without qualification. Updated this to "Global order is not guaranteed" and adjusted the E2E example because Kafka preserves order within a partition but not globally across multiple topics.
- The E2E ordering test asserted one exact sequence across multiple Kafka topics. Changed it to assert that expected milestone events are observed, avoiding an incorrect cross-topic ordering guarantee.
- The E2E ordering test published an `order.created` event with an empty `items` array, which conflicted with the producer validation example. Changed it to publish a valid order payload with one item.
- The consumer test used `resolves.not.toThrow()` on a promise result. Changed it to `resolves.toBeUndefined()`, which matches Jest's documented promise matcher behavior for an async function that resolves without a value.
- The GitHub Actions command used the deprecated Jest `--testPathPattern` CLI flag. Updated it to the current `--testPathPatterns` flag.
- The single-node Confluent Kafka service omitted `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1`, which Confluent documents as required for single-node clusters. Added the setting.

## Review Notes
- The code examples are illustrative and depend on application-specific `OrderService`, `InventoryConsumer`, `InventoryService`, `OrderSaga`, and `EventBus` implementations that are not included in the post.
- The KafkaJS producer and consumer API usage matches current KafkaJS documentation.
- AJV format validation is correctly paired with `ajv-formats` for UUID, date, and date-time formats.
