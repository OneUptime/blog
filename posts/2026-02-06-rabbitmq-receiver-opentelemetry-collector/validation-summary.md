# Validation Summary: How to Configure the RabbitMQ Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib RabbitMQ receiver
- RabbitMQ management plugin and HTTP API
- RabbitMQ access control and monitoring users
- Collector processors, exporters, TLS, and internal telemetry
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector contrib RabbitMQ receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/README.md
- OpenTelemetry Collector contrib RabbitMQ receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/metadata.yaml
- OpenTelemetry Collector contrib RabbitMQ receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/config.go
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector datapoint OTTL context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ access control documentation: https://www.rabbitmq.com/docs/access-control

## Issues Found
- Several RabbitMQ receiver metric names were incorrect, including `rabbitmq.queue.messages.ready`, `rabbitmq.queue.messages.unacknowledged`, `rabbitmq.node.memory.used`, `rabbitmq.node.disk.free`, `rabbitmq.connection.count`, and exchange metrics. Replaced them with documented metrics such as `rabbitmq.message.current`, `rabbitmq.consumer.count`, `rabbitmq.node.mem_used`, `rabbitmq.node.disk_free`, and `rabbitmq.node.connection_created`.
- The post described native queue and exchange include/exclude filters, but the RabbitMQ receiver configuration does not expose `queues` or `exchanges` settings. Replaced those examples with Collector filter processor examples that drop unwanted queue datapoints after collection.
- Metric configuration examples included unsupported per-metric `description` fields. Removed those fields and kept supported `enabled` settings.
- The production filter processor example used the older `metrics.datapoint` shape and an invalid `value_int` path for the current documented filter processor syntax. Updated it to `metric_conditions` with OTTL paths such as `metric.name` and resource attributes.
- The post used the deprecated `resourcedetection` processor type in the production example. Updated it to `resource_detection`.
- Collector environment variable substitution examples used `${VAR}`. Updated Collector config snippets to use the documented `${env:VAR}` form.
- The RabbitMQ monitoring user example granted read permission to all resources. Updated it to the RabbitMQ-recommended monitoring-only pattern using the `monitoring` tag and empty resource permissions.
- The RabbitMQ user creation example wrapped a password containing `!` in double quotes, which can be interpreted by interactive shells. Changed it to single quotes.
- The network restriction example described `management.tcp.ip` as an allowlist. Clarified that it binds the management listener to a specific interface; firewall rules should be used for host allowlisting.
- Summary and troubleshooting text assumed native queue/exchange filtering and exchange metrics. Updated those sections to match the supported receiver behavior.

## Review Notes
The RabbitMQ receiver is a contrib receiver and its README currently documents RabbitMQ 3.8 and 3.9 support, while RabbitMQ itself has newer releases. The post does not claim a specific RabbitMQ version, so no version-specific change was required. YAML snippets were parsed successfully after the corrections.
