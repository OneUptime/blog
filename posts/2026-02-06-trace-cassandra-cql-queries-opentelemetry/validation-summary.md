# Validation Summary: How to Trace Cassandra CQL Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- DataStax Java Driver for Apache Cassandra
- DataStax Python `cassandra-driver`
- OpenTelemetry Java SDK and Java agent
- OpenTelemetry Python SDK and Cassandra instrumentation
- OpenTelemetry Collector
- Prometheus JMX exporter
- OTLP

## Sources Consulted
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java Cassandra standalone instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/cassandra/cassandra-4.4/library
- Maven Central metadata for `io.opentelemetry:opentelemetry-api`: https://repo.maven.apache.org/maven2/io/opentelemetry/opentelemetry-api/maven-metadata.xml
- Maven Central metadata for `io.opentelemetry:opentelemetry-exporter-otlp`: https://repo.maven.apache.org/maven2/io/opentelemetry/opentelemetry-exporter-otlp/maven-metadata.xml
- Maven Central metadata for `io.opentelemetry.instrumentation:opentelemetry-cassandra-4.4`: https://repo.maven.apache.org/maven2/io/opentelemetry/instrumentation/opentelemetry-cassandra-4.4/maven-metadata.xml
- DataStax Java Driver 4.17 API and docs: https://docs.datastax.com/en/drivers/java/latest/com/datastax/oss/driver/api/core/CqlSession.html
- DataStax Python Driver getting started guide: https://docs.datastax.com/en/developer/python-driver/latest/getting_started/
- OpenTelemetry Python Cassandra instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/cassandra/cassandra.html
- OpenTelemetry Cassandra semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/cassandra/
- OpenTelemetry database semantic convention stability guidance: https://opentelemetry.io/docs/specs/semconv/db/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Protocol exporter configuration: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Java standalone instrumentation dependency was shown, but the code did not use it. Updated the Java example to wrap the `CqlSession` with `CassandraTelemetry.create(openTelemetry).wrap(rawSession)`, matching the official OpenTelemetry Java instrumentation README.
- The Java example manually created a database span while claiming the Cassandra instrumentation created it. Replaced the manual query span with execution through the wrapped session and kept the parent business span current with `Scope`.
- OpenTelemetry Java dependency versions were outdated. Updated OpenTelemetry API, SDK, and OTLP exporter examples to `1.62.0`, and Cassandra instrumentation to `2.28.1-alpha`, based on Maven Central metadata available on 2026-06-05.
- The Java example imported `ResourceAttributes` without declaring the semantic conventions artifact. Replaced it with a direct `service.name` attribute key so the shown dependencies are sufficient.
- The Java query discussed consistency-level tracing but did not set a consistency level. Added `DefaultConsistencyLevel.LOCAL_QUORUM` to the `SimpleStatement`.
- The post used deprecated/legacy database semantic attribute names such as `db.system`, `db.statement`, `db.cassandra.consistency_level`, and `db.cassandra.coordinator.id`. Updated the examples and prose to current names such as `db.system.name`, `db.query.text`, `db.namespace`, `cassandra.consistency.level`, `cassandra.coordinator.id`, `cassandra.page.size`, `db.operation.batch.size`, `db.operation.name`, and `db.collection.name`.
- The Java agent section listed stable database semantic attributes without noting the opt-in requirement. Added `OTEL_SEMCONV_STABILITY_OPT_IN=database` to the Java agent command and adjusted the wording.
- The Python example imported `ConsistencyLevel` from `cassandra.query`, but the DataStax Python driver documents it from `cassandra`. Fixed the import.
- The Collector example added `db.system` as a resource attribute, which is not the correct current span/resource semantic convention. Removed the resource processor from the example.
- The conclusion described the Python example as manual instrumentation even though it uses `CassandraInstrumentor().instrument()`. Updated the conclusion to describe Python auto-instrumentation with parent spans for business context.

## Review Notes
- The local environment did not include `mvn` or `jar`, so I could not compile the Java sample end to end. I verified dependency versions from Maven Central metadata and verified the `CassandraTelemetry` class exists in the `opentelemetry-cassandra-4.4-2.28.1-alpha.jar` artifact using `unzip`.
- The Python Cassandra instrumentation package is still beta/development status in OpenTelemetry Python Contrib, which is acceptable for the tutorial but worth noting for production users.
- Some Cassandra-specific attributes, such as coordinator details, depend on what the driver instrumentation can observe for a given query and instrumentation version.
