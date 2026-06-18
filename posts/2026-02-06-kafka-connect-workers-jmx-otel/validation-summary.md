# Validation Summary: How to Instrument Kafka Connect Workers and Connector Task Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Connect
- Java Management Extensions (JMX)
- OpenTelemetry JMX Scraper
- OpenTelemetry Collector OTLP receiver/exporter
- Kafka Connect REST API
- Python `requests`

## Sources Consulted
- OpenTelemetry Collector Contrib JMX receiver README, https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jmxreceiver/README.md
- OpenTelemetry Java Contrib JMX Scraper README, https://github.com/open-telemetry/opentelemetry-java-contrib/blob/main/jmx-scraper/README.md
- OpenTelemetry Java Instrumentation Kafka Connect JMX rule set, https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/src/main/resources/jmx/rules/kafka-connect.yaml
- OpenTelemetry Java Instrumentation Kafka Connect metrics documentation, https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/kafka-connect.md
- Apache Kafka Connect REST API user guide, https://kafka.apache.org/43/kafka-connect/user-guide/
- Confluent Kafka Connect monitoring documentation, https://docs.confluent.io/platform/current/connect/monitoring.html

## Issues Found
1. **Deprecated Collector JMX receiver pattern.** The post used the Collector `jmxreceiver` with `jar_path`. The official Collector contrib README now marks `jmxreceiver` as deprecated and recommends managing JMX scraping as a standalone Java process. I replaced the receiver example with an OTLP receiver in the Collector and a separate `java -jar /opt/opentelemetry-jmx-scraper.jar` command.

2. **Wrong JMX jar artifact.** The original snippets used `/opt/opentelemetry-jmx-metrics.jar`, but Kafka Connect is covered by the current JMX Scraper target-system definitions. I changed the examples to use `/opt/opentelemetry-jmx-scraper.jar`.

3. **Incorrect OpenTelemetry Kafka Connect metric names.** Many listed metrics used underscore-style names such as `kafka.connect.worker.task_count` and `kafka.connect.source.task.poll_batch_avg_time_ms`. The current OpenTelemetry Kafka Connect rule set emits dot-separated semantic names such as `kafka.connect.worker.task.count` and `kafka.connect.source.poll.batch.time.average`. I updated worker, connector, source-task, and sink-task metric names.

4. **Incorrect startup and status metric model.** The post listed separate startup success/failure counters and treated connector status as a string comparison. The current rule set exports startup counts with result attributes and status as state indicator metrics with value `1`. I updated the metric list and alert examples to use result/state attributes.

5. **Nonexistent or unsupported rate metrics.** The post listed source and sink `*_rate` metrics as OpenTelemetry output. Kafka Connect JMX exposes rate attributes, but the current OpenTelemetry Kafka Connect rule set exports record counts and leaves rate calculations to the backend. I replaced the rate examples with supported count metrics.

6. **REST API section claimed scraping/reporting that the code did not do.** The Python example only checked `/connectors` and `/connectors/{name}/status`; it did not scrape through the Collector's HTTP receiver or report OTLP metrics. I changed the wording and removed unused imports/variables.

7. **Sink lag alert used the wrong metric.** The original alert referenced `kafka.connect.sink.task.sink_record_active_count`, which does not match the current OpenTelemetry metric name. I changed it to `kafka.connect.sink.record.lag.max`, which is the dedicated lag metric exposed by the Kafka Connect rule set.

## Review Notes
- The Kafka Connect REST API endpoints used by the Python example are valid: `GET /connectors` and `GET /connectors/{name}/status`.
- The JMX enablement examples are broadly valid for a basic unauthenticated lab setup, but production deployments should use JMX authentication and TLS rather than `authenticate=false` and `ssl=false`.
- Alert syntax remains illustrative because exact metric and attribute names may be translated by a backend such as Prometheus.
