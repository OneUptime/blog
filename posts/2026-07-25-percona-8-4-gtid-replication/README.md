# How to Set Up GTID-Based Source-Replica Replication on Percona Server 8.4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, GTID, Replication, Database Operations

Description: Configure an encrypted Percona Server 8.4 GTID replication channel with unique identities, consistent seeding, and verifiable catch-up.

---

Global transaction identifiers give each committed transaction a durable identity across a replication topology. With GTID auto-positioning, a replica tells the source which transactions it has already executed, and the source sends the missing set. Operators no longer need to choose a binary-log file and offset when changing sources.

GTIDs simplify positioning. They do not provide automatic failover, prevent every data divergence, or replace write fencing. A safe setup still needs:

- unique server identities
- a consistent initial data copy
- enough binary-log retention
- encrypted replication credentials
- a read-only replica
- monitoring and tested recovery

This guide uses one new Percona Server 8.4 source and one replica. For an existing non-GTID topology, follow MySQL's online GTID transition instead of jumping directly to the final configuration.

## Plan Identity, Names, and Network Access

Assign unique nonzero server IDs:

```text
source:  server_id=101
replica: server_id=102
```

MySQL also generates `server_uuid` in the data directory. Both servers must have different UUIDs. Check:

```sql
SELECT @@server_id, @@server_uuid, @@hostname, @@port;
```

Do not run two filesystem copies of the same data directory without resolving duplicate identity through a documented provisioning method. A duplicate UUID can stop replication and makes topology reasoning unsafe.

Create stable DNS names and certificates. The replica needs outbound TCP access to the source's MySQL port. The source should accept that port only from approved replica networks or hosts.

## Configure GTIDs on Both Servers

On the source:

```ini
[mysqld]
server_id=101
gtid_mode=ON
enforce_gtid_consistency=ON
binlog_format=ROW
binlog_expire_logs_seconds=604800
```

On the replica:

```ini
[mysqld]
server_id=102
gtid_mode=ON
enforce_gtid_consistency=ON
binlog_format=ROW
skip_replica_start=ON
read_only=ON
super_read_only=ON
```

The seven-day binary-log retention value is only an example. Size it from the longest expected outage, seed duration, backup window, incident response time, and disk capacity.

MySQL 8.4 enables binary logging and row format by default in normal package installations, but make the intended replication contract explicit and verify it. A source must have binary logging.

Restart each server through the service manager:

```bash
sudo systemctl restart mysql
```

Verify:

```sql
SELECT
  @@server_id,
  @@server_uuid,
  @@gtid_mode,
  @@enforce_gtid_consistency,
  @@log_bin,
  @@binlog_format,
  @@log_replica_updates,
  @@read_only,
  @@super_read_only;
```

On the source, `read_only` and `super_read_only` should reflect the source's role. On the replica, both should remain enabled.

## Do Not Skip the Online Transition States

If a live topology currently has `gtid_mode=OFF`, MySQL's online enablement procedure moves all servers through:

```text
OFF
-> OFF_PERMISSIVE
-> ON_PERMISSIVE
-> ON
```

It first enables `enforce_gtid_consistency`, checks for incompatible workload, and waits for anonymous transactions to drain. Complete each step on every topology member before moving to the next.

Do not set `gtid_mode=ON` on one live member and improvise the rest. Follow the official procedure, including its backup implications.

## Create a Least-Privilege Replication Account

On the source:

```sql
CREATE USER 'repl'@'10.20.30.%'
  IDENTIFIED WITH caching_sha2_password
  BY '<generated-secret>'
  REQUIRE SSL;

GRANT REPLICATION SLAVE ON *.*
  TO 'repl'@'10.20.30.%';
```

Restrict the host pattern more tightly when stable replica addresses permit it. `REPLICATION SLAVE` remains the connection privilege name in MySQL 8.4.

Percona Server 8.4 uses `caching_sha2_password` for modern accounts. MySQL requires either a secure connection or RSA-based password exchange for full authentication with this plugin. Use verified TLS for production replication.

Store the password in the approved secret manager. SQL clients can record statements in history, and the replication channel needs a credential for unattended reconnects. Restrict access to both administrative history and replication metadata.

## Provision the Replica from a Consistent State

Auto-positioning does not copy historical tables. The replica must start with data and GTID state from the same snapshot.

For an empty source with no committed application transactions, both servers can begin empty. For an existing source, use a supported snapshot method:

- a consistent logical dump and load
- MySQL Shell dump and load
- MySQL Clone
- a physical backup method supported for the exact Percona builds

For an InnoDB-focused logical snapshot:

```bash
mysqldump \
  --host=source.example.internal \
  --user=backup_operator \
  --password \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --set-gtid-purged=ON \
  --all-databases \
  > initial-replica.sql
```

The `read_only` and `super_read_only` settings in the replica configuration also block this client-driven restore. Keep the server isolated from application traffic, then temporarily make it writable through an administrative session:

```sql
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
```

Load the dump:

```bash
mysql \
  --host=replica.example.internal \
  --user=restore_operator \
  --password \
  < initial-replica.sql
```

Re-enable the fence immediately after the load and before configuring the channel:

```sql
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

Important:

- quiesce DDL during a logical snapshot
- handle nontransactional tables separately
- protect the dump as sensitive data
- keep source binary logs until the replica is attached and caught up
- do not manually set `gtid_purged` unless the snapshot procedure requires it and the resulting set has been verified

`RESET BINARY LOGS AND GTIDS` clears GTID history. It is not a routine fix for setup errors.

## Configure Auto-Positioning and TLS

On the replica, confirm no channel is running:

```sql
STOP REPLICA;
```

For a new default channel, `STOP REPLICA` may report that threads are not running. That is expected. Do not use `RESET REPLICA ALL` on a channel whose metadata you may need.

Configure:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source.example.internal',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = '<secret-from-vault>',
  SOURCE_AUTO_POSITION = 1,
  SOURCE_SSL = 1,
  SOURCE_SSL_CA = '/etc/mysql/tls/ca.pem',
  SOURCE_SSL_VERIFY_SERVER_CERT = 1;
```

Both receiver and applier threads must be stopped before a change that enables `SOURCE_AUTO_POSITION`.

`SOURCE_SSL=1` requires an encrypted connection. `SOURCE_SSL_CA` supplies the trusted certificate authority, and `SOURCE_SSL_VERIFY_SERVER_CERT=1` verifies source identity. Ensure the source name in `SOURCE_HOST` matches the certificate.

Start:

```sql
START REPLICA;
SHOW REPLICA STATUS\G
```

## Verify More Than Two Boolean Fields

`Replica_IO_Running: Yes` and `Replica_SQL_Running: Yes` are necessary, not sufficient.

Check receiver identity and errors:

```sql
SELECT
  CHANNEL_NAME,
  SOURCE_UUID,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_HEARTBEAT_TIMESTAMP,
  LAST_QUEUED_TRANSACTION,
  RECEIVED_TRANSACTION_SET
FROM performance_schema.replication_connection_status;
```

Check appliers:

```sql
SELECT
  CHANNEL_NAME,
  WORKER_ID,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_APPLIED_TRANSACTION,
  APPLYING_TRANSACTION
FROM performance_schema.replication_applier_status_by_worker
ORDER BY CHANNEL_NAME, WORKER_ID;
```

Confirm:

- source UUID matches inventory
- receiver and applier services are on
- error numbers are zero and messages empty
- retrieved GTIDs advance after a source write
- executed GTIDs catch up
- the replica remains read-only

## Run an End-to-End Sentinel Test

On the source, in a dedicated test schema approved for this purpose:

```sql
CREATE DATABASE IF NOT EXISTS replication_check;

CREATE TABLE IF NOT EXISTS replication_check.sentinel (
  id BIGINT PRIMARY KEY,
  written_at TIMESTAMP(6) NOT NULL
);

INSERT INTO replication_check.sentinel (id, written_at)
VALUES (1, NOW(6))
ON DUPLICATE KEY UPDATE written_at = NOW(6);
```

Capture the source GTID set:

```sql
SELECT @@GLOBAL.gtid_executed;
```

On the replica:

```sql
SELECT WAIT_FOR_EXECUTED_GTID_SET('<captured-gtid-set>', 30);

SELECT *
FROM replication_check.sentinel
WHERE id = 1;
```

`WAIT_FOR_EXECUTED_GTID_SET` returns `0` on success before the timeout, `1` on timeout, and `NULL` on error.

Remove the test schema only through the approved schema lifecycle. A `DROP DATABASE` on the source replicates too, so confirm that no other test data shares it.

## Configure Parallel Apply with a Baseline

MySQL 8.4 uses four replica workers by default:

```sql
SELECT
  @@replica_parallel_workers,
  @@replica_parallel_type,
  @@replica_preserve_commit_order;
```

The normal values are four workers, `LOGICAL_CLOCK`, and commit-order preservation enabled. Keep the defaults initially and measure. Raise workers only when the applier is proven to be the bottleneck and the workload has usable parallelism.

Tables should have primary keys. Row-based replication applies updates and deletes more efficiently when it can locate rows by a primary or suitable unique key.

## Plan Binary-Log Retention and Reseeding

During the initial GTID handshake, the replica sends its executed GTID set. The source finds missing transactions and sends them. If the source has purged a required GTID, replication fails with a fatal error.

The correct responses are:

- restore the missing binary logs through an approved recovery method, or
- take a new consistent snapshot and reseed the replica

Do not insert empty GTIDs simply to silence the error unless an incident process has proven the transaction can be skipped. Skipping marks a transaction as executed without applying its data.

Alert on retention disk use and the oldest binary log needed by any replica.

## Prevent Errant GTIDs

An errant GTID is a transaction present on a replica but not its intended source. Common causes include accidental direct writes and local administrative changes with binary logging enabled.

Keep:

```ini
[mysqld]
read_only=ON
super_read_only=ON
```

Restrict application credentials so they cannot reach replicas directly. Route operational DDL through the source. Before a failover, compare GTID sets and investigate differences.

GTID auto-skip prevents the same GTID from executing twice. It does not decide whether an unexpected unique GTID was legitimate.

## Test Restart and Failure Behavior

After initial validation:

1. restart the replica in an approved window
2. confirm `skip_replica_start=ON` behaves as intended
3. start replication explicitly
4. verify TLS and source identity again
5. create another sentinel transaction
6. confirm auto-positioning resumes correctly

Whether replication should auto-start is an operational decision. `skip_replica_start=ON` prevents an unvalidated node from reconnecting immediately after maintenance, but requires automation or an operator to start it.

Also test a controlled source switch in staging. GTIDs simplify source positioning, but orchestration still has to fence the former source and prevent split brain.

## Common Setup Failures

### Duplicate Server ID or UUID

Assign a unique `server_id` and provision a unique `server_uuid`. Do not start both copies until identity is correct.

### Authentication Fails with `caching_sha2_password`

Verify current connectors, TLS CA path, certificate hostname, and replication user host match. Use RSA password exchange only when the security design approves an unencrypted connection.

### Required GTIDs Were Purged

Increase retention for future outages and reseed from a current consistent snapshot.

### Replica Has Data but No Matching GTID State

Repeat provisioning with a method that transfers data and its GTID set together. Do not guess `gtid_purged`.

### Workers Stop with a Data Error

Inspect `LAST_ERROR_NUMBER`, `LAST_ERROR_MESSAGE`, and the applying GTID. Determine why source and replica differ before skipping anything.

## Back Up the New Topology

MySQL's GTID setup guidance calls for a new backup after GTID enablement because old anonymous binary logs and pre-transition backups may not fit the new recovery chain.

Take a full backup, restore it to an isolated Percona Server 8.4 instance, and verify:

- GTID state
- application data
- accounts and routines
- binary-log replay
- time to recover

Replication is not a backup. It faithfully copies accidental deletes and many forms of corruption.

## Official Documentation

- [MySQL setting up replication using GTIDs](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-howto.html)
- [MySQL GTID format and storage](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-concepts.html)
- [MySQL GTID auto-positioning](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-auto-positioning.html)
- [MySQL online GTID enablement](https://dev.mysql.com/doc/refman/8.4/en/replication-mode-change-online-enable-gtids.html)
- [MySQL global transaction ID variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-gtids.html)
- [MySQL CHANGE REPLICATION SOURCE TO](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
- [MySQL encrypted replication connections](https://dev.mysql.com/doc/refman/8.4/en/replication-encrypted-connections.html)
- [MySQL checking replication status](https://dev.mysql.com/doc/refman/8.4/en/replication-administration-status.html)
- [MySQL `read_only` and `super_read_only` variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_super_read_only)
