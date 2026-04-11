# Validation Summary: How to Stream MySQL Changes to Apache Flink

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (binary logging, CDC configuration)
- Apache Flink 1.17+ (Table API, DataStream API, Flink SQL)
- Flink CDC MySQL Connector (Change Data Capture)
- Debezium (deserialization schema)
- JDBC Connector (Flink sink)

## Sources Consulted
- Flink 1.17 Window Aggregation docs — https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/dev/table/sql/queries/window-agg/
- Flink 1.17 JDBC connector docs — https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/connectors/table/jdbc/
- Flink CDC MySQL connector docs — https://nightlies.apache.org/flink/flink-cdc-docs-master/docs/connectors/flink-sources/mysql-cdc/
- Flink Metrics reference — https://nightlies.apache.org/flink/flink-docs-master/docs/ops/metrics/
- Flink 1.17 Windowing TVF docs — https://nightlies.apache.org/flink/flink-docs-release-1.17/docs/dev/table/sql/queries/window-tvf/
- MySQL binary log configuration — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html

## Issues Found
1. **Missing WATERMARK declaration for tumbling window (High severity)**: The `mysql_orders` table defined `order_date` as a plain `TIMESTAMP(3)` without a watermark strategy. Flink's `TUMBLE()` group window function requires the time column to be a declared event-time or processing-time attribute. Without a `WATERMARK FOR order_date AS ...` clause, the tumbling window query would fail at plan time with a type error. **Fix**: Added `WATERMARK FOR order_date AS order_date - INTERVAL '5' SECOND` to the table definition.

2. **Incorrect monitoring metric: `currentFetchEventTimeLag` (Medium severity)**: This metric is specific to Alibaba Cloud's managed Realtime Compute for Apache Flink service, not standard open-source Flink or Flink CDC. **Fix**: Replaced with `currentEmitEventTimeLag`, the standard Flink source metric for event-time lag.

3. **Non-existent monitoring metric: `numberOfEnqueuedRecords` (High severity)**: This metric does not appear in any Flink or Flink CDC documentation. **Fix**: Replaced with `pendingRecords`, the standard Flink source metric for tracking unprocessed record backlog.

4. **JDBC sink missing authentication credentials (Low severity)**: The JDBC connector sink table omitted `username` and `password` properties. While technically optional in the Flink JDBC connector spec, virtually all MySQL databases require authentication, making the example misleading for readers. **Fix**: Added `username` and `password` properties to the JDBC sink table definition.

## Review Notes
- The post uses the legacy `GROUP BY TUMBLE(col, interval)` / `TUMBLE_START()` / `TUMBLE_END()` syntax, which is deprecated in Flink 1.13+ in favor of Window Table-Valued Function (TVF) syntax. The legacy syntax still works in Flink 1.17+ and has not been removed, so this is not a correctness issue. A future update could migrate to the TVF syntax: `FROM TABLE(TUMBLE(TABLE mysql_orders, DESCRIPTOR(order_date), INTERVAL '1' MINUTE))`.
- The MySQL configuration, replication user grants, Flink CDC source table definition, DataStream API example, and Flink REST API endpoints are all correct.
- The claim about "exactly-once processing guarantees" in the summary is accurate when Flink checkpointing is enabled with the CDC connector.
