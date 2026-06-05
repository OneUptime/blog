# Validation Summary: How to Monitor Kafka Broker Metrics with the JMX Receiver

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Apache Kafka
- Kafka JMX metrics
- OpenTelemetry Collector JMX receiver
- OpenTelemetry JMX Metric Gatherer / JMX Scraper
- OpenTelemetry Collector configuration
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector JMX receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/jmxreceiver
- OpenTelemetry JMX Scraper documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/tree/main/jmx-scraper
- OpenTelemetry JMX Metric Gatherer Kafka target documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-metrics/docs/target-systems/kafka.md
- OpenTelemetry JMX Scraper Kafka mapping: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/src/main/resources/kafka.yaml
- Apache Kafka monitoring documentation: https://kafka.apache.org/36/operations/monitoring/
- Confluent Platform Docker JMX monitoring documentation: https://docs.confluent.io/platform/current/installation/docker/operations/monitoring.html

## Issues Found
- The post used non-existent OpenTelemetry metric names such as `kafka.broker.under_replicated_partitions`, `kafka.broker.isr_shrinks_per_sec`, and `kafka.broker.active_controller_count`. I replaced them with the names emitted by the built-in Kafka JMX mapping: `kafka.partition.under_replicated`, `kafka.isr.operation.count`, and `kafka.controller.active.count`.
- The post described ISR shrink and expand metrics as direct per-second metrics. The OpenTelemetry Kafka mapping emits a counter with an `operation` attribute, so I changed the wording to counts and kept the alert as a rate over that counter.
- The post listed `kafka.broker.request_handler_avg_idle_percent` as if it were emitted by the built-in Kafka target. That JMX MBean exists in Kafka, but the OpenTelemetry Kafka target does not map it by default, so I added a custom `jmx_configs` example and updated the alert to use the custom metric.
- The log flush metric name `kafka.broker.log_flush_rate_and_time` did not match the Kafka target mapping. I replaced it with the emitted log flush metrics: `kafka.logs.flush.time.count`, `kafka.logs.flush.time.50p`, and `kafka.logs.flush.time.99p`.
- The custom JMX metric section did not actually define a custom metric. I changed it to reference a custom JMX YAML file and added the mapping needed for request handler idle ratio.
- The OpenTelemetry Collector `jmxreceiver` is officially deprecated as of 2026-01-30. I added a note recommending the standalone JMX Gatherer or JMX Scraper for new deployments while preserving the existing receiver example for legacy deployments.

## Review Notes
- The Kafka JMX setup examples are broadly consistent with Apache Kafka and Confluent Docker JMX guidance, though production deployments should enable JMX authentication and TLS instead of using unauthenticated JMX.
