# How to Plan a Low-Downtime Percona Server 8.0-to-8.4 Upgrade with Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Database Upgrade, Replication, High Availability

Description: Upgrade a Percona 8.0 replication topology to 8.4 by rotating replicas first, fencing writes, and promoting only after verified catch-up.

---

A Percona Server 8.0-to-8.4 rolling upgrade can keep the database available for most of the work. Each replica is upgraded and validated while the 8.0 source continues serving writes. The only unavoidable application interruption is the controlled source switchover, plus any connection-drain time imposed by the application or proxy.

The safe ordering comes from MySQL's replication compatibility rule:

- replication from the older 8.0 source to a newer 8.4 replica is supported for this valid upgrade path
- replication from a newer 8.4 source to an older 8.0 replica is not supported

Therefore, upgrade every replica before promoting an 8.4 source.

## Scope the Topology

Draw every source, replica, relay, delayed replica, backup node, and read endpoint. For a chained topology:

```text
source-80
  |
  +-- replica-80-a
  |      |
  |      +-- leaf-80-a1
  |
  +-- replica-80-b
```

Upgrade from the farthest leaves upward. MySQL's rolling procedure explicitly requires bottom-up ordering for replicas of replicas.

Also inventory:

- multi-source channels
- replicas managed by Orchestrator or another failover system
- read traffic and backup jobs on each node
- binary log retention at each tier
- semisynchronous replication configuration
- replication filters
- GTID mode
- server UUIDs and IDs
- promotion eligibility

MySQL does not support more than two server versions in a multi-source replication setup. Keep the mixed-version interval controlled and short.

## Establish Entry Criteria

Do not start with an unhealthy topology. Require:

- no replication receiver or applier errors
- lag at the normal baseline
- tested backups and restores
- enough capacity to remove one replica at a time
- current 8.0 patch releases appropriate for upgrade
- a recent MySQL Shell Upgrade Checker result
- all applications tested with an 8.4 replica
- an approved source-fencing mechanism
- a failover runbook rehearsed in staging

Capture current identity and replication configuration:

```sql
SELECT
  VERSION(),
  @@version_comment,
  @@server_uuid,
  @@server_id,
  @@gtid_mode,
  @@enforce_gtid_consistency,
  @@binlog_format,
  @@replica_parallel_workers,
  @@replica_preserve_commit_order;

SHOW REPLICA STATUS\G
```

Run the identity query on every node. `SHOW REPLICA STATUS` returns no row on a source without a channel.

## Resolve 8.4 Compatibility Before Rotation

Percona's 8.4 checklist identifies changes that can break an otherwise healthy upgrade:

- `mysql_native_password` is disabled by default in 8.4, though it still exists as a temporary compatibility option
- `default_authentication_plugin` is removed
- legacy MASTER/SLAVE statements and several old counters are removed
- `expire_logs_days` is replaced by `binlog_expire_logs_seconds`
- `WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS()` is removed
- defaults for several InnoDB and temporary-table settings changed
- some plugins transition to components
- new reserved words can conflict with schemas and queries

Update monitoring, failover scripts, and automation to use:

```text
SHOW REPLICA STATUS
START REPLICA
STOP REPLICA
CHANGE REPLICATION SOURCE TO
```

Do this while still on 8.0, where both operational procedures can be tested before 8.4 removes old forms.

Inventory native-password accounts:

```sql
SELECT user, host, plugin
FROM mysql.user
WHERE plugin = 'mysql_native_password'
ORDER BY user, host;
```

Upgrade connectors and migrate accounts to `caching_sha2_password`. If temporary compatibility is unavoidable, start 8.4 with:

```ini
[mysqld]
mysql_native_password=ON
```

Record an owner and removal date. MySQL 8.4 disables this plugin by default; MySQL removed it as of MySQL 9.0.0.

## Rehearse One Replica from a Restore

Before rotating a production node:

1. restore a current backup into an isolated 8.0 instance
2. run the upgrade checker with the exact 8.4 target
3. apply the 8.4 package procedure
4. review the complete error log
5. run application and data tests
6. take an 8.4 backup and restore it
7. compare performance with the 8.0 baseline

Use the same operating system, package repositories, option files, plugins, and service controls as production.

The target server automatically performs required MySQL upgrade work on startup. Starting successfully is only the first gate.

## Rotate an Individual Replica

Use the least critical, non-promotion replica as the first canary.

### Remove Workload and Automation

- remove it from read pools
- pause backup jobs on that node
- disable automated promotion for that node
- verify no application writes can reach it
- keep the 8.0 source and other replicas unchanged

### Confirm Health and Capture State

```sql
SHOW REPLICA STATUS\G
SELECT @@GLOBAL.gtid_executed;
```

Do not upgrade a replica with hidden applier errors or an unexplained GTID difference.

### Stop Replication and the Service Cleanly

```sql
STOP REPLICA;
```

Then stop the server:

```bash
sudo systemctl stop mysql
```

Follow Percona's current repository-based or standalone-package upgrade procedure for the exact platform. Back up `my.cnf`, remove options that 8.4 no longer accepts, and ensure only the approved 8.4 LTS repository is selected.

### Start and Inspect the 8.4 Node

```bash
sudo systemctl start mysql
systemctl status mysql --no-pager
journalctl -u mysql --since '-15 minutes' --no-pager
```

Verify identity before restarting replication:

```sql
SELECT VERSION(), @@version_comment, @@server_uuid, @@server_id;
```

The UUID and server ID must still identify this topology member uniquely.

Start the channel:

```sql
START REPLICA;
SHOW REPLICA STATUS\G
```

The 8.4 replica may need time to warm its buffer pool and apply transactions accumulated while it was offline. Do not call that steady-state regression immediately.

### Validate Before Returning It

Require:

- both replication threads healthy
- no worker errors in Performance Schema
- GTID catch-up
- expected TLS and source identity
- representative application reads
- read-after-write behavior that matches the service contract
- normal resource and latency trends after warm-up
- successful backup from the 8.4 node

Keep the first canary on 8.4 for an observation period before rotating the rest.

## Upgrade Every Replica, Bottom-Up

Repeat the procedure one node at a time. For a relay:

1. upgrade its leaf replicas
2. validate the leaves while the relay remains 8.0
3. upgrade the relay
4. restore its downstream channels

Do not promote an upgraded node yet. While any downstream replica remains 8.0, the writable source must remain 8.0.

Maintain capacity. If one remaining replica cannot handle read traffic plus replication while another is offline, add capacity before the upgrade rather than accepting uncontrolled overload.

## Prepare the Source Switchover

After every replica is on 8.4, select a promotion target based on:

- zero errors and stable lag
- full data validation
- sufficient write capacity
- correct binary logging and `log_replica_updates`
- current backups
- tested routing and fencing
- failure-domain placement

Record the source's current GTID set:

```sql
SELECT @@GLOBAL.gtid_executed;
```

Rehearse proxy or service-discovery changes without moving write traffic. Lower DNS TTL well in advance if DNS is part of the cutover; changing it during the incident does not expire existing caches.

## Execute the Cutover

### Stop Writers

Pause:

- application write endpoints
- workers and queues
- scheduled jobs
- schema migration systems
- database event schedulers if ownership is changing

Drain or close old connection pools so they cannot continue writing after routing changes.

### Fence the Old Source

```sql
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;
```

The infrastructure layer should also fence it. Database variables alone do not protect against every administrative action or restart.

### Capture and Wait for the Final GTID Set

Capture the final set only after the old source is fenced. On the old 8.0 source:

```sql
SELECT @@GLOBAL.gtid_executed;
```

On the chosen 8.4 target:

```sql
SELECT WAIT_FOR_EXECUTED_GTID_SET('<captured-gtid-set>', 60);
```

Proceed only when the function reports success and replication has no receiver or applier error. Fencing before the capture prevents a late transaction from committing on the old source after the checkpoint has already been declared final.

### Detach and Promote the 8.4 Target

Stop its old replication channel cleanly:

```sql
STOP REPLICA;
```

Do not issue `RESET REPLICA ALL` during the cutover. Keeping channel metadata makes investigation and controlled recovery easier.

Before accepting new writes, repoint at least one other validated 8.4 replica to the promotion target. The target must already have binary logging and `log_replica_updates` enabled, and the replication account and TLS identity must be valid there. On the downstream replica:

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'new-source-84.example.internal',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'replication_user',
  SOURCE_PASSWORD = '<secret-from-vault>',
  SOURCE_AUTO_POSITION = 1,
  SOURCE_SSL = 1,
  SOURCE_SSL_CA = '/etc/mysql/tls/ca.pem',
  SOURCE_SSL_VERIFY_SERVER_CERT = 1;

START REPLICA;
SHOW REPLICA STATUS\G
```

GTID auto-positioning lets the downstream node request the transactions it is missing. Verify both replication threads and the new source UUID. Repoint the other 8.4 replicas through the same controlled procedure.

Enable writes on the promoted target:

```sql
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
```

Redirect a canary application instance, run the acceptance suite, then widen traffic. Monitor errors, latency, connections, durability, disk, replication to the remaining 8.4 nodes, and business-level write confirmation.

## Upgrade the Old Source Before Rejoining It

The old 8.0 source must remain outside the writable topology. Upgrade it to 8.4 as a single instance, then configure it as a replica of the new 8.4 source using GTID auto-positioning.

Only after it catches up and passes validation should it become read or promotion capacity again.

Never attach the old 8.0 node downstream of the new 8.4 source. MySQL does not support that later-release-to-earlier-release direction.

## Treat Post-Cutover Rollback Honestly

Before the first write on 8.4, traffic can return to the still-current 8.0 source.

After the first new write, the 8.0 source is stale. In-place downgrade is not a general rollback, and replication from 8.4 back to 8.0 is not supported. The safe strategy becomes:

- fix forward on 8.4
- fail over to another validated 8.4 node
- restore through a measured recovery procedure

Keep a tested 8.0 backup for pre-cutover recovery and create a fresh 8.4 backup after promotion.

## Define Completion

The upgrade is complete when:

- all nodes run the approved Percona 8.4 build
- all channels are healthy and use current syntax
- every service account uses the intended authentication
- the old source is upgraded or retired
- backups restore on 8.4
- failover has been exercised
- performance is compared against the 8.0 baseline
- temporary native-password compatibility is removed or has a tracked deadline
- monitoring and runbooks no longer reference removed variables or terminology

Low downtime comes from doing expensive work on replicas. Correctness comes from version ordering, GTID catch-up, write fencing, and refusing to send 8.4 transactions to an 8.0 replica.

## Official Documentation

- [Percona Server 8.0 to 8.4 upgrade overview](https://docs.percona.com/percona-server/8.4/upgrade.html)
- [Percona Server 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [Percona Server 8.4 upgrade procedures](https://docs.percona.com/percona-server/8.4/upgrade-procedures.html)
- [Percona Server upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL upgrading or downgrading a replication topology](https://dev.mysql.com/doc/refman/8.4/en/replication-upgrade.html)
- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [MySQL WAIT_FOR_EXECUTED_GTID_SET](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html#function_wait-for-executed-gtid-set)
- [MySQL CHANGE REPLICATION SOURCE TO](https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html)
