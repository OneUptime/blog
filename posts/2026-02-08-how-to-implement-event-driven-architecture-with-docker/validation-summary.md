# Validation Summary: How to Implement Event-Driven Architecture with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Compose
- RabbitMQ
- RabbitMQ Management UI
- RabbitMQ dead letter exchanges
- Apache Kafka
- Confluent Platform Kafka Docker image
- Node.js
- Express
- amqplib
- AMQP 0-9-1

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service dependency documentation: https://docs.docker.com/reference/compose-file/services/
- Docker Compose scale CLI documentation: https://docs.docker.com/reference/cli/docker/compose/scale/
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/3.13/dlx
- RabbitMQ Time-To-Live documentation: https://www.rabbitmq.com/docs/ttl
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Confluent Platform Docker image configuration reference for Kafka KRaft mode: https://docs.confluent.io/platform/7.6/installation/docker/config-reference.html
- Apache Kafka KRaft documentation: https://kafka.apache.org/36/operations/kraft/

## Issues Found
- The Docker Compose examples used the top-level `version: "3.8"` field. Docker's current Compose Specification keeps this field only for backward compatibility and marks it obsolete, so I removed it from the Compose snippets.
- The Kafka KRaft Docker Compose example was missing `KAFKA_INTER_BROKER_LISTENER_NAME`. Confluent's KRaft Docker example includes this setting to identify the inter-broker listener, so I added `KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT`.
- The RabbitMQ dead letter queue example bound a direct dead letter exchange with an empty routing key but did not set `x-dead-letter-routing-key`. RabbitMQ reuses the original routing key when no dead letter routing key is set, so rejected `order.placed` or `user.created` messages would not match the empty direct binding. I changed the binding to `dead-letter` and added `"x-dead-letter-routing-key": "dead-letter"` to the queue arguments.

## Review Notes
The RabbitMQ, Express, amqplib, Docker Compose dependency, healthcheck, and scaling examples are technically sound for a local tutorial. The RabbitMQ image tag and Confluent Kafka image tag are version-specific examples; future maintenance should update them periodically. The sample producer uses a normal amqplib channel, so publish success is not confirmed by RabbitMQ; a production implementation would typically use publisher confirms and stronger retry/error handling.
