# Validation Summary: How to Monitor RabbitMQ Queue Depth, Consumer Count, Unacked Messages,

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Management Plugin
- RabbitMQ Prometheus Plugin
- OpenTelemetry Collector Contrib
- RabbitMQ receiver
- Prometheus receiver
- Filter processor
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector RabbitMQ receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/README.md
- OpenTelemetry Collector RabbitMQ receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/metadata.yaml
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Transformation Language functions: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- RabbitMQ Management Plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ Prometheus Plugin documentation: https://www.rabbitmq.com/docs/prometheus

## Issues Found
- Updated the Collector environment variable example from `"${RABBITMQ_PASSWORD}"` to `"${env:RABBITMQ_PASSWORD}"`, matching current OpenTelemetry Collector configuration documentation.
- Updated the Prometheus receiver example to scrape `/metrics/detailed` with queue metric families. RabbitMQ's `/metrics` endpoint is aggregated by default, while detailed per-queue metrics are exposed via the detailed endpoint and selected `family` parameters.
- Replaced outdated RabbitMQ Prometheus metric names with current `rabbitmq_detailed_*` per-queue metric names, including separate automatic-ack and manual-ack delivery counters.
- Updated the per-queue filter processor example from deprecated include/resource-attribute matching syntax to current OTTL `metric_conditions` syntax.
- Corrected the monitoring user permissions from AMQP read access (`.*`) to empty configure/write/read permissions (`^$`), consistent with RabbitMQ's monitoring-only access guidance.
- Clarified that the `monitoring` tag grants management API monitoring access, while empty permissions avoid granting AMQP resource access.
- Aligned the Docker Compose collector password with the monitoring user password used in the command example.

## Review Notes
The RabbitMQ receiver metrics referenced in the post are present in the current OpenTelemetry Collector Contrib metadata, but the receiver documentation and metric metadata still mark these queue metrics as development stability. The Docker Compose example remains a minimal setup and assumes the monitoring user has been created or the receiver credentials are adjusted for the default RabbitMQ user.
