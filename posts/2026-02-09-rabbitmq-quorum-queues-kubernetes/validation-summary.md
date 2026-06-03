# Validation Summary: How to Deploy RabbitMQ Quorum Queues on Kubernetes for Message Durability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ quorum queues
- RabbitMQ Management HTTP API
- RabbitMQ dead letter exchanges
- Prometheus / ServiceMonitor
- Kubernetes HorizontalPodAutoscaler
- Python Pika client

## Sources Consulted
- RabbitMQ Cluster Kubernetes Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Prometheus and Grafana documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Virtual Hosts / Default Queue Type documentation: https://www.rabbitmq.com/docs/vhosts
- Pika BlockingConnection and publisher confirmation documentation: https://pika.readthedocs.io/en/stable/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The credential examples retrieved the Operator-generated user and password but later used hard-coded `admin:password`. Updated the commands to export `RABBITMQ_USER` and `RABBITMQ_PASSWORD`, and updated all `curl` examples to use those variables.
- The port-forward command only exposed the management UI port, while the Python examples connect to AMQP on `localhost:5672`. Updated the command to forward both `15672` and `5672`.
- The policy example attempted to set `"queue-type": "quorum"` through a RabbitMQ policy. RabbitMQ queue type is immutable and must be supplied at declaration time or via the default queue type, not through a policy. Removed the invalid policy key and changed `apply-to` to `quorum_queues`.
- The policy JSON used `^quorum\.` inside a JSON string, which is invalid JSON escaping and did not match the tutorial queue name. Updated it to `^events\\.`.
- The producer redeclared `events.quorum` with fewer queue arguments than the earlier HTTP API declaration. Added the same delivery limit and length arguments to avoid queue property equivalence failures.
- The Pika examples used hard-coded credentials and host values. Updated them to read `RABBITMQ_USER`, `RABBITMQ_PASSWORD`, and `RABBITMQ_HOST` from the environment, matching the Kubernetes deployment example and local port-forward flow.
- The dead letter section attempted to update an existing queue by redeclaring it with different arguments, which can fail with a precondition error. Replaced that with a policy update using RabbitMQ's documented DLX policy keys.
- The statement "After five delivery attempts" was too precise for RabbitMQ's delivery-limit semantics. Reworded it to "After the delivery limit is exceeded."
- The Prometheus metric names used legacy or nonexistent names such as `rabbitmq_quorum_queue_members`. Updated the monitoring list and HPA example to use documented `rabbitmq_detailed_*` metric names.

## Review Notes
- The HPA example still assumes an external metrics adapter exposes the RabbitMQ Prometheus metric under the same name and labels. That is deployment-specific and should be documented in a future expansion if the post is extended.
- The ServiceMonitor example requires the Prometheus Operator CRDs to be installed and selected by the Prometheus instance.
