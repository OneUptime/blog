# Validation Summary: StarRocks Routine Load Reports “TOO MANY TASKS”: How to Tune Concurrency and Batch Size

## Status

validated

## Post Type

Technical troubleshooting and performance-tuning guide

## Technologies Covered

- StarRocks Routine Load
- Apache Kafka
- StarRocks SQL
- StarRocks FE and BE configuration
- Load concurrency, batching, transactions, and compaction

## Sources Consulted

- [StarRocks Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [ALTER ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/ALTER_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [FE configuration management](https://docs.starrocks.io/docs/administration/management/FE_configuration/)
- [FE query and loading configuration](https://docs.starrocks.io/docs/administration/management/FE_parameters/user_query_loading/)
- [StarRocks 3.1 release notes](https://docs.starrocks.io/releasenotes/release-3.1/)
- [StarRocks `AlterRoutineLoadStmt` source](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/sql/ast/AlterRoutineLoadStmt.java)
- [StarRocks `RoutineLoadJob` source](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/load/routineload/RoutineLoadJob.java)
- [StarRocks `RoutineLoadTaskScheduler` source](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/load/routineload/RoutineLoadTaskScheduler.java)
- [StarRocks `data_consumer_group.cpp` source](https://github.com/StarRocks/starrocks/blob/main/be/src/data_workflows/load/routine_load/data_consumer_group.cpp)

## Issues Found

- `SHOW ALL ROUTINE LOAD;` was described as inspecting jobs across databases. The `ALL` keyword includes stopped and cancelled jobs; it does not expand the command to every database. The example now uses `SHOW ROUTINE LOAD FROM ingestion;` and tells the reader to repeat it for each database that owns Routine Load jobs.
- The `left_bytes` guidance treated every non-negative value as proof that consume time ended first. Current StarRocks code ends the loop when the byte budget is exhausted, the time budget expires, or the consumer queue reaches end-of-stream. The post now identifies `left_bytes <= 0` as the byte boundary and directs readers to inspect `left_time` and `eos` when bytes remain.

## Review Notes

- The concurrency formula, default values of `max_routine_load_task_concurrent_num` and `max_routine_load_task_num_per_be`, 4 GiB `max_routine_load_batch_size` default, and FE configuration syntax match current official documentation.
- The version caveats are accurate: StarRocks v3.1 deprecated the BE `routine_load_thread_pool_size` setting, moved per-BE task capacity control to the FE `max_routine_load_task_num_per_be` parameter, and added `task_consume_second` and `task_timeout_second` as job properties.
- The current `ALTER ROUTINE LOAD` documentation does not list the two job-level timing properties in its editable-property summary, but the v3.1 release notes and current StarRocks parser and job code confirm that both properties can be altered and that configuring only one derives the other at a 4:1 timeout-to-consume-time ratio.
- SQL syntax and behavior were validated against official documentation and current StarRocks source. No live StarRocks cluster was available for execution testing.
