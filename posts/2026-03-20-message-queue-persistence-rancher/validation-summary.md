# Validation Summary: How to Configure Message Queue Persistence in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RabbitMQ
- Kafka
- Kubernetes
- Bitnami Helm charts
- Python (`pika`)

## Sources Consulted
- RabbitMQ Queues: https://www.rabbitmq.com/docs/4.0/queues
- RabbitMQ Consumer Acknowledgements and Publisher Confirms: https://www.rabbitmq.com/docs/4.0/confirms
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- Pika BlockingConnection delivery confirmations example: https://pika.readthedocs.io/en/1.3.2/examples/blocking_delivery_confirmations.html
- Bitnami RabbitMQ chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/rabbitmq/values.yaml
- Bitnami Kafka chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/kafka/values.yaml
- Bitnami Kafka controller configuration template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/kafka/templates/controller-eligible/configmap.yaml
- Apache Kafka Topic Configs: https://kafka.apache.org/42/configuration/topic-configs/
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The RabbitMQ chart snippet used outdated or incorrect Bitnami values (`accessMode` and a manual `RABBITMQ_MNESIA_DIR` override). I changed it to the current chart structure with `persistence.accessModes` and the chart's actual mnesia mount path.
- The RabbitMQ durability section implied that durable queues plus persistent messages were sufficient on their own. I added publisher confirms to the example because RabbitMQ documents confirms as necessary for stronger publisher-side durability guarantees.
- The Kafka chart snippet used a top-level `persistence` block and `config`, which does not match the current Bitnami Kafka chart and can override generated broker configuration. I changed it to `controller.persistence`, `broker.persistence`, and `overrideConfiguration`.
- The Kafka replication guidance said to always use replication factor 3. I narrowed that to clusters with at least three brokers and noted the need for producer `acks=all` alongside `min.insync.replicas=2`.
- The conclusion claimed `PVCs with Retain policy` and guaranteed zero message loss. I corrected this to describe persistence and retention more accurately and removed the absolute zero-loss claim.

## Review Notes
- The Helm values shown in the post are chart-specific. The corrected examples align with the current Bitnami RabbitMQ and Kafka charts commonly deployed through Rancher.
- RabbitMQ durable queues and persistent messages improve restart survivability, but publisher confirms are still required for stronger end-to-end guarantees.
- Kafka durability also depends on producer behavior. A replicated topic with `min.insync.replicas=2` only enforces quorum writes when producers send with `acks=all`.
