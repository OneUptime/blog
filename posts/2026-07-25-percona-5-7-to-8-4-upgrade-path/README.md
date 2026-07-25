# Percona Server 5.7 to 8.4: Why You Must Upgrade Through MySQL 8.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Database Upgrade, MySQL 8.0, MySQL 8.4

Description: Plan the required two-stage Percona Server upgrade from 5.7 through 8.0 to 8.4, with compatibility gates and recoverable cutovers.

---

Percona Server 5.7 cannot be upgraded directly to Percona Server 8.4. MySQL's official upgrade-path matrix says a 5.7 server moving to 8.4 must first upgrade to the 8.0 LTS series, then upgrade from 8.0 to 8.4 LTS.

The required path is:

```text
latest supported 5.7
        |
        v
latest appropriate 8.0
        |
        v
current Percona Server 8.4 LTS
```

This is not a packaging inconvenience. MySQL 8.0 performs a major data-dictionary and system-schema transition. MySQL 8.4 then removes and changes interfaces from the 8.0 era. The server upgrade machinery is designed and tested around those adjacent release-family transitions.

Replication does not bypass the rule. A 5.7 source feeding an 8.4 replica skips an unsupported upgrade path, so it is not the approved bridge.

## Why the Intermediate Release Is Required

MySQL 5.7 stores metadata and operates system tables differently from MySQL 8.0. MySQL 8.0 introduces, among other changes:

- a transactional data dictionary
- automatic server-driven upgrade work
- atomic DDL
- changed defaults and SQL behavior
- removed 5.7 features and variables
- different authentication and account-management behavior
- changed character-set and collation defaults

MySQL 8.4 assumes the installation has already passed through an 8.0-compatible state. It then adds its own changes, including removed legacy replication syntax, changed defaults, removed variables, and native-password authentication being disabled by default.

The intermediate 8.0 stage gives the server a supported point at which to transform and validate metadata before the 8.4 transition.

## Do Not Combine Both Stages into One Maintenance Window

Even if a lab upgrade can start 5.7, then 8.0, then 8.4 in sequence, production should treat them as two projects:

1. migrate or upgrade 5.7 to 8.0
2. validate and operate 8.0 long enough to expose workload problems
3. take a fresh, restore-tested 8.0 backup
4. migrate or upgrade 8.0 to 8.4

An immediate second upgrade erases the ability to tell which transition introduced a regression. It also concentrates two sets of application, authentication, optimizer, and operational changes into one rollback decision.

## Prefer Side-by-Side Environments

An in-place upgrade replaces binaries around the same data directory. It can be faster, but rollback depends on restoring a pre-upgrade backup because the old binary cannot safely reclaim a data directory upgraded by a newer release.

A side-by-side migration creates a new target and moves data using a logical load or supported replication path:

```text
Phase 1: 5.7 source -> 8.0 target
Phase 2: 8.0 source -> 8.4 target
```

It costs more infrastructure but provides:

- production-like rehearsal
- an intact old source at each cutover
- independent operating-system upgrades
- workload comparison before promotion
- a smaller traffic switch

Percona's 8.4 upgrade guidance treats in-place upgrade as the higher-risk option and recommends testing in a separate environment.

## Phase 0: Stabilize Percona Server 5.7

Before the first major upgrade:

- move to the latest supported 5.7 patch level required by the upgrade documentation
- eliminate replication errors and unexplained lag
- confirm all tables are healthy
- record exact Percona and upstream base versions
- take a full backup and perform a restore
- capture configuration and effective variables
- inventory plugins, engines, routines, events, grants, and authentication
- measure workload latency, throughput, and resource use

Do not start a major upgrade while the source is already degraded. An upgrade changes too many variables to serve as a repair procedure.

Record a baseline:

```sql
SELECT
  VERSION(),
  @@version_comment,
  @@server_uuid,
  @@gtid_mode,
  @@binlog_format,
  @@character_set_server,
  @@collation_server;

SELECT ENGINE, COUNT(*)
FROM information_schema.tables
WHERE TABLE_SCHEMA NOT IN
  ('information_schema', 'mysql', 'performance_schema', 'sys')
GROUP BY ENGINE;
```

## Gate 1: Check 5.7 Readiness for 8.0

Use the MySQL Shell Upgrade Checker with an explicit target supported by the Shell version. In a protected administrative session, the pattern is:

```javascript
util.checkForServerUpgrade(
  "upgrade_checker@mysql57.example.internal:3306",
  {
    targetVersion: "8.0.x"
  }
)
```

Replace `8.0.x` with the exact planned target version. With no password in the connection data or options dictionary, MySQL Shell prompts for it. Review the current MySQL Shell target support before running the check.

The checker automates known checks, but it cannot prove application compatibility. Also review:

- removed server variables and SQL modes
- reserved keywords used as unquoted identifiers
- old temporal or invalid data
- unsupported storage engines
- partitioning constraints
- authentication and connector versions
- routines and views whose definers no longer exist
- application assumptions about default character sets or ordering

Run the checker against a recent restored copy first. Fix issues on 5.7 where possible, then rerun it until blocking findings are gone.

## Phase 1: Move from 5.7 to 8.0

Choose one of the supported methods for the exact versions:

- in-place upgrade with a verified backup and clean shutdown
- logical dump and load into a new 8.0 instance
- replication into an 8.0 target using a supported topology

For low downtime, build a new Percona Server 8.0 target, seed it, replicate until caught up, then use a brief write freeze. Keep the 8.0 target read-only until the final GTID or file-position checkpoint is applied and application tests pass.

If using an in-place procedure, follow Percona 8.0's documented preparation and package steps. Do not start 8.0 with unreviewed 5.7-only options. Make a clean shutdown when the documented method requires it:

```sql
SET GLOBAL innodb_fast_shutdown = 0;
```

Then stop the service through the platform's service manager. A slow shutdown can take time on a busy instance; budget and monitor it.

Modern MySQL 8.0 performs required upgrade work automatically at server startup. Do not design a current procedure around a legacy manual `mysql_upgrade` invocation unless the exact target documentation requires it.

## Gate 2: Prove the 8.0 State

Do not treat "the server started" as success. Validate:

- the error log contains no unresolved upgrade errors
- applications connect with supported authentication
- schema migrations, reads, writes, and transactions behave correctly
- replication and failover procedures use current terminology
- events and scheduled jobs run once, on the intended node
- backup and point-in-time recovery work on 8.0
- query plans and service-level metrics meet the baseline
- grants and account host matching are correct
- checks on critical business data pass

Take a new full backup from the stable 8.0 service and restore it to an isolated 8.0 instance. The 5.7 backup remains a phase-one rollback artifact; the new 8.0 backup becomes the recovery foundation for phase two.

Allow an observation period appropriate to the workload. Monthly jobs, end-of-day batches, and infrequent schema changes may need a longer soak than ordinary request traffic.

## Gate 3: Check 8.0 Readiness for 8.4

Run the upgrade checker again with the exact 8.4 target:

```javascript
util.checkForServerUpgrade(
  "upgrade_checker@mysql80.example.internal:3306",
  {
    targetVersion: "8.4.x"
  }
)
```

Review Percona's 8.4 checklist in addition to the automated output. Current 8.4-sensitive items include:

- `mysql_native_password` is disabled by default, but not yet removed in 8.4
- `default_authentication_plugin` is removed
- old MASTER/SLAVE statement forms and several legacy counters are removed
- `expire_logs_days` must be replaced by `binlog_expire_logs_seconds`
- `WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS()` is replaced by `WAIT_FOR_EXECUTED_GTID_SET()`
- new reserved words can conflict with identifiers
- many server defaults differ from 8.0
- plugins may need migration to components

Inventory native-password accounts:

```sql
SELECT user, host, plugin
FROM mysql.user
WHERE plugin = 'mysql_native_password'
ORDER BY user, host;
```

Upgrade client libraries and alter accounts to `caching_sha2_password` before the 8.4 cutover where possible. Re-enabling native authentication in 8.4 is only a temporary bridge, and MySQL removed it as of MySQL 9.0.0.

## Phase 2: Move from 8.0 to 8.4

For a replication topology, upgrade replicas before the source. MySQL supports the older 8.0 source sending to the newer 8.4 replica for this supported path. It does not support the reverse direction.

The rolling order is:

1. upgrade leaf replicas first
2. validate and return each 8.4 replica to service
3. upgrade all remaining replicas
4. stop writes on the 8.0 source
5. wait for an 8.4 replica to apply all transactions
6. promote that 8.4 replica
7. keep the old 8.0 source fenced and outside the topology
8. upgrade the old source to 8.4 before reinserting it

Never promote an 8.4 source while it still has to feed an 8.0 replica. That creates the unsupported newer-source-to-older-replica direction.

## Keep Rollback Separate at Each Boundary

There are three distinct rollback points:

### Before the 8.0 Target Accepts Writes

Keep the 5.7 source authoritative and redirect traffic back if validation fails.

### After 8.0 Accepts Writes

The 5.7 source is stale. Returning to it requires a tested data movement or recovery path. An in-place downgrade from 8.0 to 5.7 is not supported.

### After 8.4 Accepts Writes

The old 8.0 source is stale, and replication from newer 8.4 back to older 8.0 is not supported. Treat the cutover as fail-forward; returning requires a tested logical data-movement or restore procedure, not reverse asynchronous replication.

Backups protect data, but restoring a large backup can exceed the intended recovery time. Measure restores instead of describing them as instant rollback.

## Avoid These Shortcuts

- Do not copy a 5.7 data directory directly under an 8.4 binary.
- Do not use a 5.7-to-8.4 replica as an undocumented upgrade mechanism.
- Do not ignore upgrade-checker errors because a test server happened to start.
- Do not keep removed configuration options and hope the server ignores them.
- Do not promote the newer source while older replicas remain downstream.
- Do not run both upgrades without an 8.0 validation and backup gate.
- Do not assume an old backup can be restored directly by every later release.

## A Practical Project Structure

Use explicit deliverables:

```text
Stage A: 5.7 inventory, restore test, and 8.0 readiness report
Stage B: rehearsed 5.7-to-8.0 runbook
Stage C: 8.0 production cutover and soak
Stage D: fresh 8.0 recovery set and 8.4 readiness report
Stage E: rehearsed 8.0-to-8.4 rolling upgrade
Stage F: 8.4 cutover, soak, and old-environment retirement
```

Each stage should have entry criteria, abort conditions, owners, measured duration, and evidence of completion. The intermediate 8.0 phase is not wasted effort. It is the supported transformation and an essential diagnostic boundary.

## Official Documentation

- [MySQL 8.4 upgrade paths](https://dev.mysql.com/doc/refman/8.4/en/upgrade-paths.html)
- [Percona Server 5.7 to 8.0 upgrade overview](https://docs.percona.com/percona-server/8.0/upgrade.html)
- [Percona Server 8.0 to 8.4 upgrade overview](https://docs.percona.com/percona-server/8.4/upgrade.html)
- [Percona Server 8.4 upgrade checklist](https://docs.percona.com/percona-server/8.4/upgrade-checklist-8.4.html)
- [Percona Server upgrade strategies](https://docs.percona.com/percona-server/8.4/upgrade-strategies.html)
- [MySQL preparing an installation for upgrade](https://dev.mysql.com/doc/refman/8.4/en/upgrade-prerequisites.html)
- [MySQL Shell upgrade checker utility](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html)
- [MySQL replication compatibility between versions](https://dev.mysql.com/doc/refman/8.4/en/replication-compatibility.html)
- [MySQL upgrading a replication topology](https://dev.mysql.com/doc/refman/8.4/en/replication-upgrade.html)
