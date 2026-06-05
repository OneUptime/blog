# Validation Summary: How to Trace Spring Data JPA and JDBC Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java API and instrumentation
- OpenTelemetry JDBC instrumentation
- OpenTelemetry Java agent / Spring Data instrumentation
- Spring Boot
- Spring Data JPA
- Hibernate / JPA
- JDBC and JdbcTemplate
- HikariCP
- Micrometer
- PostgreSQL JDBC

## Sources Consulted
- OpenTelemetry Java instrumentation repository and supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry JDBC library instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jdbc/library/README.md
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation docs: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java agent instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/sql/
- Maven Central for `io.opentelemetry:opentelemetry-api`: https://central.sonatype.com/artifact/io.opentelemetry/opentelemetry-api
- Maven Central for `io.opentelemetry.instrumentation:opentelemetry-jdbc`: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-jdbc
- Spring Boot metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- HikariCP OpenTelemetry library instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/hikaricp-3.0/library/README.md

## Issues Found
- The dependency versions were outdated. Updated `opentelemetry-api` from `1.33.0` to `1.62.0` and `opentelemetry-jdbc` from `1.33.0-alpha` to `2.28.1-alpha`, matching current Maven Central metadata.
- The JDBC configuration used non-existent options: `statement`, `bind-parameters`, `slow-query-threshold`, `result-set-size`, and `connection-pool-name`. Replaced them with the documented `otel.instrumentation.jdbc.statement-sanitizer.enabled` setting.
- The post implied JDBC bind parameters and result-set size are captured by OpenTelemetry JDBC. Updated the text to avoid that claim; OpenTelemetry Java documents that JDBC bind parameters are not captured in `db.statement`.
- The post described transaction boundaries and connection acquisition as JDBC trace spans. Corrected this to say SQL execution is traced, while connection pool behavior is monitored with metrics and `@Transactional` is not itself a JDBC span.
- The HikariCP metrics example passed a Micrometer `MeterRegistry` to `setMetricRegistry`, which is not the correct Micrometer API. Updated it to use `MicrometerMetricsTrackerFactory`.
- The database span attribute list used legacy semantic convention names only. Updated the list to current stable names such as `db.system.name`, `db.namespace`, `db.query.text`, `db.operation.name`, `server.address`, and `server.port`, with a note that older OpenTelemetry Java instrumentation may emit legacy names.
- The `ProductSummary` type used in the JDBC example was undefined. Added a compact record definition inside the example.
- The diagram and repository section overstated what is automatic from the shown JDBC dependency alone. Updated the wording to distinguish JDBC library instrumentation from Spring Data spans produced by the OpenTelemetry Java agent.

## Review Notes
The examples remain tutorial snippets rather than a complete runnable Spring Boot project. In a production article, it would be useful to show one complete instrumentation path, either Java agent, Spring Boot starter, or explicit library wrapping, because those modes use different configuration and initialization patterns.
