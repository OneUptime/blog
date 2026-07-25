# Validation Summary: How to Migrate from Oracle MySQL to Percona Server with Minimal Downtime

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Oracle MySQL 8.0 and 8.4
- Percona Server for MySQL 8.0 and 8.4
- Asynchronous source-replica replication
- Global Transaction Identifiers (GTIDs) and auto-positioning
- `mysqldump` logical backup and restore
- TLS-secured replication
- MySQL account and privilege management
- Read-only fencing and controlled database cutover
- Backup, rollback, and high-availability planning

## Sources Consulted
- [Percona Server for MySQL 8.4 documentation](https://docs.percona.com/percona-server/8.4/index.html)
- [Percona Server for MySQL 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
- [Percona Server and MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [Percona Server upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [Percona Server downgrade paths](https://docs.percona.com/percona-server/8.4/downgrade.html)
- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL 8.4 downgrade paths](https://dev.mysql.com/doc/refman/8.4/en/downgrading.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL upgrading or downgrading a replication topology](https://dev.mysql.com/doc/refman/8.4/en/replication-upgrade.html)
- [MySQL GTID auto-positioning](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html)
- [MySQL online GTID enablement](https://dev.mysql.com/doc/refman/8.4/en/replication-mode-change-online-enable-gtids.html)
- [MySQL `CHANGE REPLICATION SOURCE TO`](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [MySQL encrypted replication connections](https://dev.mysql.com/doc/refman/8.4/en/replication-encrypted-connections.html)
- [MySQL `mysqldump` reference](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [MySQL GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html)
- [MySQL binary logging options and variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html)
- [MySQL replication server identifiers](https://dev.mysql.com/doc/refman/8.4/en/replication-options.html)
- [MySQL `CREATE USER`](https://dev.mysql.com/doc/refman/8.4/en/create-user.html)
- [MySQL `read_only` and `super_read_only`](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_super_read_only)

## Issues Found
- The post stated categorically that replication from a later release to an earlier replica is unsupported. Current MySQL and Percona downgrade documentation lists limited 8.4-to-8.0 replication as a rollback-only method when no new server functionality has been applied. The version guidance and rollback section now state this exception while warning that Percona-to-Oracle support must be confirmed for the exact builds.
- The configuration example set `binlog_format=ROW` without noting that `binlog_format` is deprecated as of MySQL 8.0.34. The deprecated setting was removed from the baseline configuration. The post now instructs readers to verify that the effective format is `ROW`, which is the current default, and to follow version-specific procedures only if an existing server selects another format.
- The logical seed used `mysqldump --all-databases`. For a cross-version or cross-distribution restore, that can attempt to load source `mysql` system tables into a target whose system schema was initialized by a different build. The example now names application databases explicitly and instructs readers to recreate reviewed accounts and grants with account-management statements instead of overwriting target system schemas.
- A partial dump combined with `--set-gtid-purged=ON` records the source's complete `gtid_executed` set, including transactions for omitted schemas. The post now warns that every application schema in the replication scope must be listed, otherwise auto-positioning can skip history for data that was never restored.
- The dump example omitted important version and privilege requirements. The post now records that pre-8.0.32 clients could create inconsistent output with `--single-transaction` plus `--set-gtid-purged=ON`, and that current clients require `RELOAD` or `FLUSH_TABLES` for this combination and `PROCESS` unless `--no-tablespaces` is used.
- The restore example did not mention that a GTID-enabled dump contains restricted global and session assignments. The post now requires a staged privilege check for the temporary restore account and revocation after use because the exact dynamic privileges differ across current 8.0 and 8.4 builds.
- The replication account example used `caching_sha2_password` without explicitly limiting the example to a source version that provides that server-side plugin. The text now scopes this command to MySQL 8.0 or 8.4; the separate 5.7-to-8.4 warning still requires an intermediate 8.0 migration stage.
- The post said `WAIT_FOR_EXECUTED_GTID_SET()` returns `NULL` for errors. For the shown positive timeout, documented failures raise an error; the function returns `0` for success and `1` for timeout. The result description was corrected.

## Review Notes
- The side-by-side seed, replicate, fence, catch-up, and promote method matches Percona's documented minimal-downtime upgrade strategy.
- `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `STOP REPLICA`, and `SHOW REPLICA STATUS` are the current replication statements for the covered versions.
- `REPLICATION SLAVE` remains the documented privilege name for the replication connection account despite the newer source/replica terminology.
- The TLS options shown are current and perform CA and server identity verification when the source certificate matches the configured host name.
- `super_read_only` blocks privileged client updates while still permitting replication applier updates, as the post states.
- Percona Server 8.4.10-10 was the latest documented 8.4 release at validation time and incorporates MySQL 8.4.10. Operators must still recheck release notes and exact cross-distribution compatibility when executing a future migration.
