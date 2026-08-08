# Upgrade PostgreSQL Without Cross-Version Physical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Physical Replication, Major Upgrade, pg_upgrade, Logical Replication, High Availability

Description: Plan a PostgreSQL major upgrade without trying to stream physical WAL between incompatible server generations or strand old standbys.

---

Physical PostgreSQL replication does not provide a rolling bridge between major versions. PostgreSQL ships storage-level WAL, and major releases can change internal formats. The official documentation says that log shipping between different major release levels is generally not possible.

Treat the primary and every physical standby as one versioned physical cluster. For a major upgrade, either upgrade the cluster during a coordinated outage with `pg_upgrade` and rebuild or synchronize its standbys, or create a separate newer cluster and migrate data through logical replication. Do not point a PostgreSQL 17 standby at a PostgreSQL 18 primary and wait for it to catch up.

## Major and Minor Upgrades Are Different

Since PostgreSQL 10, the first number is the major version. Moving 17 to 18 is a major upgrade. Moving 18.3 to 18.4 is a minor upgrade.

PostgreSQL does not change the internal storage format in a minor release. The documentation still recommends keeping primary and standby at the same release level as much as possible and says the safest minor-update order is standbys first. That advice does not authorize mixing major versions.

Confirm what is actually running on every node:

```sql
SELECT version();
SHOW server_version;
SHOW server_version_num;
```

Also record binary versions outside the server. A service unit can point at different binaries from the interactive shell:

```sh
postgres --version
pg_ctl --version
pg_upgrade --version
pg_basebackup --version
```

Inventory extensions and preload libraries because their matching new-major binaries must exist before the upgraded cluster starts:

```sql
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

SHOW shared_preload_libraries;
SHOW session_preload_libraries;
SHOW local_preload_libraries;
```

Run the extension query in every database because extensions are registered per database. The `SHOW` commands report the current session's effective settings, so also inspect configuration files and any role or database settings for `session_preload_libraries` and `local_preload_libraries`.

## Choose the Upgrade Shape Before Writing Commands

There are three supported families of major upgrade:

| Method | Typical downtime | Standby plan | Main tradeoff |
| --- | --- | --- | --- |
| Dump and restore | Long for large clusters | Build new-major standbys afterward | Simple logical boundary, slow transfer |
| `pg_upgrade` | Shorter, requires outage | Follow documented standby synchronization or rebuild | Fast, coordinated physical cutover |
| Side-by-side logical replication | Short write cutover after initial sync | New cluster builds its own new-major physical HA | More preparation and logical-replication limitations |

The right choice depends on database size, acceptable downtime, extension compatibility, storage, write rate, failback requirements, and how much operational complexity can be rehearsed.

## Plan A: Upgrade the Physical Cluster with `pg_upgrade`

`pg_upgrade` creates new system catalogs and reuses or transfers compatible user data files. It is not a live replication protocol. Both old and new primary clusters are stopped for the upgrade operation.

### 1. Rehearse Compatibility Checks

Install the target binaries and matching extension libraries, initialize the target cluster with compatible settings, and run the target version's `pg_upgrade`:

```sh
/opt/postgresql/18/bin/pg_upgrade \
  --check \
  --old-bindir=/opt/postgresql/17/bin \
  --new-bindir=/opt/postgresql/18/bin \
  --old-datadir=/var/lib/postgresql/17/data \
  --new-datadir=/var/lib/postgresql/18/data
```

If the production run will use link, clone, copy-file-range, or swap mode, pass `--link`, `--clone`, `--copy-file-range`, or `--swap` with `--check` so the mode-specific checks run.

Use paths appropriate to the installation and run as the PostgreSQL operating-system account. `--check` does not replace a rehearsal on a restored production-sized copy. Test application queries, extensions, collations, authentication, backup tools, monitoring queries, and every migration note in all intervening major release notes.

Always run the `pg_upgrade` binary from the new major release. Do not use `--no-sync` in production; the documentation describes it as useful for testing and warns that an operating-system crash can leave the new data directory corrupt.

### 2. Bring Every Old Standby Fully Current

Before the coordinated stop, confirm every standby is receiving and replaying WAL. On the old primary, inspect directly connected WAL-sender clients and identify the physical standby rows:

```sql
SELECT application_name,
       client_addr,
       state,
       sync_state,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn,
       reply_time
FROM pg_stat_replication
ORDER BY application_name;
```

`pg_stat_replication` can include WAL-sender clients other than physical standbys and does not show downstream standbys. Identify each intended physical standby by its configured name and address, require `state = 'streaming'`, and confirm its LSNs. Verify archive-only standbys on their own hosts, and in a cascading topology repeat the query on each upstream server.

At shutdown, the official `pg_upgrade` procedure requires streaming and log-shipping standbys to be running so they receive all changes. For standby-upgrade methods that reuse old standby files, it further requires verifying matching latest checkpoint locations with `pg_controldata` after shutdown.

Do not reduce this to a SQL lag check alone. Follow the exact standby steps in the `pg_upgrade` documentation for the source and target versions.

### 3. Upgrade the Primary and Handle Standbys Explicitly

After the old cluster is cleanly stopped and the rehearsed backups are verified, run the real upgrade using the selected file-transfer mode. Each mode has different rollback properties:

- default copy leaves separate old files but consumes time and space;
- clone can provide copy-on-write speed on supported filesystems while leaving the old cluster untouched;
- copy-file-range uses an optimized operating-system copy path on supported systems and, depending on the filesystem, may share physical blocks or copy them while leaving the old cluster unmodified;
- link is fast and space-efficient, but starting the new cluster makes the old linked cluster unsafe to use;
- swap destructively modifies the old cluster once file transfer starts.

Do not choose a mode based only on benchmark speed. Document the exact point after which failback requires restore rather than restart.

For physical standbys, choose one of the official paths:

- when the documented `pg_upgrade` link-mode and `rsync` prerequisites are met, synchronize each stopped standby from the old and new primary directories exactly as documented;
- otherwise, start the upgraded primary and create fresh standbys from a new-major base backup.

A typical fresh-build command is:

```sh
/opt/postgresql/18/bin/pg_basebackup \
  --host=new-primary.internal \
  --username=replicator \
  --pgdata=/var/lib/postgresql/18/data \
  --write-recovery-conf \
  --progress \
  --wal-method=stream
```

Run it into an empty target directory with correct ownership and tablespace planning. Use a permanent physical replication slot if that is part of the HA design, and verify the generated connection settings before start. A base backup taken from the old major cannot become a standby of the new-major primary.

### 4. Restore HA Before Declaring Success

After starting the new primary, run the post-upgrade scripts generated by `pg_upgrade`, update extensions as directed, refresh optimizer statistics where required, and synchronize or rebuild every standby according to the selected path. For streaming standbys, run this query on every upstream server to verify its directly connected standbys:

```sql
SELECT application_name,
       state,
       sync_state,
       sent_lsn,
       flush_lsn,
       replay_lsn
FROM pg_stat_replication
ORDER BY application_name;
```

Verify any archive-only standby on its own host.

Do not end the maintenance window merely because the primary accepts connections. Decide whether service may reopen before the required number of new-major standbys are caught up and eligible for failover.

## Plan B: Build a New Major Cluster with Logical Replication

PostgreSQL explicitly supports logical replication between different major versions and documents it as an upgrade method. The common shape is an old-major publisher feeding a new-major subscriber while applications continue using the old writer.

This is not a physical standby. It is a second, independently initialized cluster with its own catalogs, configuration, WAL, sequences, extensions, and future physical standbys.

### 1. Build the Target Schema Deliberately

Use the newer `pg_dump` client where supported to extract schema, then review it against target-version behavior:

```sh
/opt/postgresql/18/bin/pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --dbname=appdb \
  > appdb-schema.sql
```

Create roles, extensions, tables, indexes, constraints, and privileges on the new cluster in a tested order. Logical replication does not copy DDL, sequence state, large objects, or non-table relations. Tables and columns must map according to PostgreSQL's logical-replication rules.

### 2. Publish Only a Verified Data Contract

On the old cluster:

```sql
CREATE PUBLICATION upgrade_pub
FOR TABLE public.customers, public.orders, public.order_items;
```

Every table that publishes updates or deletes needs a replica identity. Review row filters, partitions, generated columns, and column lists against both versions. Do not use `FOR ALL TABLES` merely to avoid an inventory; unsupported or forgotten objects are exactly what an upgrade rehearsal should expose.

On the new cluster:

```sql
CREATE SUBSCRIPTION upgrade_sub
CONNECTION 'host=old-primary.internal dbname=appdb user=logical_replicator sslmode=verify-full'
PUBLICATION upgrade_pub
WITH (copy_data = true, binary = false);
```

Text transfer is generally more portable across versions. PostgreSQL documents binary mode as type-specific and less portable; initial synchronization can fail when a send or receive function is unavailable on one side.

### 3. Let Initial Copy Finish and Build New-Major HA

Track per-table state on the new subscriber:

```sql
SELECT n.nspname,
       c.relname,
       r.srsubstate,
       r.srsublsn
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
JOIN pg_class AS c ON c.oid = r.srrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE s.subname = 'upgrade_sub'
ORDER BY n.nspname, c.relname;
```

All expected tables must reach `r`. While copying, monitor the subscription's main and table-synchronization slots plus disk usage because lagging slots can retain substantial WAL.

Build physical standbys from the new-major cluster before cutover if the availability objective requires them. These standbys must be based on the new cluster, not inherited from the old primary.

### 4. Perform a Fenced Cutover

At cutover:

1. Stop every old-cluster writer, including jobs and direct access.
2. Capture a final source position and wait for logical apply.
3. Verify business canaries and table-level consistency.
4. Synchronize all sequence values on the new cluster.
5. Disable or otherwise freeze the old-to-new subscription according to the tested topology.
6. Switch application endpoints and open writes on only the new cluster.

Sequences are a mandatory separate step because their state is not replicated. Large objects and schema changes made during the migration window also need explicit handling.

### 5. Design Failback Before Cutover

Keeping the old cluster powered off does not make it an up-to-date rollback target after the new cluster accepts writes. Reversing changes from a newer publisher to an older subscriber can encounter feature, schema, datatype, and protocol constraints and must be tested as its own migration.

Use a decision deadline: before new writes, routing can often return to the old writer; after new writes, failback requires a validated reverse replication or data reconciliation process. Never start both as writable primaries and hope logical replication resolves conflicts.

## Do Not Confuse Three Different Upgrade Scenarios

### Physical Cluster Major Upgrade

The primary and physical standbys cross the major boundary together through `pg_upgrade`, documented file synchronization, or fresh base backups. There is no cross-major physical stream.

### Side-by-Side Logical Migration

An old cluster logically publishes table changes to a separate new cluster. This provides a low-downtime migration bridge but does not carry every database object or sequence state.

### Upgrading an Existing Logical-Replication Topology

PostgreSQL 18 has specific `pg_upgrade` support for preserving logical slots and subscription dependencies when every old topology member is PostgreSQL 17 or later and detailed prerequisites are met. That is different from creating a new cross-version migration subscription. On old clusters before PostgreSQL 17, logical slots and subscription dependencies are silently ignored by `pg_upgrade`; follow the version-specific upgrade chapter.

## Pre-Cutover Checklist

- all nodes, binaries, extensions, and backup tools inventoried;
- every intervening major release migration note reviewed;
- `pg_upgrade --check` and full rehearsal completed if using `pg_upgrade`;
- old standbys caught up and their upgrade or rebuild path tested;
- target configuration, authentication, TLS, archiving, monitoring, and backups tested;
- logical publication coverage, identities, table states, sequences, DDL, and large objects handled if using logical migration;
- new-major physical standbys healthy before service restoration if required;
- rollback boundary and post-write failback procedure documented;
- old primary fencing tested so split brain cannot occur.

## Official Documentation

- [PostgreSQL upgrading a cluster](https://www.postgresql.org/docs/current/upgrading.html)
- [PostgreSQL `pg_upgrade`](https://www.postgresql.org/docs/current/pgupgrade.html)
- [PostgreSQL warm standby planning](https://www.postgresql.org/docs/current/warm-standby.html#STANDBY-PLANNING)
- [PostgreSQL `pg_basebackup`](https://www.postgresql.org/docs/current/app-pgbasebackup.html)
- [PostgreSQL logical replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL upgrading logical replication clusters](https://www.postgresql.org/docs/current/logical-replication-upgrade.html)

## Conclusion

Physical replication is a same-major availability mechanism, not a major-upgrade bridge. Upgrade the entire physical cluster through a coordinated `pg_upgrade` plan and rebuild its standbys, or migrate into a separately initialized newer cluster through logical replication. In either design, restore standby coverage, prove data continuity, fence the old writer, and define the failback boundary before applications move.
