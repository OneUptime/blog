# Validation Summary: How to Monitor Apache Cassandra Cluster Health, Compaction Throughput,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Java JMX
- OpenTelemetry Collector JMX receiver
- OpenTelemetry Java Contrib JMX metrics
- Cassandra JMX MBeans
- YAML collector configuration

## Sources Consulted
- Apache Cassandra monitoring metrics documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html
- Apache Cassandra JMX security documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/operating/security.html#jmx-access
- Apache Cassandra `cassandra-env.sh` documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/configuration/cass_env_sh_file.html
- OpenTelemetry Collector Contrib JMX receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jmxreceiver/README.md
- OpenTelemetry Java Contrib JMX Scraper documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/README.md
- OpenTelemetry Java Contrib Cassandra JMX mapping: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/src/main/resources/cassandra.yaml
- OpenTelemetry Java Contrib Cassandra target-system metrics documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-metrics/docs/target-systems/cassandra.md

## Issues Found
- The remote JMX example disabled authentication and SSL and used `java.rmi.server.hostname=0.0.0.0`. Updated it to use `LOCAL_JMX=no`, `JMX_PORT=7199`, a reachable node hostname or IP, and a note to keep authentication enabled and use SSL where possible.
- The OpenTelemetry JMX receiver examples used `/opt/opentelemetry-jmx-metrics.jar`, which does not match the current documented default jar path. Updated examples to `/opt/opentelemetry-java-contrib-jmx-metrics.jar`.
- The health metrics section listed `org.apache.cassandra.internal:type=CompactionManager` for pending tasks. Replaced it with the documented Cassandra thread-pool MBean for the compaction executor pending-task gauge.
- The latency examples used `P99` as a JMX attribute. Updated them to `99thPercentile`, which matches Dropwizard/Cassandra latency MBean attributes.
- The alert examples used non-existent or mismatched OpenTelemetry metric names such as `cassandra.compaction.pending_tasks` and `cassandra.client_request.read.latency.p99`. Updated built-in metric names to the documented Cassandra target-system names and marked metrics that require custom JMX mappings with a `custom.` prefix.
- The summary claimed the built-in JMX receiver target collects all listed Cassandra MBeans. Updated it to clarify that the built-in Cassandra target collects a defined set and custom mappings are needed for additional MBeans such as failure detector, dropped messages, and per-table SSTable counts.

## Review Notes
The post is now technically accurate as a guide, but several alert examples remain backend-agnostic pseudo-YAML rather than a complete Prometheus, Alertmanager, or vendor-specific rule format. The built-in OpenTelemetry Cassandra target does not currently export every raw JMX MBean discussed in the guide; production users should add explicit JMX mappings for any `custom.*` metrics.
