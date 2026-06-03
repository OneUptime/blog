# Validation Summary: How to Configure RabbitMQ Federation for Multi-Cluster Message Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ Federation
- RabbitMQ Cluster Kubernetes Operator
- Kubernetes
- RabbitMQ management HTTP API
- rabbitmqctl and rabbitmq-diagnostics
- Prometheus alerting
- Python pika and requests

## Sources Consulted
- RabbitMQ Federation Plugin documentation: https://www.rabbitmq.com/docs/3.13/federation
- RabbitMQ Federation Reference: https://www.rabbitmq.com/docs/next/federation-reference
- RabbitMQ Federated Exchanges documentation: https://www.rabbitmq.com/docs/3.13/federated-exchanges
- RabbitMQ Federated Queues documentation: https://www.rabbitmq.com/docs/3.13/federated-queues
- RabbitMQ Cluster Kubernetes Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator troubleshooting and status conditions: https://www.rabbitmq.com/kubernetes/operator/troubleshooting-operator
- RabbitMQ Prometheus documentation: https://www.rabbitmq.com/docs/3.13/prometheus
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-prometheus/blob/master/metrics.md

## Issues Found
- The Kubernetes custom resource kind was written as `RabbitMQCluster`, but the RabbitMQ Cluster Operator uses `RabbitmqCluster`. Updated both manifests.
- The readiness wait command used a generic `ready` condition. RabbitMQ Cluster Operator documents `AllReplicasReady` as the condition for all RabbitMQ pods being ready, so the commands now wait for `condition=AllReplicasReady`.
- The exchange federation explanation implied that every message published upstream is always forwarded downstream. RabbitMQ federated exchanges retrieve messages according to downstream bindings, so the text now says messages can be forwarded to queues bound to the federated exchange.
- The filtering section incorrectly described header-based filtering and mixed exchange-only and queue-only upstream settings. Updated it to describe upstream exchange selection and binding/routing-key-based filtering.
- The monitoring example used undocumented RabbitMQ Prometheus metric names. Updated the wording to make clear that federation link status should be exported from `/api/federation-links`, and marked the Prometheus metric as an example emitted by such an exporter.
- The federation status command used an Erlang eval expression. Replaced it with the documented `rabbitmqctl federation_status` command.
- The troubleshooting connection test used an internal Erlang function. Replaced it with the documented `rabbitmq-diagnostics list_parameters --formatter=pretty_table` inspection command.

## Review Notes
The post remains version-specific around RabbitMQ 3.12 container images while some consulted documentation is for RabbitMQ 3.13/next. The federation concepts, policies, upstream parameters, and Kubernetes Operator fields reviewed here are consistent with the documented behavior, but future maintenance should consider updating the image tag to a supported RabbitMQ release line.
