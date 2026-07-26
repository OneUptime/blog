# Validation Summary: StarRocks Routine Load Is PAUSED: Fix Kafka Offset, Error-Row, and Parsing Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- StarRocks Routine Load
- StarRocks SQL
- Apache Kafka
- CSV, JSON, and Avro ingestion
- Kafka TLS and SASL authentication

## Sources Consulted
- [StarRocks: Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [StarRocks: Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [StarRocks: CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [StarRocks: ALTER ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/ALTER_ROUTINE_LOAD/)
- [StarRocks: SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [StarRocks: SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [StarRocks: PAUSE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/PAUSE_ROUTINE_LOAD/)
- [StarRocks: RESUME ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/RESUME_ROUTINE_LOAD/)
- [StarRocks: STOP ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/STOP_ROUTINE_LOAD/)
- [StarRocks: Strict mode](https://docs.starrocks.io/docs/loading/load_concept/strict_mode/)
- [Apache Kafka 4.3: Admin client configuration](https://kafka.apache.org/43/configuration/admin-configs/)
- [Apache Kafka 4.3: Topic configuration](https://kafka.apache.org/43/configuration/topic-configs/)
- [Apache Kafka 4.3.1: `kafka-get-offsets.sh`](https://github.com/apache/kafka/blob/4.3.1/bin/kafka-get-offsets.sh)
- [Apache Kafka 4.3.1: `GetOffsetShell` options](https://github.com/apache/kafka/blob/4.3.1/tools/src/main/java/org/apache/kafka/tools/GetOffsetShell.java)

## Issues Found
- The Kafka examples invoked the old `kafka.tools.GetOffsetShell` class with the obsolete `--broker-list` option. They were changed to the current `bin/kafka-get-offsets.sh` script with `--bootstrap-server` and the documented `earliest` and `latest` time values.
- The `ALTER ROUTINE LOAD` example attempted to change `max_filter_ratio`, but current StarRocks documentation does not list that property as alterable. The example now changes only `max_error_number`, and the text explains that `max_filter_ratio` must be selected when the job is created.
- The `SHOW ROUTINE LOAD TASK` examples depended on the session's current database even though the post consistently identifies the job as `ingestion.kafka_orders`. Both statements now use `FROM ingestion`.
- The opening description implied that every paused job was paused automatically because of a task failure, although users can also pause jobs explicitly. It now scopes that explanation to automatically paused jobs.
- The task-inspection text referred to “live tasks,” which may not exist while a job is paused. It now accurately refers to task records and coordinator BE IDs, and clarifies that eligible coordinator BEs need access to the configured TLS or SASL material.

## Review Notes
- The corrected SQL statements match the current StarRocks syntax, including the temporary `NEED_SCHEDULE` state after `RESUME ROUTINE LOAD`.
- The descriptions of error-detection windows, default error thresholds, last-batch behavior, JSON message boundaries, CSV `\N` handling, Kafka offset loss, and irreversible `STOP ROUTINE LOAD` behavior agree with the current official documentation.
- Kafka command availability can vary in vendor distributions, so the post's advice to use tooling and security options appropriate to the installed distribution remains important.
