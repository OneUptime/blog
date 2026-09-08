# Validation Summary: How to Stop DuckDB Queries Exhausting Memory on Large Parquet Data

## Status

validated

## Post Type

Technical troubleshooting and performance tuning guide with executable SQL examples.

## Technologies Covered

- DuckDB SQL, configuration, query planning, and out-of-core execution
- Apache Parquet, Hive partitioning, and filter/projection pushdown
- Memory budgets, temporary storage, and query concurrency
- Linux/container memory limits and OOM termination
- Arrow and Pandas result materialization

## Sources Consulted

- DuckDB out-of-memory troubleshooting: https://duckdb.org/docs/current/guides/troubleshooting/oom_errors.html
- DuckDB workload tuning, blocking operators, spilling limitations, and insertion order: https://duckdb.org/docs/current/guides/performance/how_to_tune_workloads.html
- DuckDB configuration reference, defaults, setting types, and global scope: https://duckdb.org/docs/current/configuration/overview.html
- DuckDB Parquet reader and projection/filter pushdown: https://duckdb.org/docs/current/data/parquet/overview.html
- DuckDB memory management overview: https://duckdb.org/2024/07/09/memory-management.html
- DuckDB Hive partition detection, partition pruning, and date inference: https://duckdb.org/docs/current/data/partitioning/hive_partitioning.html
- DuckDB Parquet row-group guidance: https://duckdb.org/docs/current/data/parquet/tips
- DuckDB temporary tables and CREATE TABLE AS: https://duckdb.org/docs/current/sql/statements/create_table
- DuckDB memory-limit caveats and thread settings: https://duckdb.org/docs/current/configuration/pragmas
- DuckDB performance guide on OOM: https://duckdb.org/docs/current/guides/performance/oom.html

## Issues Found

- The concurrency example could imply that each query receives an independent 6 GB memory limit. DuckDB exposes this as a global instance setting; connections to the same instance share the managed memory budget. Replaced the example with an explicit distinction between concurrent queries sharing one instance and four separate instances configured for 6 GB each. Preserved the admission-control recommendation and explained that unmanaged allocations can still exceed the configured limit.

## Review Notes

- Executed all six SQL code blocks successfully using DuckDB Python 1.5.5 in an isolated temporary environment. Substituted temporary local paths for the illustrative lake and spill paths and created compatible Parquet fixtures and a customer table.
- Verified the settings query returns all five requested settings, all SET statements execute, both aggregation examples return expected totals, and EXPLAIN shows partition pruning (one of two files scanned) and the settled-status filter at the scan.
- The first aggregation covers September 1–7; the staged example independently covers all matching September partitions. Its totals were checked for that broader scope; it does not claim to be an equivalent rewrite of the earlier query.
- Confirmed the documented 80 percent memory default, buffer-manager versus process-memory distinction, supported spill settings, and limitations involving multiple blocking operators and complex aggregate states. No deprecated SQL APIs were found.
- Confirmed Hive partitioning and DATE partition types are automatically detected under the default settings used by the examples. Input paths and the customer table remain illustrative prerequisites.
- All four official documentation links in the post resolve to the intended resources, including the workload-tuning and partial-reading sections. The author profile URL is syntactically plausible and is not a technical reference.
- Memory savings, spill volume, cancellation recovery, and survival under container limits are workload-dependent operational guidance. Small-fixture execution validates syntax and results; production-scale stress, disk-exhaustion, cancellation, and Linux OOM tests were not performed.
- Documentation consulted identifies the current stable series as 1.5. The post does not pin a release; deployments should record and retest their actual version as advised.
