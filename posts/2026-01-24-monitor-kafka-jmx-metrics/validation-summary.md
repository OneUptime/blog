# Validation Summary: How to Monitor Kafka with JMX Metrics

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Java Management Extensions (JMX)
- Prometheus JMX Exporter
- Prometheus alerting rules
- Grafana dashboards
- Kafka Lag Exporter
- Burrow
- Docker Compose
- Confluent Platform Docker images

## Sources Consulted
- Apache Kafka Monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Confluent Platform Kafka JMX monitoring documentation: https://docs.confluent.io/platform/current/kafka/monitoring.html
- Confluent Platform Docker JMX monitoring documentation: https://docs.confluent.io/platform/current/installation/docker/operations/monitoring.html
- Prometheus JMX Exporter Java Agent documentation: https://prometheus.github.io/jmx_exporter/deployment/java-agent/
- Prometheus JMX Exporter rules documentation: https://prometheus.github.io/jmx_exporter/configuration/rules/
- Prometheus JMX Exporter releases: https://github.com/prometheus/jmx_exporter/releases
- Kafka Lag Exporter documentation: https://github.com/seglo/kafka-lag-exporter
- Burrow configuration documentation: https://github.com/linkedin/Burrow/wiki/Configuration

## Issues Found
- The JMX Exporter download and Java agent examples used version 0.19.0. Updated them to 1.6.0, the current release documented by Prometheus JMX Exporter as of the review date, and preserved any existing `KAFKA_OPTS` content when adding the Java agent.
- The fetch latency MBean and alert used `request=Fetch`, but Kafka documents `TotalTimeMs` with `request={Produce|FetchConsumer|FetchFollower}`. Changed the consumer fetch latency examples to `FetchConsumer`.
- The low disk space alert divided Kafka log size metrics by node filesystem size metrics, which can produce incorrect PromQL due to unrelated labels and does not measure filesystem utilization. Replaced it with a node-exporter filesystem utilization expression.
- Kafka Lag Exporter examples used non-documented environment variable names and Prometheus queries referenced `kafka_consumergroup_lag` with a `consumergroup` label. Updated the Docker examples to mount an `application.conf`, and changed queries to the documented `kafka_consumergroup_group_lag` metric with the `group` label.
- Removed the `kafka_consumergroup_members` alert because that metric is not documented by Kafka Lag Exporter and would not work with the shown setup.

## Review Notes
- The Docker broker example uses Confluent Platform 7.5.0 with ZooKeeper. That is valid for the version shown, but current Kafka and Confluent Platform deployments generally use KRaft mode, so a future refresh should consider adding or switching to a KRaft example.
- The JMX Exporter rules are illustrative and may need tuning against the exact Kafka version and MBeans emitted in a given deployment.
