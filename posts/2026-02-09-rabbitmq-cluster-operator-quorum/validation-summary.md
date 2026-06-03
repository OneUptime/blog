# Validation Summary: How to Deploy RabbitMQ Cluster Operator with Quorum Queues on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ quorum queues
- RabbitMQ management API and definitions import
- Prometheus Operator ServiceMonitor and PrometheusRule
- Python Pika client
- Go amqp091-go client
- Helm and kubectl

## Sources Consulted
- RabbitMQ Cluster Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-operator
- RabbitMQ Cluster Operator usage and RabbitmqCluster spec documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator monitoring documentation: https://www.rabbitmq.com/kubernetes/operator/operator-monitoring
- RabbitMQ quorum status monitoring documentation: https://www.rabbitmq.com/kubernetes/operator/quorum-status
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ definitions import documentation: https://www.rabbitmq.com/docs/definitions
- RabbitMQ Prometheus metrics documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ virtual host default queue type documentation: https://www.rabbitmq.com/docs/vhosts
- amqp091-go package documentation: https://pkg.go.dev/github.com/rabbitmq/amqp091-go
- Pika blocking channel documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html

## Issues Found
- Corrected the custom resource kind from `RabbitMQCluster` to `RabbitmqCluster`, matching the RabbitMQ Cluster Operator CRD kind.
- Updated the RabbitMQ image examples from the outdated `rabbitmq:3.12-management` tag to `rabbitmq:4.3-management`.
- Replaced the outdated `management.load_definitions` setting with current definitions import configuration using `definitions.import_backend` and `definitions.local.path`.
- Rewrote overbroad quorum queue claims about network partitions, delivery semantics, and performance to match RabbitMQ's documented safety guarantees for confirmed messages and majority availability.
- Fixed the Go publisher-confirm example so it registers `NotifyPublish` and waits for a broker confirmation instead of only enabling confirm mode.
- Replaced the invalid `quorum_queue.delivery_limit` configuration key with supported settings and moved delivery-limit configuration into the quorum queue policy.
- Replaced the standalone `kbudde/rabbitmq-exporter` deployment with a ServiceMonitor for RabbitMQ's built-in `rabbitmq_prometheus` plugin, which the Cluster Operator enables by default.
- Updated Prometheus alert expressions to use documented RabbitMQ built-in detailed metrics instead of exporter-specific or non-existent metric names.
- Clarified delivery-limit and negative-acknowledgement comments so they do not imply messages are dead-lettered without a configured DLX.

## Review Notes
The examples remain illustrative and still assume a working Prometheus Operator, a compatible StorageClass, and credentials appropriate for the deployed RabbitMQ cluster. The anti-affinity example requires enough zones to satisfy the required scheduling rule.
