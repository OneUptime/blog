# Validation Summary: How to Monitor Kafka with JMX Metrics on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka
- Java Management Extensions (JMX)
- Prometheus JMX Exporter
- systemd
- firewalld

## Sources Consulted
- Apache Kafka 4.2 Monitoring documentation: https://kafka.apache.org/42/operations/monitoring/
- Prometheus JMX Exporter documentation: https://prometheus.github.io/jmx_exporter/
- Prometheus JMX Exporter Java agent HTTP mode documentation: https://prometheus.github.io/jmx_exporter/1.5.0/java-agent/http-mode/
- Prometheus JMX Exporter HTTP mode rules documentation: https://prometheus.github.io/jmx_exporter/1.5.0/http-mode/rules/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The original post used placeholder paths such as `/etc/<service>/config.conf`, `<service-name>`, and `<PORT>`, so the commands would not configure Kafka or JMX metrics. Replaced them with concrete Kafka service, JMX Exporter configuration, and port `9404` examples.
- The post title promised Kafka JMX monitoring, but the original steps did not enable a JMX metrics endpoint. Added a Prometheus JMX Exporter Java agent configuration using the documented `-javaagent:<jar>=<port>:<config>` syntax.
- The original introduction claimed JMX metrics could be used for consumer lag. Kafka broker JMX is appropriate for broker health, replication, and topic throughput; full consumer lag monitoring usually requires consumer/client metrics or lag calculation. Updated the claim to avoid overstating broker JMX coverage.
- The original verification commands did not test the metrics endpoint. Added a `curl http://localhost:9404/metrics` check.
- The test topic creation command relied on broker defaults. Added explicit `--partitions 1 --replication-factor 1` options to make the example clearer for a single-broker setup.
- The troubleshooting section used generic placeholders. Replaced them with Kafka-specific service names and JMX Exporter path checks.

## Review Notes
The systemd override assumes the Kafka service is started through the standard Kafka launch scripts and honors `KAFKA_OPTS`. If a distribution-specific Kafka package uses a different environment file or JVM option variable, the path to configure the Java agent should be adapted for that service unit.
