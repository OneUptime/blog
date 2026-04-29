# Validation Summary: How to Set Up Kafka Monitoring with JMX Over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- JMX (Java Management Extensions)
- Java RMI / JConsole
- Prometheus
- Prometheus JMX Exporter
- Linux networking tools (`ss`)

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/42/operations/monitoring/
- Confluent documentation for Kafka JMX configuration: https://docs.confluent.io/platform/current/kafka/configure-jmx.html
- Oracle Java monitoring and management guide: https://docs.oracle.com/en/java/javase/25/management/monitoring-and-management-using-jmx-technology.html
- Oracle `jconsole` command reference: https://docs.oracle.com/en/java/javase/24/docs/specs/man/jconsole.html
- Prometheus JMX Exporter documentation: https://prometheus.github.io/jmx_exporter/
- Prometheus JMX Exporter rules reference: https://prometheus.github.io/jmx_exporter/1.4.0/http-mode/rules/
- Prometheus JMX Exporter releases: https://github.com/prometheus/jmx_exporter/releases
- Local CLI help output for `ss`: `ss --help`

## Issues Found
- The introduction said broker JMX can be used to scrape consumer lag metrics. Kafka's official monitoring docs distinguish broker replication lag metrics from consumer lag metrics, so this was corrected to replication metrics.
- The JMX setup used a bare `-Dcom.sun.management.jmxremote` flag and omitted a production safety caveat. This was changed to `-Dcom.sun.management.jmxremote=true` and a note was added that disabling authentication and TLS is not appropriate for production.
- The verification section referenced `kafka-jmx.sh`, which is not documented as an Apache Kafka CLI for querying JMX. It was replaced with a supported `jconsole` connection using the full JMX service URL, and the socket check was tightened to an IPv4-specific `ss` command.
- The JMX Exporter example downloaded version `0.20.0` and used a custom regex rule that did not accurately model JMX Exporter’s documented pattern input and incorrectly labeled `$1` as `broker`. This was updated to the current `1.5.0` release, a default catch-all rule (`pattern: ".*"`), and an agent example that appends to `KAFKA_OPTS` instead of replacing existing JVM options.
- Several Kafka MBean names used the wrong object-name format, and the `Request Queue Size` row pointed at `RequestsPerSec`, which is a different metric. The table was corrected to the official Kafka MBean names and descriptions.

## Review Notes
- The remote JMX example still disables authentication and TLS for simplicity; that is technically valid for testing but should be secured in production.
- The Prometheus scrape config is valid as written because Prometheus defaults to `metrics_path: /metrics`, which matches current JMX Exporter behavior.
