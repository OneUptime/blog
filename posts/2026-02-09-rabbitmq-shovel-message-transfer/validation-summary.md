# Validation Summary: How to Implement RabbitMQ Shovel Plugin for Message Transfer Between Clusters

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- RabbitMQ Shovel plugin
- RabbitMQ Cluster Kubernetes Operator
- Kubernetes
- RabbitMQ Management HTTP API
- rabbitmqctl
- Python requests
- Pika
- Prometheus monitoring considerations

## Sources Consulted
- RabbitMQ Shovel Plugin documentation: https://www.rabbitmq.com/docs/4.2/shovel
- RabbitMQ Dynamic Shovels documentation: https://www.rabbitmq.com/docs/4.2/shovel-dynamic
- RabbitMQ Static Shovels documentation: https://www.rabbitmq.com/docs/4.2/shovel-static
- RabbitMQ 3.13 Shovel documentation, for compatibility with RabbitMQ 3.12-era syntax: https://www.rabbitmq.com/docs/3.13/shovel
- RabbitMQ Cluster Kubernetes Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Prometheus documentation: https://www.rabbitmq.com/docs/4.2/prometheus
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/4.1/http-api-reference

## Issues Found
- The Kubernetes custom resource kind was written as `RabbitMQCluster`. The RabbitMQ Cluster Operator examples use `RabbitmqCluster`, so the manifests were corrected.
- The static shovel example used outdated/incorrect keys such as `sources`, `destinations`, and `brokers`. It was updated to the documented `source`, `destination`, `protocol`, `uris`, and `publish_fields` structure.
- The post claimed Shovel can bridge STOMP. Current RabbitMQ Shovel documentation covers AMQP 0.9.1 and AMQP 1.0 endpoints, so the protocol list was corrected.
- The post described generic message transformation. RabbitMQ Shovel can add shovel metadata headers and override publish properties, but it is not a general message body transformer, so the wording was narrowed.
- The dynamic shovel transform example used `add-forward-headers`; the documented dynamic parameter is `dest-add-forward-headers`, so the option and explanation were corrected.
- The exchange-to-exchange description implied direct consumption from an exchange and routing-key transformation. Dynamic shovels bind an exclusive queue to the source exchange and publish with a fixed destination routing key, so the explanation was corrected.
- The selective routing section implied Shovel can filter by headers. Shovel does not perform header-based filtering by itself, so the text now directs readers to route selected messages into a dedicated queue or use a custom consumer.
- The specific Shovel status endpoint was wrong. It was corrected from `/api/shovels/%2F/{name}` to `/api/shovels/vhost/%2F/{name}`.
- The Prometheus alert example used undocumented `rabbitmq_shovels_up` and `rabbitmq_shovel_errors_total` metrics. It was replaced with a note that RabbitMQ's built-in Prometheus plugin does not expose those per-shovel metrics and that a custom check/exporter is needed.
- The `src-delete-after: queue-length` explanation said the shovel deletes itself when the queue is empty. RabbitMQ measures the queue length at shovel startup and deletes the shovel after transferring that many messages, so the explanation was corrected.
- The AMQP 1.0 bridging example used an Azure Service Bus URI without the required AMQP 1.0 address form. It was changed to a generic AMQP 1.0 destination with a `/queues/...` address.
- The troubleshooting command used an internal Erlang eval call. It was replaced with the documented `rabbitmqctl shovel_status --formatter=json`.

## Review Notes
The examples still assume credentials inserted into AMQP URIs do not contain characters that require URL encoding. In production documentation, it would be useful to call that out explicitly, but the core RabbitMQ Shovel configuration and command examples are now aligned with official documentation.
