# Validation Summary: How to Use ClickHouse with Apache Flink

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Apache Flink 1.18 (DataStream API, Table API/Flink SQL)
- ClickHouse (ReplacingMergeTree, MergeTree family)
- ClickHouse JDBC driver (`com.clickhouse:clickhouse-jdbc` 0.6.3)
- Flink JDBC connector (`flink-connector-jdbc` 3.1.2-1.18)
- Flink Kafka connector (`flink-connector-kafka` 3.1.0-1.18)
- Apache Flink Kubernetes Operator (`flink.apache.org/v1beta1`)
- Java, Maven, YAML, SQL

## Sources Consulted
- Flink 1.18 JDBC connector docs: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/jdbc/
- Flink 1.18 JdbcSink Javadoc: https://nightlies.apache.org/flink/flink-docs-release-1.18/api/java/org/apache/flink/connector/jdbc/JdbcSink.html
- Maven Central — flink-connector-jdbc 3.1.2-1.18: https://repo1.maven.org/maven2/org/apache/flink/flink-connector-jdbc/3.1.2-1.18/
- Maven Central — flink-connector-kafka 3.1.0-1.18: https://central.sonatype.com/artifact/org.apache.flink/flink-connector-kafka/3.1.0-1.18
- ClickHouse Java client / JDBC docs: https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- ClickHouse Java repo: https://github.com/ClickHouse/clickhouse-java
- Flink Kubernetes Operator CRD overview: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/docs/custom-resource/overview/
- Flink `TumblingEventTimeWindows` Javadoc (1.18): https://nightlies.apache.org/flink/flink-docs-release-1.18/api/java/org/apache/flink/streaming/api/windowing/assigners/TumblingEventTimeWindows.html

## Issues Found
1. **Missing `flink-connector-jdbc` dependency in `pom.xml`.** The Java code uses `JdbcSink`, `JdbcConnectionOptions`, and `JdbcExecutionOptions` from `org.apache.flink.connector.jdbc`, but the Maven pom only declared `flink-streaming-java`, `clickhouse-jdbc`, `flink-connector-kafka`, and `flink-table-api-java-bridge`. Since Flink 1.15+ the JDBC connector is externalized — the project would not compile without it. **Fix:** added `org.apache.flink:flink-connector-jdbc:3.1.2-1.18` to the dependency list.
2. **Misleading comment on `clickhouse-jdbc` dependency.** The XML comment labeled it "ClickHouse Flink connector" — `com.clickhouse:clickhouse-jdbc` is actually the ClickHouse JDBC driver, not a Flink connector. **Fix:** renamed the comment to "ClickHouse JDBC driver".

## Review Notes
- **Flink SQL `'connector' = 'jdbc'` with ClickHouse is fragile.** The upstream `flink-connector-jdbc` in Flink 1.18 does not ship a ClickHouse dialect (the built-in resolver covers MySQL/Postgres/Derby/Oracle/CrateDB/SQL Server/Trino). A `jdbc:ch://...` or `jdbc:clickhouse://...` URL will commonly fail dialect validation. In production, most teams use the community connector (https://github.com/itinycheng/flink-connector-clickhouse) with `'connector' = 'clickhouse'`, or supply a custom dialect. Upstream work is tracked in FLINK-37834. The post's SQL snippet is preserved as the generic JDBC-to-ClickHouse pattern, but readers should expect to add a ClickHouse dialect or swap in the community connector.
- `TumblingEventTimeWindows.of(Time.minutes(1))` compiles fine on Flink 1.18 but `org.apache.flink.streaming.api.windowing.time.Time` is deprecated from Flink 1.19 in favor of `java.time.Duration` — callers targeting 1.19+ should migrate to `Duration.ofMinutes(1)`.
- The DataStream example uses the older `aggregated.addSink(JdbcSink.sink(...))`. In Flink 1.18+ the unified Sink API (`sinkTo(...)` with a `Sink<T>` built via `JdbcSink.builder()`) is the preferred replacement; the legacy `SinkFunction` path still works in 1.18.
- `Timestamp.from(...)` expects a `java.time.Instant`; callers should ensure `WindowResult#windowStart`/`windowEnd` are `Instant`s (the snippet leaves the DTO shape implicit).
- The `ReplacingMergeTree(updated_at)` table uses a `DEFAULT now()` version column; this is functional but means that upsert semantics depend on writers setting `updated_at` correctly if they want a specific winner on duplicate keys. Running `OPTIMIZE TABLE ... FINAL` or querying with `FINAL` is still needed to see deduplicated results immediately.
- `flink-clients` (runtime) and a table planner (e.g., `flink-table-planner_2.12`) are typically needed when actually executing these jobs locally; the `pom.xml` omits them, which is acceptable for a focused sample but worth noting for readers bootstrapping from scratch.
