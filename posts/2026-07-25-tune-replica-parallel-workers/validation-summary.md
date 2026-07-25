# Validation Summary: How to Tune `replica_parallel_workers` When a Percona Replica Cannot Keep Up

## Status
validated

## Post Type
Technical operations and performance-tuning guide

## Technologies Covered
- Percona Server for MySQL 8.4
- MySQL asynchronous and multi-source replication
- MySQL multithreaded replica applier
- MySQL Performance Schema
- GTID and binary-log-position replication monitoring
- InnoDB indexing and row-based replication
- Persisted MySQL system variables

## Sources Consulted
- [Percona Server for MySQL 8.4 documentation](https://docs.percona.com/percona-server/8.4/index.html)
- [Percona Server for MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [MySQL 8.4 replica server options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [MySQL 8.4 replication threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)
- [MySQL 8.4 monitoring replication applier worker threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads-monitor-worker.html)
- [MySQL 8.4 `replication_connection_status` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-connection-status-table.html)
- [MySQL 8.4 `replication_applier_status_by_worker` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html)
- [MySQL 8.4 `SHOW REPLICA STATUS` statement](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [MySQL 8.4 `START REPLICA` statement](https://dev.mysql.com/doc/refman/8.4/en/start-replica.html)
- [MySQL 8.4 `STOP REPLICA` statement](https://dev.mysql.com/doc/refman/8.4/en/stop-replica.html)
- [MySQL 8.4 replication row searches](https://dev.mysql.com/doc/refman/8.4/en/replication-features-row-searches.html)
- [MySQL 8.4 replication and `max_allowed_packet`](https://dev.mysql.com/doc/refman/8.4/en/replication-features-max-allowed-packet.html)
- [MySQL 8.4 removed and deprecated variables](https://dev.mysql.com/doc/refman/8.4/en/added-deprecated-removed.html)
- [MySQL Shell 8.4 parallel applier configuration](https://dev.mysql.com/doc/mysql-shell/8.4/en/configuring-parallel-applier.html)
- [MySQL 8.4 `SET` syntax for persisted variables](https://dev.mysql.com/doc/refman/8.4/en/set-variable.html)
- [MySQL 8.4 Performance Schema `variables_info` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-variables-info-table.html)
- [MySQL engineering: writeset-based dependency tracking](https://dev.mysql.com/blog-archive/improving-the-parallel-applier-with-writeset-based-dependency-tracking/)

## Issues Found
- The backlog-drain procedure used only a captured source GTID as its recovery target, although MySQL replication can run without GTIDs. The step now also permits captured source binary-log coordinates.
- Spanning multiple schemas was presented as an inherent serialization signal. Under the MySQL 8.4 default `LOGICAL_CLOCK` and writeset behavior, schema count alone does not determine transaction independence. The item now refers to broad writesets that conflict with later transactions.
- A source committing one transaction at a time was presented as an inherent limit on replica parallelism. Writeset dependency tracking can identify independent transactions even with low source concurrency. The item now refers specifically to statement-logged transactions whose dependency metadata exposes little concurrency.
- Disabling commit-order preservation was described as changing correctness in general. The documented effects are more precisely changes to external visibility, possible execution gaps, and recovery behavior, so the wording now says visibility and recovery properties.
- The `replica_pending_jobs_size_max` guidance sounded like a server-enforced constraint. MySQL documentation instructs operators to ensure that it is at least the source's `max_allowed_packet`, but the setting is a soft limit. The wording now reflects documented configuration guidance.
- The `variables_info` query was said to detect drift among all option-file, runtime, and persisted settings. That table reports the effective value and the source from which it was most recently set; it does not compare every shadowed configuration source. The claim now accurately describes the query and requires comparison with configuration management's source of truth.

## Review Notes
- All SQL identifiers and Performance Schema columns used in the post are valid for MySQL 8.4.
- The documented defaults and ranges are correct: `replica_parallel_workers=4` with a range of 0 to 1024, `replica_parallel_type=LOGICAL_CLOCK`, `replica_preserve_commit_order=ON`, and `replica_pending_jobs_size_max=128M`.
- The `replica_parallel_workers=0` setting and the `replica_parallel_type` variable are deprecated in MySQL 8.4; the post correctly recommends one worker for sequential apply and calls out the type variable's deprecation.
- `SHOW REPLICA STATUS\G` uses the `mysql` client's vertical-output terminator and is valid in that context.
- GTID-valued Performance Schema columns are empty when GTIDs are not in use, which is why the recovery procedure now includes binary-log coordinates.
