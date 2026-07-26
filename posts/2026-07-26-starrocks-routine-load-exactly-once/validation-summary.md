# Validation Summary: Does StarRocks Kafka Routine Load Really Provide Exactly-Once Ingestion?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks Routine Load
- Apache Kafka topics, partitions, offsets, and retention
- StarRocks load transactions and Frontend scheduling
- StarRocks Duplicate Key and Primary Key tables
- JSON and Avro source-message metadata
- StarRocks Routine Load monitoring and rejected-record logging

## Sources Consulted

- [StarRocks: Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [StarRocks FAQ: Routine Load consistency and troubleshooting](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [StarRocks SQL reference: CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [StarRocks SQL reference: SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [StarRocks SQL reference: SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [StarRocks SQL reference: STOP ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/STOP_ROUTINE_LOAD/)
- [StarRocks SQL reference: RESUME ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/RESUME_ROUTINE_LOAD/)
- [StarRocks: Change data through loading](https://docs.starrocks.io/docs/loading/Load_to_Primary_Key_tables/)
- [StarRocks: Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/)
- [StarRocks: Duplicate Key table](https://docs.starrocks.io/docs/table_design/table_types/duplicate_key_table/)
- [StarRocks release notes: 4.1](https://docs.starrocks.io/releasenotes/release-4.1/)
- [StarRocks change #73840: Expose Kafka/Pulsar message metadata through INCLUDE METADATA](https://github.com/StarRocks/starrocks/pull/73840)
- [StarRocks change #76294: Make Routine Load metadata aliases optional](https://github.com/StarRocks/starrocks/pull/76294)
- [Apache Kafka: Design](https://kafka.apache.org/42/design/design/)
- [Apache Kafka: Log implementation](https://kafka.apache.org/42/implementation/log/)

## Issues Found

- The post said that Kafka offsets identify records, but an offset is unique only within a topic partition. Changed this to the complete `(topic, partition, offset)` coordinate and clarified that the duplicate example uses one partition.
- The job-inventory example used `SHOW ALL ROUTINE LOAD` without a database. Without `FROM`, the statement is scoped to the current database and may not inspect the `ingestion` database used by the post. Changed it to `SHOW ALL ROUTINE LOAD FROM ingestion`.
- The post advised preserving rejected-record logs without noting that Routine Load defaults `log_rejected_record_num` to `0`, which records no rejected rows. Added the required positive-value or `-1` configuration caveat.
- The post presented `INCLUDE METADATA` as generally available in current StarRocks. The feature was merged to `main` in July 2026 after the latest published v4.1.1 and, as of the validation date, is not present in a published release. Added an explicit version and build requirement while retaining the example, whose syntax matches the implementation and current Latest-4.1 documentation.
- The source-coordinate guidance distinguished environments and topic lifecycles but not Kafka clusters. Because the same topic, partition, and offset values can exist in different clusters, changed the guidance so `source_stream` must distinguish clusters as well.

## Review Notes

- The central exactly-once explanation matches the official Routine Load FAQ: each task is a transaction, failed transactions do not advance FE-managed partition progress, and retries start from the last saved position.
- The `SHOW ROUTINE LOAD`, `SHOW ROUTINE LOAD TASK`, table DDL, JSON column mapping, metadata aliases, and `from_unixtime(m_timestamp / 1000)` syntax match the official documentation and the merged StarRocks implementation.
- The explanations of Duplicate Key append behavior, Primary Key UPSERT behavior, stopped and cancelled job recovery, filtering thresholds, Kafka retention gaps, and independent job progress are technically correct.
- All external links in the post returned successful HTTP responses during validation.
- No live StarRocks cluster was available in the repository. SQL and behavior were validated against official documentation, release notes, merged source, and implementation tests rather than by executing the statements.
