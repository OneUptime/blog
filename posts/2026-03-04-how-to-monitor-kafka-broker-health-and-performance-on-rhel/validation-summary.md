# Validation Summary: How to Monitor Kafka Broker Health and Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Kafka broker operations
- Kafka command-line tools
- JMX metrics
- Prometheus JMX Exporter
- systemd service environment configuration

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/37/operations/monitoring/
- Red Hat Streams for Apache Kafka on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/3.2/pdf/using_streams_for_apache_kafka_on_rhel/Red_Hat_Streams_for_Apache_Kafka-3.2-Using_Streams_for_Apache_Kafka_on_RHEL-en-US.pdf
- Prometheus JMX Exporter releases: https://github.com/prometheus/jmx_exporter/releases
- Maven Central JMX Exporter artifact listing: https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/

## Issues Found
- The request latency metric for fetch requests used `request=Fetch`. Current Kafka monitoring documentation lists request total time as `request={Produce|FetchConsumer|FetchFollower}`. I changed the example to show `FetchConsumer` and `FetchFollower`.
- The JMX environment comment suggested adding shell `export` lines directly to `/etc/systemd/system/kafka.service`, which is not valid systemd unit syntax. I clarified that the exports are for the Kafka startup environment and that systemd units should use `Environment=` entries.
- The Prometheus JMX Exporter download pinned the old `0.20.0` Maven Central artifact. I updated it to the current `1.5.0` GitHub release download URL.

## Review Notes
- The Kafka topic, consumer group, and log directory commands use valid Kafka CLI flags for modern Kafka distributions.
- The JMX examples disable authentication and SSL, which is acceptable for a local tutorial snippet but should be secured for production deployments.
