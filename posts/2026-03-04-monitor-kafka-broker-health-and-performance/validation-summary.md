# Validation Summary: How to Monitor Kafka Broker Health and Performance on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka broker CLI tools
- Kafka JMX metrics
- Prometheus JMX Exporter
- Grafana

## Sources Consulted
- Apache Kafka Monitoring documentation: https://kafka.apache.org/36/operations/monitoring/
- Apache Kafka documentation and CLI examples: https://kafka.apache.org/documentation/
- Red Hat Streams for Apache Kafka on RHEL, Monitoring your cluster using JMX: https://docs.redhat.com/en-us/documentation/red_hat_streams_for_apache_kafka/2.8/
- Prometheus JMX Exporter Java agent HTTP mode documentation: https://prometheus.github.io/jmx_exporter/1.5.0/java-agent/http-mode/
- Prometheus JMX Exporter GitHub releases: https://github.com/prometheus/jmx_exporter/releases/tag/1.5.0
- Prometheus JMX Exporter Kafka example configuration: https://github.com/prometheus/jmx_exporter/blob/main/examples/kafka-2_0_0.yml

## Issues Found
- The JMX enablement snippet used `-Dcom.sun.management.jmxremote` without an explicit value and omitted the Kafka `JmxReporter` configuration required by current Red Hat/Kafka guidance. Updated the system property to `-Dcom.sun.management.jmxremote=true` and added `metric.reporters=org.apache.kafka.common.metrics.JmxReporter`.
- The metric `IsrShrinkRate` did not match the documented Kafka JMX MBean name. Changed it to `IsrShrinksPerSec`.
- The metric `OfflinePartitionsCount` was outdated for current KRaft controller metrics. Changed it to `OfflinePartitionCount`.
- The healthy threshold for `RequestHandlerAvgIdlePercent` was too low for broker health guidance. Updated it from `> 0.3` to `> 0.7`, matching Red Hat guidance that values below 0.7 indicate performance degradation.
- The JMX Exporter download used the older Maven Central artifact URL and version `0.19.0`. Updated it to the current GitHub release URL for `1.5.0`.
- The JMX Exporter rules only captured `Value` attributes from `kafka.server` MBeans, which would miss per-second counters such as `MessagesInPerSec`, `BytesInPerSec`, and `IsrShrinksPerSec`, and idle percent attributes exposed as `MeanRate`. Expanded the rules to cover Kafka gauges, per-second counters, and percent metrics.

## Review Notes
- The Kafka CLI examples using `--bootstrap-server` for `kafka-topics.sh`, `kafka-consumer-groups.sh`, and `kafka-configs.sh` are technically valid.
- In production, JMX should be secured with authentication and SSL instead of the tutorial's local-only unauthenticated example.
- Some controller metric names differ between ZooKeeper-based and KRaft-based Kafka deployments; the post now uses the current KRaft `OfflinePartitionCount` metric.
