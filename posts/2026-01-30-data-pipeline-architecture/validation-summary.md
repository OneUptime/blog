# Validation Summary: How to Build Data Pipeline Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Data pipeline architecture
- ETL and ELT
- Batch and stream processing
- Python
- Apache Kafka and kafka-python
- dbt and dbt-utils
- Google BigQuery SQL
- OpenTelemetry Python
- pytest and testcontainers

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/2.2.7/_modules/kafka/producer/kafka.html
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html
- dbt data tests documentation: https://docs.getdbt.com/docs/build/data-tests
- dbt data_tests property reference: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt BigQuery partitioning configuration: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- Google BigQuery DATE functions reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html

## Issues Found
- Replaced `datetime.utcnow()` usage in Python examples with timezone-aware `datetime.now(timezone.utc)` to avoid deprecated naive UTC timestamps in modern Python.
- Corrected the dbt BigQuery model from Snowflake-style `DATEDIFF('day', ...)` to BigQuery-compatible `DATE_DIFF(..., DAY)`.
- Updated the dbt schema example from legacy `tests:` keys and top-level test arguments to the current `data_tests:` and `arguments:` structure.
- Corrected the dbt explanation to say tests run with `dbt test` or `dbt build`, not automatically after every `dbt run`.
- Updated the OpenTelemetry example to register a `BatchSpanProcessor` and `PeriodicExportingMetricReader` with OTLP exporters so traces and metrics are actually exported.
- Added an observable gauge callback for `pipeline.queue.lag`, matching the OpenTelemetry metrics API.
- Added the missing `logging` import and `logger` definition to the scaling example.
- Changed the Kafka snippet label from end-to-end exactly-once semantics to idempotent producer writes, because the example does not use Kafka transactions or transactional offset commits.
- Fixed the unit test examples to pass `UserEvent` instances into `transform_events`, matching the function signature and earlier implementation.

## Review Notes
The examples remain illustrative and rely on placeholder infrastructure objects such as `source_db`, `warehouse_db`, `source.fetch`, `destination.bulk_insert`, and `create_connection`. That is acceptable for this guide, but a future executable companion repository should provide concrete adapters or mocks for those interfaces.
