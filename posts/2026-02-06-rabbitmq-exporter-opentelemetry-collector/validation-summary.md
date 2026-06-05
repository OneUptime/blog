# Validation Summary: How to Configure the RabbitMQ Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib RabbitMQ exporter
- OpenTelemetry Collector OTLP receiver, batch processor, internal telemetry, and encoding extensions
- RabbitMQ / AMQP 0.9.1
- Python `pika` RabbitMQ client

## Sources Consulted
- OpenTelemetry Collector exporter registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib RabbitMQ exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/rabbitmqexporter
- RabbitMQ exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/rabbitmqexporter/config.go
- RabbitMQ exporter factory and defaults: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/rabbitmqexporter/factory.go
- RabbitMQ exporter publishing implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/rabbitmqexporter/internal/publisher/publisher.go
- OpenTelemetry OTLP encoding extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/encoding/otlpencodingextension
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- RabbitMQ AMQP 0.9.1 model and exchange documentation: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ queue durability documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ publisher confirms documentation: https://www.rabbitmq.com/docs/confirms
- RabbitMQ TTL documentation: https://www.rabbitmq.com/docs/ttl
- Pika blocking consumer examples and API documentation: https://pika.readthedocs.io/

## Issues Found
- The original post used unsupported RabbitMQ exporter fields such as `exchange.name`, `exchange.type`, `exchange.durable`, `routing_key` at the exporter root, `encoding`, `timeout`, `delivery_mode`, `confirm_mode`, `headers`, `routing_key_template`, `priority_template`, `ttl`, `expiration_template`, `connection.endpoints`, and `connection_pool`. I replaced the examples with the current supported schema: `connection`, `connection.auth.plain`, `connection.tls`, `connection_timeout`, `heartbeat`, `publish_confirmation_timeout`, `routing.exchange`, `routing.routing_key`, `durable`, `encoding_extension`, and `retry_on_failure`.
- The original post claimed the exporter can create or configure topic and fanout exchanges. The official exporter documentation says it publishes to the default exchange or a named direct exchange only and does not create exchanges, queues, or bindings. I corrected the routing section and related explanations.
- The original encoding examples used `encoding: json`, `encoding: protobuf`, `encoding: messagepack`, and `json_indent`. The current exporter defaults to OTLP protobuf and uses `encoding_extension` for alternate encodings. I corrected the examples to use the OTLP encoding extension for JSON and noted that MessagePack is not supported by the exporter.
- The original dynamic routing, message header, priority, and TTL examples described features that are not exposed by the current exporter. I replaced them with accurate static routing guidance and RabbitMQ-side TTL notes.
- The original high availability example used unsupported multiple endpoints and connection pooling settings. I changed it to supported retry and timeout settings and noted that cluster failover should be handled through a stable RabbitMQ endpoint such as a service name or load balancer.
- The original monitoring example used the now-ignored `service.telemetry.metrics.address` setting. I updated it to the current `service.telemetry.metrics.readers[].pull.exporter.prometheus` syntax.
- The Python consumer originally assumed JSON payloads for all messages and used a topic binding pattern. I updated it to match the corrected direct exchange example and clarified that default exporter payloads are OTLP protobuf unless the OTLP JSON encoding extension is configured.

## Review Notes
- I validated that the YAML examples parse syntactically and that the Python consumer example parses with Python's AST parser.
- I did not run `otelcol-contrib --dry-run` because no Collector binary is installed in this workspace.
- The RabbitMQ exporter is currently alpha in the OpenTelemetry Collector Contrib distribution, so future versions may change the supported configuration fields.
