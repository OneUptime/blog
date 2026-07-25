# Validation Summary: How to Set Up GTID-Based Source-Replica Replication on Percona Server 8.4

## Status

validated

## Post Type

Technical tutorial and database operations guide

## Technologies Covered

- Percona Server for MySQL 8.4
- MySQL 8.4 asynchronous source-replica replication
- Global transaction identifiers (GTIDs) and auto-positioning
- MySQL binary logging and retention
- TLS-encrypted replication connections
- `caching_sha2_password` authentication
- `mysqldump` logical provisioning
- MySQL Performance Schema replication monitoring
- Multithreaded replica appliers
- `read_only` and `super_read_only` write fencing

## Sources Consulted

- [Percona Server for MySQL 8.4 documentation](https://docs.percona.com/percona-server/8.4/index.html)
- [Percona Server for MySQL 8.4 feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [Percona Server for MySQL 8.4 Clone plugin](https://docs.percona.com/percona-server/8.4/clone-plugin.html)
- [Percona Server for MySQL 8.4 APT installation and authentication guidance](https://docs.percona.com/percona-server/8.4/apt-repo.html)
- [MySQL 8.4: GTID format and storage](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-concepts.html)
- [MySQL 8.4: GTID auto-positioning](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html)
- [MySQL 8.4: Setting up replication using GTIDs](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-howto.html)
- [MySQL 8.4: Enabling GTID transactions online](https://dev.mysql.com/doc/refman/8.4/en/replication-mode-change-online-enable-gtids.html)
- [MySQL 8.4: Global transaction ID system variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-gtids.html)
- [MySQL 8.4: `CHANGE REPLICATION SOURCE TO`](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [MySQL 8.4: Encrypted replication connections](https://dev.mysql.com/doc/refman/8.4/en/replication-encrypted-connections.html)
- [MySQL 8.4: Binary logging options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html)
- [MySQL 8.4: Replica server options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html)
- [MySQL 8.4: `mysqldump`](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [MySQL 8.4: GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html)
- [MySQL 8.4: `replication_connection_status`](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-connection-status-table.html)
- [MySQL 8.4: `replication_applier_status_by_worker`](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html)
- [MySQL 8.4: `read_only` and `super_read_only`](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_super_read_only)
- [MySQL 8.4: `RESET BINARY LOGS AND GTIDS`](https://dev.mysql.com/doc/refman/8.4/en/reset-binary-logs-and-gtids.html)
- [MySQL 8.4: Skipping transactions](https://dev.mysql.com/doc/refman/8.4/en/replication-administration-skip.html)

## Issues Found

- The introduction described every committed transaction as receiving a GTID. Changed this to binary-logged committed transactions because read-only or otherwise nonlogged client transactions do not receive GTIDs.
- The operational checklist referred to encrypted credentials, which could imply at-rest encryption of channel metadata. Changed it to require an encrypted replication connection and protected credentials.
- Both server configurations explicitly set the deprecated `binlog_format` variable, and the verification query presented it as part of the current configuration contract. Removed the setting and query field, and documented that new MySQL 8.4 servers use row format by default while `binlog_format` is deprecated.
- The online GTID transition summary omitted the documented `enforce_gtid_consistency=WARN` workload-checking phase. Added the `WARN` phase before the change to `ON`.
- The generated replication password had no length constraint even though `SOURCE_PASSWORD` accepts at most 32 characters. Added the 32-character limit.
- The GTID auto-position handshake was described as sending only executed GTIDs. Corrected it to the union of the executed GTID set and the channel's received transaction set.
- The return behavior of `WAIT_FOR_EXECUTED_GTID_SET()` incorrectly said that errors return `NULL`. Corrected it to state that other failures raise errors, with the documented negative-timeout/non-strict-mode exception.
- The parallel-applier check queried deprecated `replica_parallel_type`. Removed that variable and the related `LOGICAL_CLOCK` value while retaining the current worker-count and commit-order checks.
- Recovery from purged required GTIDs was phrased as restoring binary logs, which could suggest placing log files back into the active source. Changed it to obtaining and applying the missing transactions from another source that still retains them, or reseeding from a current consistent snapshot.
- The backup section understated the post-transition restriction. Corrected it to state that anonymous binary logs cannot be used after the transition and that pre-transition backups are not usable on the newly GTID-enabled servers.

## Review Notes

- The remaining SQL statements, Performance Schema columns, `mysqldump` flags, GTID transition states, TLS options, privilege name, read-only controls, service command, and cited documentation links are valid for Percona Server/MySQL 8.4.
- The logical dump example is intentionally scoped to an InnoDB-focused snapshot. Its existing warnings to quiesce DDL and handle nontransactional tables separately are required for consistency.
- `replica_parallel_workers=4`, `replica_preserve_commit_order=ON`, binary logging enabled, row binary-log format, and `log_replica_updates=ON` are the applicable MySQL 8.4 defaults. Operators should still verify effective values on their exact Percona build and packaging method.
