# Validation Summary: How to Configure Dead Letter Queue Patterns with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes CronJob and Job
- Apache Kafka
- Strimzi KafkaTopic
- Kafka Connect DLQ behavior
- RabbitMQ dead letter exchanges
- RabbitMQ quorum queues
- RabbitMQ Messaging Topology Operator
- RabbitMQ HTTP API

## Sources Consulted
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/next/dlx
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/4.1/quorum-queues
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Exchanges documentation: https://www.rabbitmq.com/docs/next/exchanges
- RabbitMQ Messaging Topology Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- RabbitMQ Messaging Topology Operator CRDs: https://github.com/rabbitmq/messaging-topology-operator/tree/main/config/crd/bases
- Strimzi KafkaTopic documentation: https://strimzi.io/docs/operators/0.42.0/full/deploying
- Apache Kafka Connect configuration documentation: https://kafka.apache.org/26/configuration/kafka-connect-configs/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post said Kafka does not have native DLQ support. Kafka Connect has DLQ configuration, while ordinary Kafka consumers do not automatically dead-letter failed records. Updated the wording to make that distinction.
- The Kafka alerting example referred to unread messages in a topic. Kafka topics are usually monitored through records and consumer lag, so the wording was changed to records or consumer lag.
- The RabbitMQ DLX binding used `routingKey: "#"` with a direct exchange. RabbitMQ direct exchanges use exact routing-key matching; `#` is a topic-exchange wildcard. Updated the binding to `orders.failed`, matching the queue's `x-dead-letter-routing-key`.
- The RabbitMQ quorum queue used `delivery-limit` as a queue argument. The Messaging Topology Operator CRD and RabbitMQ queue argument examples use `x-delivery-limit`; updated the manifest and best-practice bullet accordingly.
- The requeue job published to `orders.topic`, but the topology snippet did not define that exchange or bind the main queue to it. Added the main exchange and binding so the requeue route is declared in the GitOps-managed topology.
- The RabbitMQ HTTP API publish example used `POST`, but the official HTTP API defines `PUT /api/exchanges/{vhost}/{name}/publish`. Updated the requeue job to use `-XPUT`.
- The requeue job used automatic payload encoding and republished as a string, which can break for non-UTF-8 payloads. Updated the get and publish calls to use base64 payload encoding.
- The monitor job could fail the numeric comparison if the queue-count extraction returned an empty string. Added a default of `0`.

## Review Notes
- The remaining shell examples are suitable as simple operational examples, but RabbitMQ's HTTP API documentation cautions that the get and publish endpoints are inefficient and intended for development, troubleshooting, or low-volume tooling. A production-grade requeue tool should use an AMQP client or a purpose-built operational workflow.
