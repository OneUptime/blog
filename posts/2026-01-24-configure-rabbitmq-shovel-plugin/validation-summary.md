# Validation Summary: How to Configure RabbitMQ Shovel Plugin

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RabbitMQ Shovel plugin
- RabbitMQ dynamic and static shovel configuration
- RabbitMQ management UI, HTTP API, and CLI
- RabbitMQ Prometheus and Shovel Prometheus plugins
- AMQP 0-9-1
- TLS for AMQP connections
- Prometheus alerting rules

## Sources Consulted
- RabbitMQ Shovel Plugin documentation: https://www.rabbitmq.com/docs/shovel
- RabbitMQ Dynamic Shovels documentation: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ Static Shovels documentation: https://www.rabbitmq.com/docs/shovel-static
- RabbitMQ URI Query Parameters documentation: https://www.rabbitmq.com/docs/uri-query-parameters
- RabbitMQ Prometheus documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Shovel Prometheus plugin source and README: https://github.com/rabbitmq/rabbitmq-server/tree/main/deps/rabbitmq_shovel_prometheus

## Issues Found
- Static shovel configuration was described as belonging in either `rabbitmq.conf` or `advanced.config`. RabbitMQ's static shovel documentation requires the advanced configuration file, so the wording was corrected to `/etc/rabbitmq/advanced.config`.
- The post implied static shovels are the ideal choice for permanent routing. RabbitMQ documentation now recommends dynamic shovels for most deployments, so the guidance was adjusted while preserving static shovels as a valid node-boot option.
- The options table used `delete_after`, but the dynamic shovel key is `src-delete-after`. The table now uses the documented dynamic key.
- The HTTP API URL for a specific shovel status was missing the `vhost` path segment. It was corrected from `/api/shovels/%2f/logs_shovel` to `/api/shovels/vhost/%2f/logs_shovel`.
- The multi-destination pattern incorrectly showed multiple shovels consuming the same queue for replication. RabbitMQ queues distribute messages across competing consumers, so the text and example were corrected to use separate source queues bound to the same source exchange.
- The Prometheus section said shovel metrics are automatically exported by the Prometheus plugin and used a non-current `rabbitmq_shovel_state` metric. The section now requires `rabbitmq_shovel_prometheus` and uses the aggregate `rabbitmq_shovel_dynamic` and `rabbitmq_shovel_static` metrics exposed by that plugin.
- The TLS URI examples used `verify=verify_peer` without `server_name_indication`. RabbitMQ's URI parameter documentation recommends using both, so the examples now include SNI values.

## Review Notes
The remaining examples use placeholder hostnames, credentials, queues, and exchanges and assume the relevant RabbitMQ topology and permissions exist. The post is validated as a tutorial after the corrections above.
