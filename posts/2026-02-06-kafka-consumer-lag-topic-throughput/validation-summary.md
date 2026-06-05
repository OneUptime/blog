# Validation Summary: How to Monitor Kafka Consumer Group Lag and Per-Topic Throughput

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- OpenTelemetry Collector Contrib
- Kafka Metrics Receiver
- OpenTelemetry JMX Scraper
- PromQL
- Docker Compose
- Confluent Platform Docker images

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kafkametricsreceiver
- OpenTelemetry Collector Contrib Kafka Metrics Receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/kafkametricsreceiver/metadata.yaml
- OpenTelemetry Collector Contrib JMX Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/jmxreceiver
- OpenTelemetry Java Contrib JMX Scraper README: https://github.com/open-telemetry/opentelemetry-java-contrib/tree/main/jmx-scraper
- OpenTelemetry Java Contrib Kafka consumer JMX mapping: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/src/main/resources/kafka-consumer.yaml
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types documentation: https://prometheus.io/docs/tutorials/understanding_metric_types/
- Confluent Docker JMX monitoring documentation: https://docs.confluent.io/platform/current/installation/docker/operations/monitoring.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Apache Kafka monitoring documentation: https://kafka.apache.org/documentation/#monitoring

## Issues Found
- The Kafka metrics receiver used the deprecated `kafkametrics` component name. Updated it to `kafka_metrics`, which is the current receiver type; the old name is only an alias and logs a deprecation warning.
- The Collector pipeline still referenced the old receiver name. Updated the pipeline receiver reference to `kafka_metrics`.
- The Kafka receiver example listed `kafka-2` and `kafka-3`, but the Docker Compose snippet only defines `kafka-1`. Removed the undefined brokers from the sample.
- The PromQL examples used `rate()` on `kafka.consumer_group.lag` and `kafka.partition.current_offset`, which are gauges in the Kafka metrics receiver metadata. Replaced these with `deriv()` and adjusted the alert message unit to messages/sec.
- The post recommended the deprecated OpenTelemetry Collector `jmxreceiver`. Replaced the Collector receiver example with the current standalone OpenTelemetry JMX Scraper configuration.
- The listed Kafka consumer JMX metric names used underscores and included metrics not emitted by the built-in OpenTelemetry Kafka consumer target. Updated the names to the official hyphenated metrics and clarified that coordinator metrics such as `commit-rate` and `join-rate` are raw Kafka JMX MBean metrics for custom mappings.
- The Docker Compose example used `latest` Confluent images with ZooKeeper configuration. Pinned the Kafka and ZooKeeper images to a concrete Confluent Platform 7.6.x tag and added `KAFKA_JMX_HOSTNAME`, which Confluent documents as required for reliable Docker JMX access.

## Review Notes
ZooKeeper mode is still usable with the pinned Confluent Platform 7.6.x example, but Confluent recommends KRaft for new deployments in current releases. A future revision could switch the compose sample to KRaft, but that would require a larger rewrite than a correctness fix.
