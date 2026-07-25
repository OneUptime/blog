# How to Migrate from Oracle MySQL to Percona Server with Minimal Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Database Migration, Replication, High Availability

Description: Migrate Oracle MySQL to a side-by-side Percona Server replica with a controlled write freeze, GTID catch-up, and tested rollback boundary.

---

The lowest-risk way to move from Oracle MySQL to Percona Server is to build a new Percona instance, seed it from a consistent snapshot, let replication catch up, and switch traffic during a short write freeze. The old source remains intact until the new service passes its acceptance period.

This separates package replacement from data migration and gives you time to test Percona under the real change stream. It also avoids treating "drop-in replacement" as permission to exchange binaries beneath a live data directory.

The procedure in this article is for asynchronous source-replica replication. It assumes that the source and target are a supported version pair. If the source is MySQL 5.7 and the target is Percona Server 8.4, stop: the supported path requires an intermediate MySQL 8.0 stage.

## Define the Version Pair Before the Method

Percona Server builds are based on MySQL releases. Keep the first migration as close as possible:

- MySQL 8.0 to a compatible Percona Server 8.0 build
- MySQL 8.4 to a compatible Percona Server 8.4 build
- MySQL 8.0 to Percona Server 8.4 only as a planned and tested 8.0-to-8.4 upgrade

MySQL supports replication from an older source to a newer replica only when that pairing is also a supported upgrade path. Replication from a later release to an earlier-release replica is generally unsupported outside documented rollback-only downgrade paths. For example, MySQL and Percona document 8.4-to-8.0 replication as a rollback method only when no new server functionality has been applied to the data. Cross-distribution Percona-to-Oracle replication still needs confirmation for the exact builds. These rules determine both upgrade order and the rollback boundary.

Record the exact source:

```sql
SELECT
  VERSION() AS version,
  @@version_comment AS distribution,
  @@server_uuid AS server_uuid,
  @@server_id AS server_id,
  @@gtid_mode AS gtid_mode,
  @@enforce_gtid_consistency AS enforce_gtid_consistency,
  @@binlog_format AS binlog_format,
  @@log_bin AS log_bin;
```

Select a Percona build only after checking its release notes for the incorporated MySQL base release.

## Choose the Side-by-Side Topology

Use three roles during the migration:

```text
applications -> Oracle MySQL source
                       |
                       | asynchronous replication
                       v
                 Percona target
```

Keep the Percona target fenced from writes:

```sql
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

`super_read_only` also prevents privileged users from accidentally writing around `read_only`. Replication applier threads can still apply source transactions.

Place the target on equivalent or better storage and networking. A target that cannot sustain the production write rate will never reach zero lag, regardless of cutover planning.

## Inventory Compatibility, Not Just Tables

Before copying data, inventory:

- every storage engine in use
- plugins and components
- Oracle Enterprise features
- account authentication plugins
- events, routines, triggers, and views
- character sets and collations
- reserved words in object names
- replication filters
- encryption and key-management dependencies
- server variables that differ from defaults
- backup and point-in-time recovery procedures

Useful queries include:

```sql
SELECT ENGINE, COUNT(*) AS tables_using_engine
FROM information_schema.tables
WHERE TABLE_SCHEMA NOT IN
  ('information_schema', 'mysql', 'performance_schema', 'sys')
GROUP BY ENGINE;

SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
FROM information_schema.plugins
ORDER BY PLUGIN_TYPE, PLUGIN_NAME;

SELECT user, host, plugin
FROM mysql.user
ORDER BY user, host;
```

The account query exposes security metadata and requires appropriate privileges. Store the result securely.

Do not enable Percona-only features before the migration has settled. A clean MySQL-compatible baseline keeps validation and recovery simpler.

## Prepare Replication and Retention

GTID-based replication makes the cutover and catch-up checks easier. Ideally, both existing and target servers already use:

```ini
[mysqld]
gtid_mode=ON
enforce_gtid_consistency=ON
```

Verify that `@@binlog_format` is `ROW`. Row-based logging is the default in current MySQL 8.0 and 8.4 releases. The `binlog_format` variable itself is deprecated as of MySQL 8.0.34, so do not add it to a new configuration when the default is already correct; if an existing server explicitly selects another format, move it to `ROW` using the procedure for that exact release.

Each server needs a unique nonzero `server_id` and a unique `server_uuid`.

If GTIDs are not currently enabled, use MySQL's documented online GTID transition. Do not jump directly from `OFF` to `ON`; the online procedure moves through permissive states and waits for anonymous transactions to drain.

Set binary log retention long enough to cover:

- snapshot creation
- data transfer and restore
- target catch-up
- troubleshooting contingency

If the source purges transactions before the target requests them, auto-positioning cannot invent the missing data. The target must be reseeded.

## Create a Dedicated, Encrypted Replication Account

On a MySQL 8.0 or 8.4 Oracle source, restrict the account to the target network:

```sql
CREATE USER 'percona_migrate'@'10.20.30.%'
  IDENTIFIED WITH caching_sha2_password
  BY '<generated-secret>'
  REQUIRE SSL;

GRANT REPLICATION SLAVE ON *.*
  TO 'percona_migrate'@'10.20.30.%';
```

`REPLICATION SLAVE` remains the privilege name for the connection account. Do not grant broad administrative privileges.

Use a secret manager and a protected administrative session. SQL clients can record statements in history, and replication connection credentials can be retained in metadata. Follow your credential-handling policy rather than pasting a production secret into a shared terminal.

For `caching_sha2_password`, use TLS with certificate validation. RSA password exchange is an alternative supported by MySQL, but an authenticated encrypted channel is the clearer production baseline.

## Seed the Target from a Consistent Snapshot

The target needs two things from the same logical point:

1. a consistent copy of data and metadata
2. the source GTID state associated with that copy

Choose a method supported by both exact server builds. Options include a logical dump, MySQL Shell dump/load, or a physical method that has been explicitly validated for the source and target versions.

A portable logical baseline for an InnoDB-focused instance is:

```bash
mysqldump \
  --host=oracle-source.example.internal \
  --user=migration_dump \
  --password \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --set-gtid-purged=ON \
  --databases app_db_1 app_db_2 \
  > mysql-migration.sql
```

Important limitations:

- Replace the example database names with every application schema in the replication scope. `--set-gtid-purged=ON` records the source's full `gtid_executed` set, including transactions for omitted schemas, so omitting an application schema can make auto-positioning skip history that was never restored.
- Do not load the source's `mysql` system schema over a target initialized by a different version or distribution. Recreate reviewed accounts and grants with account-management statements, and keep the target's own system schemas.
- `--single-transaction` gives a consistent snapshot for transactional tables such as InnoDB.
- It does not make changes to nontransactional tables consistent.
- DDL during the dump can invalidate assumptions or make the dump fail.
- Use a current `mysqldump` client supported with the source. Before MySQL 8.0.32, combining `--single-transaction` with `--set-gtid-purged=ON` could produce inconsistent output.
- Current clients require `RELOAD` or `FLUSH_TABLES` for this GTID and single-transaction combination, and require `PROCESS` unless `--no-tablespaces` is used. Grant only the privileges required by the chosen dump.
- Large instances may take too long to dump and load inside the binary log retention window.
- System accounts, definers, grants, and vendor-specific metadata need deliberate review.

Quiesce DDL and handle nontransactional tables with a tested locking or application-maintenance procedure. Do not add global locks casually to a busy source.

The `read_only` and `super_read_only` settings used to fence the target also block a logical restore made by an ordinary client session. Keep the target isolated from application traffic, then temporarily make it writable through a protected administrative session:

```sql
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
```

Load the dump through a protected connection:

```bash
mysql \
  --host=percona-target.example.internal \
  --user=migration_restore \
  --password \
  < mysql-migration.sql
```

The temporary restore account must be able to execute every statement in the dump, including its restricted GTID and binary-log session assignments. Required dynamic privileges differ across current 8.0 and 8.4 builds, so prove the account with a staged restore and revoke it after use.

Immediately restore the fence before attaching the replication channel:

```sql
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

Protect the dump as sensitive data. It can contain data, routines, and account metadata. Remove it according to the approved retention policy only after a verified backup replaces it.

For large datasets, benchmark parallel logical tooling or a supported physical seed in staging. The snapshot method changes, but the replication and cutover gates remain the same.

## Attach the Percona Target with GTID Auto-Positioning

On the target, configure the source:

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'oracle-source.example.internal',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'percona_migrate',
  SOURCE_PASSWORD = '<secret-from-vault>',
  SOURCE_AUTO_POSITION = 1,
  SOURCE_SSL = 1,
  SOURCE_SSL_CA = '/etc/mysql/tls/ca.pem',
  SOURCE_SSL_VERIFY_SERVER_CERT = 1;

START REPLICA;
```

Both receiver and applier threads must be stopped before enabling `SOURCE_AUTO_POSITION`.

Check status:

```sql
SHOW REPLICA STATUS\G
```

Confirm that:

- `Replica_IO_Running` is `Yes`
- `Replica_SQL_Running` is `Yes`
- the connection and applier errors are empty
- lag trends toward zero
- the expected source host, UUID, and TLS settings are in use

`Seconds_Behind_Source` is useful but imperfect. Also compare GTID sets and observe application-level data checks.

## Validate While Replication Runs

Run production-shaped reads on the target without sending writes. Compare:

- row counts for critical partitions
- aggregate business totals
- representative point lookups and range scans
- schema definitions, routines, events, and grants
- application query results
- p50, p95, and p99 latency
- buffer pool, disk latency, CPU, memory, and connection behavior
- backup and restore on the Percona build

Do not run unbounded checksums or table scans against production merely because they are read-only. Benchmark validation queries and throttle them.

Use a canary application instance or replayed traffic if possible. It can expose driver, collation, authentication, and optimizer differences that table counts cannot.

## Rehearse the Cutover

Write an exact runbook with named owners and abort conditions. Include:

- how applications stop accepting writes
- how background jobs, event schedulers, and migration tools are paused
- how the old source is fenced
- how a final GTID is captured
- how target catch-up is proven
- how the proxy, service discovery, or connection string changes
- how connection pools are drained
- what smoke test determines success
- the last point at which rollback is a traffic-only action

Practice the runbook against a recent restored copy and measure each step.

## Execute a Short, Controlled Write Freeze

At cutover:

1. Stop application writes and scheduled database writers.
2. Fence the old source before declaring a final checkpoint:

```sql
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

The infrastructure layer should reinforce the fence so a restart or privileged administrative action cannot silently reopen writes. Leave reads on the old source only if the runbook permits them.

3. Capture the source GTID set after the fence is active:

```sql
SELECT @@GLOBAL.gtid_executed;
```

4. Wait on the Percona target for that set:

```sql
SELECT WAIT_FOR_EXECUTED_GTID_SET('<captured-gtid-set>', 60);
```

A result of `0` means the set executed before the timeout. A result of `1` means timeout. Other failures raise an error. Do not proceed until the expected set is present and both replication threads are healthy.

5. Stop replication cleanly on the target:

```sql
STOP REPLICA;
```

6. Disable read-only mode on the new Percona source:

```sql
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
```

7. Redirect a canary, run the acceptance suite, then widen traffic.

Persist the intended read-only settings through your configuration or orchestration layer. Runtime values alone do not survive every restart.

## Understand the Rollback Boundary

Before any write reaches Percona, you can usually redirect traffic to the still-current Oracle source.

After Percona accepts writes, Oracle is stale. Sending traffic back without synchronizing data loses acknowledged transactions. If Percona is on a later release, do not assume that reverse replication to the earlier Oracle release is supported. MySQL and Percona document some 8.4-to-8.0 replication downgrade paths for rollback only, provided no new server functionality has been applied to the data; confirm cross-distribution support for the exact builds. Even at the same release family, Percona-only features can make reverse compatibility worse.

Choose one of these explicitly:

- Treat the migration as fail-forward after the first Percona write.
- Build and test a supported reverse data path before cutover, using a version pairing and feature set that can replicate backward safely.
- Restore and replay through a recovery plan with an accepted recovery point and recovery time.

Never dual-write independently to both sources as an improvised rollback. It creates conflicts and ambiguous transaction ordering.

Keep the old source fenced, monitored, and available for the approved observation window. Do not leave it writable "just in case."

## Finish the Migration

After the soak period:

- take and restore-test a fresh Percona backup
- rotate the temporary replication credential
- update monitoring and inventory distribution fields
- review Percona telemetry settings
- enable Percona-specific features one at a time with performance baselines
- retire the Oracle source through the normal data-destruction process
- remove temporary repository, firewall, and migration access
- document the exact Percona build and incorporated MySQL base version

Minimal downtime comes from doing all expensive copying and most validation before the write freeze. Safety comes from fencing, GTID proof, and an honest rollback boundary.

## Official Documentation

- [Percona Server for MySQL 8.4 documentation](https://docs.percona.com/percona-server/8.4/index.html)
- [Percona Server and MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html)
- [Percona Server upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [Percona Server downgrade paths](https://docs.percona.com/percona-server/8.4/downgrade.html)
- [MySQL upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL downgrade paths](https://dev.mysql.com/doc/refman/8.4/en/downgrading.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL GTID auto-positioning](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html)
- [MySQL online GTID enablement](https://dev.mysql.com/doc/refman/8.4/en/replication-mode-change-online-enable-gtids.html)
- [MySQL `mysqldump` reference](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [MySQL CHANGE REPLICATION SOURCE TO](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [MySQL encrypted replication connections](https://dev.mysql.com/doc/refman/8.4/en/replication-encrypted-connections.html)
- [MySQL GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html)
- [MySQL `read_only` and `super_read_only` variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_super_read_only)
