# Validation Summary: How to Build SQL Analytics with ksqlDB and Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- ksqlDB
- Confluent Platform Docker images
- Docker Compose
- ksqlDB SQL
- ksqlDB REST API
- ksqlDB user-defined functions
- JMX metrics

## Sources Consulted
- Confluent ksqlDB CREATE STREAM reference: https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-reference/create-stream.html
- Confluent ksqlDB CREATE TABLE AS SELECT reference: https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-reference/create-table-as-select.html
- Confluent ksqlDB scalar functions reference: https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-reference/scalar-functions.html
- Confluent ksqlDB REST API /query endpoint reference: https://docs.confluent.io/platform/current/ksqldb/developer-guide/ksqldb-rest-api/query-endpoint.html
- Confluent ksqlDB processing log reference: https://docs.confluent.io/platform/current/ksqldb/reference/processing-log.html
- Confluent ksqlDB UDF guide: https://docs.confluent.io/platform/current/ksqldb/how-to-guides/create-a-user-defined-function.html
- Confluent ksqlDB server configuration reference: https://docs.confluent.io/platform/current/ksqldb/reference/server-configuration.html
- Confluent ksqlDB monitoring guide: https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/monitoring.html
- Confluent ksqlDB metrics reference: https://docs.confluent.io/platform/current/ksqldb/reference/metrics.html
- Confluent Platform supported versions and interoperability: https://docs.confluent.io/platform/current/installation/versions-interoperability.html

## Issues Found
- The stream transformation used `TIMESTAMPTOSTRING(order_time, ...)`. Confluent documents `TIMESTAMPTOSTRING` as deprecated and intended for BIGINT millisecond timestamps, while `order_time` is declared as `TIMESTAMP`. Changed it to `FORMAT_TIMESTAMP(order_time, ...)`, the current function for formatting `TIMESTAMP` values.
- The late-data aggregation used `SUM(amount)` against the `orders` stream, but the stream schema in the post defines `quantity` and `price`, not `amount`. Changed the aggregation to `SUM(quantity * price) AS total_revenue` and renamed the count alias to `order_count` for consistency.
- The JMX metric examples used non-documented dotted names such as `ksql.consumer_messages_per_sec`. Updated them to documented ksqlDB metric attributes including `ksql-query-status`, `query-status`, `consumer-messages-per-sec`, `consumer-total-messages`, and `error-rate`.

## Review Notes
- The `/query` REST endpoint shown in the post is still documented for SELECT queries, but Confluent notes that `/query-stream` is preferred when HTTP/2 is available.
- The Docker image versions are internally consistent with Confluent Platform 7.5.x, which shipped ksqlDB 0.29.0.
