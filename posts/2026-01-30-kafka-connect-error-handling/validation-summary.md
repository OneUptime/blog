# Validation Summary: How to Create Kafka Connect Error Handling

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Apache Kafka Connect
- Kafka Connect sink connector error handling
- Dead Letter Queues (DLQs)
- Kafka Java consumer and producer clients
- Kafka Connect `ErrantRecordReporter`
- Confluent JDBC, Elasticsearch, and HTTP sink connector configuration
- JMX monitoring and Prometheus scraping

## Sources Consulted
- Apache Kafka `SinkTaskContext` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/connect/sink/SinkTaskContext.html
- Confluent Platform `ErrantRecordReporter` Javadoc: https://docs.confluent.io/platform/current/connect/javadocs/javadoc/org/apache/kafka/connect/sink/ErrantRecordReporter.html
- Confluent sink connector configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/sink-connect-configs.html
- Confluent source connector configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/source-connect-configs.html
- Confluent Kafka Connect monitoring documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- Confluent Elasticsearch sink connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html

## Issues Found
- The post stated Kafka Connect has three error tolerance modes, but the documented values are only `none` and `all`. Changed the statement to say there are two modes.
- The post implied `errors.tolerance=all` prevents any single bad record from stopping the pipeline. Narrowed this to supported record processing stages such as converters and SMTs, because generic connector I/O failures may require connector-specific handling.
- The DLQ description and diagram implied arbitrary connector failures are always routed to the DLQ. Clarified that Kafka Connect DLQ configuration captures failed sink records and removed the diagram edge from the connector directly to the DLQ.
- The Elasticsearch sink example used `type.name`, which is not listed in the current Confluent Elasticsearch sink connector configuration. Replaced it with the current `key.ignore` option.
- The custom error reporter example used the internal `org.apache.kafka.connect.runtime.errors.ErrorReporter` API and a nonstandard `errors.reporters` connector setting. Replaced it with the public `org.apache.kafka.connect.sink.ErrantRecordReporter` pattern used by custom sink tasks and showed enabling it through standard DLQ settings.
- The monitoring section treated the Kafka Connect REST port as a Prometheus `/metrics` endpoint. Kafka Connect does not expose Prometheus metrics there by default, so the scrape example now uses JMX exporter-style targets and notes that exact Prometheus metric names depend on exporter rules.
- The JMX metrics table originally placed error counters under `connector-task-metrics`. Updated it to use the documented `task-error-metrics` MBean and kept `connector-task-metrics` only for task status and throughput metrics.
- The Prometheus alert examples used metric names that did not align with the documented task error metrics. Updated them to JMX exporter-style task error metric names and added a caveat about exporter mappings.
- The DLQ reprocessor committed consumer offsets immediately after scheduling asynchronous producer sends. Added `producer.flush()` before `consumer.commitSync()` so the example does not commit before queued produce calls have been sent.
- The best-practice statement said to always enable error tolerance in production. Softened this to recommend `errors.tolerance=all` when skipping bad records is acceptable and paired with a DLQ.

## Review Notes
- The remaining Java consumer and producer examples are illustrative and syntactically consistent with the Kafka Java client APIs, but production DLQ processors should add explicit character sets, stronger retry identity keys, bounded shutdown handling, and durable retry tracking.
- Prometheus metric names are deployment-specific unless the post also provides the JMX exporter rules that generate them.
