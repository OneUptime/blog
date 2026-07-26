# How to Configure Percona Server Audit Log Filtering and Rotation Without Filling the Disk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, Audit Log Filter, Security, Log Rotation, MySQL

Description: Install and validate Percona Server 8.4's Audit Log Filter component, assign focused filters, and bound archived log storage with component-aware rotation and pruning.

---

Percona Server 8.4 uses the `component_audit_log_filter` component as the recommended audit implementation. It stores JSON filter definitions in MySQL tables and writes audit events through a component-managed file handler.

Treat configuration as both a security control and a storage budget. A filter that accidentally logs everything can generate sustained write I/O and fill the disk; a filter that accidentally logs nothing creates a compliance gap.

This article targets the 8.4 component, not the deprecated audit-log plugin. Names, defaults, and validation behavior differ between releases. Percona Server 8.4.9-9 was not released; 8.4.10-10 is the first released build with stricter filter-definition validation and the `audit_log_filter.event_mode` variable, whose default is `REDUCED`. Check the exact server build before rollout.

## Install the Component and Its Tables

Percona recommends the supplied installation script because it creates `mysql.audit_log_filter` and `mysql.audit_log_user` before loading the component:

```bash
mysql -u root -p -D mysql \
  < /usr/share/mysql/audit_log_filter_linux_install.sql
```

Locate the actual server `share` directory if it differs.

`INSTALL COMPONENT` alone loads the binary but does **not** create the tables:

```sql
INSTALL COMPONENT 'file://component_audit_log_filter';
```

If you use that alternative, run the vendor script as well. Verify both layers:

```sql
SELECT component_urn
FROM mysql.component
WHERE component_urn = 'file://component_audit_log_filter';

SHOW TABLES IN mysql LIKE 'audit_log_%';
```

The tables `audit_log_filter` and `audit_log_user` must exist.

## Start with a Known Catch-All Test

Define and assign a filter:

```sql
SELECT audit_log_filter_set_filter(
  'log_all',
  '{"filter": {"log": true}}'
);

SELECT audit_log_filter_set_user('%', 'log_all');

SELECT audit_log_filter_flush();
```

All three calls are necessary for a deterministic reload. A stored but unassigned filter does not affect sessions, and `audit_log_filter_flush()` reloads the persisted definitions and assignments into the component. In 8.4.10-10 and later, a flush detaches existing sessions from their filters until they reconnect or run `CHANGE_USER`; earlier 8.4 builds had different active-session behavior. Coordinate production reconnects and always use a new test connection after the flush.

Generate a harmless event and verify the configured file:

```sql
SELECT @@global.audit_log_filter.file,
       @@global.audit_log_filter.format,
       @@global.audit_log_filter.strategy;

SELECT CURRENT_USER(), NOW(6);
```

Confirm that the new connection's record is present and parseable before replacing the catch-all with a selective policy.

## Define the Minimum Required Events

Audit requirements should name identities and event classes, not simply say "turn auditing on." Percona filters are JSON rooted at `filter`, with class/event/field rules.

For example, a broad connection-only filter can be structured around the `connection` event class. For table or command filters, use the canonical names from the documentation for your `audit_log_filter.event_mode`. Do not guess field names from output JSON: definition fields and output fields can differ.

Deploy new filters through:

```sql
SELECT audit_log_filter_set_filter('security_events', '<validated-json>');
SELECT audit_log_filter_set_user('app_user@%', 'security_events');
SELECT audit_log_filter_flush();
```

Important version caveats:

- host wildcards in assignment patterns are supported from Percona Server 8.4.4;
- 8.4.10-10 and later, the first released builds containing the validation changes documented for the unreleased 8.4.9-9 line, reject unknown keys, event classes, empty arrays, and invalid fields;
- earlier 8.4 builds can silently ignore misspelled structural keys and fall back to broader behavior;
- `REDUCED` mode accepts fewer event classes than `FULL`.

On every release, test positive and negative cases with new sessions: prove required actions appear and excluded high-volume actions do not.

## Configure Component Rotation

Do not use `logrotate` to rename an open audit file behind the component unless Percona explicitly documents that integration for your release. Use the component's rotation function and variables.

Rotate at 512 MiB:

```sql
SET GLOBAL audit_log_filter.rotate_on_size = 536870912;
```

The documented default is 1 GiB. Values are handled in 4096-byte blocks; a value below 4096 disables automatic rotation.

Rotate immediately:

```sql
SELECT audit_log_rotate();
```

This requires `AUDIT_ADMIN`. A successful call renames the active file and opens a new file using the configured base name.

## Bound Retained Storage

Rotation limits the active file; pruning limits the archives.

For a 4 GiB combined size cap:

```sql
SET GLOBAL audit_log_filter.max_size = 4294967296;
```

Percona recommends making `max_size` at least seven times `rotate_on_size` when both are enabled. With 512 MiB rotations, a 4 GiB cap satisfies that guidance.

Alternatively, retain seven days:

```sql
SET GLOBAL audit_log_filter.prune_seconds = 604800;
```

Size-based and age-based pruning are mutually exclusive: setting one positive clears the other. Pruning runs when the variable is set and on rotation. There is no independent background timer. If automatic rotation is disabled, schedule `audit_log_rotate()` so age pruning gets opportunities to run.

Check effective values:

```sql
SELECT
  @@global.audit_log_filter.rotate_on_size,
  @@global.audit_log_filter.max_size,
  @@global.audit_log_filter.prune_seconds;
```

Persist them in configuration management using documented option-file names, for example:

```ini
[mysqld]
audit-log-filter.rotate-on-size=536870912
audit-log-filter.max-size=4294967296
```

Confirm startup acceptance on a staging node; some component variables are dynamic while format, strategy, and other options require restart.

## Monitor Both Disk and Audit Integrity

Use the component status counters:

```sql
SHOW GLOBAL STATUS LIKE 'audit_log_filter_current_size';
SHOW GLOBAL STATUS LIKE 'audit_log_filter_events%';
SHOW GLOBAL STATUS LIKE 'audit_log_filter_write_waits';
SHOW GLOBAL STATUS LIKE 'audit_log_filter_direct_writes';
```

Alert on:

- filesystem free bytes and inode exhaustion;
- active and archived audit bytes versus the configured cap;
- a flat `events_written` counter during expected activity;
- non-zero or increasing `events_lost`;
- repeated write waits or direct writes;
- parse failures in the downstream collector;
- failed rotation or unexpected file ownership.

The default `ASYNCHRONOUS` strategy waits for buffer space but has a crash window for buffered records. `PERFORMANCE` can drop complete events when the buffer is full. In 8.4.10-10 and later, `SYNCHRONOUS` calls `fsync()` before returning audited statements and can add substantial write latency. Through 8.4.8-8, the `SYNCHRONOUS` setting did not issue the per-event `fsync()` and behaved like `SEMISYNCHRONOUS`. Choose durability deliberately and test production throughput.

If logs are shipped, deletion from the database host should depend on confirmed ingestion and retention policy. Component pruning does not know whether an external collector successfully indexed an archive.

## Roll Out Without an Audit Blind Spot

1. Install and verify the component and tables.
2. Define a temporary broad filter in staging.
3. Validate required event fields on the exact release.
4. Narrow the filter and test include/exclude cases.
5. Set rotation plus one pruning policy.
6. Connect new test sessions and verify records.
7. Load-test database latency and audit growth.
8. Alert on disk, events lost, and collector lag.
9. Remove obsolete filters only after assignments have moved.

Keep an out-of-band way to access the server if a filter or audit strategy causes load. Preserve audit files with least-privilege permissions, encryption, immutability, and retention appropriate to the threat model.

## Official Documentation

- [Install the Percona Server 8.4 Audit Log Filter](https://docs.percona.com/percona-server/8.4/install-audit-log-filter.html)
- [Audit Log Filter overview](https://docs.percona.com/percona-server/8.4/audit-log-filter-overview.html)
- [Write filter definitions](https://docs.percona.com/percona-server/8.4/write-filter-definitions.html)
- [Audit Log Filter functions, options, and variables](https://docs.percona.com/percona-server/8.4/audit-log-filter-variables.html)
- [Manage Audit Log Filter files](https://docs.percona.com/percona-server/8.4/manage-audit-log-filter.html)
- [Percona Server for MySQL 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
