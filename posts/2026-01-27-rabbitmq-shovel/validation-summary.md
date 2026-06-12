# Validation Summary: How to Build RabbitMQ Shovel for Message Transfer

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- RabbitMQ Shovel plugin
- RabbitMQ Federation plugin
- RabbitMQ Management HTTP API
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-plugins`, `rabbitmq-diagnostics`, `rabbitmqadmin`)
- RabbitMQ static and dynamic Shovel configuration
- RabbitMQ Cluster Kubernetes Operator
- Prometheus monitoring
- TypeScript / Node.js
- Python
- TLS for RabbitMQ connections

## Sources Consulted
- RabbitMQ Shovel plugin overview: https://www.rabbitmq.com/docs/shovel
- RabbitMQ dynamic Shovel configuration: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ static Shovel configuration: https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ Federation plugin documentation: https://www.rabbitmq.com/docs/federation
- RabbitMQ Prometheus and Grafana monitoring documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ monitoring guide: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ Cluster Kubernetes Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ rabbitmqadmin v2 documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ AMQP 1.0 documentation: https://www.rabbitmq.com/docs/amqp
- RabbitMQ TLS documentation: https://www.rabbitmq.com/docs/ssl

## Issues Found
- Static Shovel examples incorrectly said static shovels could be configured in `rabbitmq.conf`. Current RabbitMQ documentation requires static shovel definitions in `advanced.config`, so the section was corrected to show only a valid plugin-wide `rabbitmq.conf` setting.
- Static Shovel examples omitted explicit `{protocol, amqp091}` entries. Added them to source and destination blocks to match the current static Shovel configuration reference.
- Several static Shovel examples used `publish_properties` for `exchange` and `routing_key`. RabbitMQ static shovels use `publish_fields` for those values, while `publish_properties` is for message properties such as `delivery_mode`. Split or renamed those blocks accordingly.
- Static `reconnect_delay` values were described and configured as milliseconds (`5000`, `10000`). RabbitMQ documents this value in seconds, so the examples now use `5` and `10`.
- Dynamic Shovel examples used `prefetch-count`, but the current AMQP 0-9-1 dynamic Shovel key is `src-prefetch-count`. Updated CLI, HTTP API, TypeScript, and troubleshooting examples.
- Dynamic Shovel examples omitted `src-protocol` and `dest-protocol`. Added `amqp091` to match the official JSON examples and make the protocol explicit.
- The specific Shovel status HTTP API path was wrong. Updated it to `GET /api/shovels/vhost/{vhost}/{name}` and fixed the TypeScript client to use that path.
- The TypeScript `resilient-shovel.ts` snippet imported classes that were not exported from `shovel-manager.ts`, and used `NodeJS.Timer`. Exported the interface/class and changed the timer type to `NodeJS.Timeout`.
- The Prometheus section listed dedicated `rabbitmq_shovel_*` metrics that are not documented as built-in RabbitMQ Prometheus plugin metrics. Rewrote the section to use RabbitMQ Prometheus for broker/queue/connection signals and `shovel_status` or the management API for Shovel-specific state, with custom exporter metric names in the alert example.
- The post overstated Shovel message transformation. Adjusted wording to describe the supported behavior: overriding selected publish fields/properties and adding forwarding headers.

## Review Notes
- The article is technically relevant and covers a valid RabbitMQ operational topic.
- Dynamic shovels are the RabbitMQ-documented modern/default choice when in doubt; the post still covers static shovels because they remain supported, but future revisions could emphasize dynamic shovels more strongly.
- Some operational examples use placeholder credentials and hostnames; these are acceptable for a tutorial but should not be copied into production without secret management and TLS certificate validation.
