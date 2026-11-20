# Preserve Azure MySQL Scheduled Events During Dump-and-Restore Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Database Migration, Backup

Description: Preserve MySQL event definitions, owners, schedules, and time zones during an Azure migration while preventing duplicate jobs and checking restored execution safely.

A migration can copy every application row and still miss an important part of the application: scheduled database jobs. MySQL events can expire sessions, summarize transactions, or move old records without an external worker.

There are two separate migration risks. An omitted event stops useful work. An event restored onto a running scheduler can start work before the new database is ready, potentially while the source is doing the same job.

This procedure uses **MySQL 8.0.46 clients and a MySQL 8.0 target** as its example. It assumes a planned dump-and-restore outage, InnoDB application tables, and a dedicated destination server. It does not describe an online replication cutover or provide permission to overwrite an existing database.

## Inventory definitions and execution state

An event is a named SQL program with a schedule. The server-wide Event Scheduler decides whether enabled events can run. Each event also has its own enabled or disabled state. Both controls matter; an enabled event on a server with its scheduler off does not execute. See [MySQL scheduler configuration](https://dev.mysql.com/doc/refman/8.0/en/events-configuration.html).

Run this read-only inventory using an account authorized to see all events in the application schema. Replace `appdb` with your schema name.

```sql
SELECT EVENT_SCHEMA, EVENT_NAME, DEFINER, STATUS, EVENT_TYPE,
       TIME_ZONE, EXECUTE_AT, INTERVAL_VALUE, INTERVAL_FIELD,
       STARTS, ENDS, ON_COMPLETION, LAST_EXECUTED, SQL_MODE
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'appdb'
ORDER BY EVENT_NAME;

SELECT @@GLOBAL.event_scheduler AS scheduler_state;
```

Save the output before changing any event status. Check that the count agrees with the job owner's inventory; an empty result from a restricted account is not proof that the schema has no events. The [EVENTS table reference](https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html) explains these fields.

For each event, also capture its complete definition. For example, if your inventory contains `expire_sessions`:

```sql
SHOW CREATE EVENT appdb.expire_sessions;
```

The result includes the creation statement and associated SQL mode, time zone, and character-set information. Preserve that context with the body, not just the text after `DO`. See [SHOW CREATE EVENT](https://dev.mysql.com/doc/refman/8.0/en/show-create-event.html).

Record business ownership separately: which tables the event changes, which routines it calls, whether overlapping runs are safe, and how a completed run is recorded. `LAST_EXECUTED` is not a durable ledger of successfully completed business operations.

## Freeze source work and keep the destination scheduler off

Before importing anything, set the dedicated destination's `event_scheduler` parameter to `OFF` through Azure's **Server parameters** page and confirm the SQL query above returns `OFF`. Azure exposes this dynamic parameter without requiring a restart; see its [event scheduler documentation](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters#event_scheduler).

For the final migration dump, pause source application writers and scheduled work, then wait for in-flight jobs to finish. On a dedicated source, a reviewed server-wide scheduler change may be appropriate. On a shared server, coordinate individual events with their owners instead of stopping unrelated schemas' jobs.

Do not assume changing the scheduler setting proves all work has drained. Check active sessions and the application's job ledger. Freeze event definitions and schema changes too. Keep the original status inventory so intentionally disabled events stay disabled after migration.

```mermaid
flowchart LR
    A[Source jobs drained] --> B[Final dump includes events]
    B --> C[Destination scheduler OFF]
    C --> D[Verify definitions and owners]
    D --> E[Test approved event]
    E --> F[Transfer scheduling ownership]
```

## Include events explicitly in the dump

MySQL's stored-program dump options are independent: `--events` includes events, `--routines` includes procedures and functions, and `--triggers` includes triggers. Do not infer event inclusion from a successful table export. See [dumping stored programs](https://dev.mysql.com/doc/refman/8.0/en/mysqldump-stored-programs.html).

The following Bash script exports one application schema. Set `SOURCE_HOST` to its full Azure DNS name, `DUMP_USER` to the reviewed export account, and `CA_FILE` to your trusted CA bundle path. The command prompts for a password. Use a new, access-controlled working directory; the dump contains application data.

```bash
set -euo pipefail
umask 077
: "${SOURCE_HOST:?Set the source DNS name}"
: "${DUMP_USER:?Set the export account}"
: "${CA_FILE:?Set the trusted CA bundle path}"

mysqldump --host="$SOURCE_HOST" --user="$DUMP_USER" --password \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca="$CA_FILE" \
  --single-transaction --no-tablespaces --set-gtid-purged=OFF \
  --events --routines --triggers --skip-add-drop-table \
  appdb > appdb-migration.sql
```

The transactional snapshot covers InnoDB data; it does not make concurrent schema changes safe. The account needs the privileges for the objects being exported, including `EVENT`. `--set-gtid-purged=OFF` avoids importing source transaction-history state in this scoped logical migration. Review the [mysqldump options and privilege requirements](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).

If export fails, treat the output as incomplete. Do not continue because the file exists. Keep stderr and the exit status with the migration evidence.

In the [8.0.46 dump implementation](https://github.com/mysql/mysql-server/blob/mysql-8.0.46/client/mysqldump.cc), event export reads `SHOW CREATE EVENT` and preserves SQL-mode and time-zone context. The same `opt_drop` flag controls emitted event drops; disabling `--add-drop-table` also avoids those event drops in this version. This is not a general SQL safety filter: inspect the complete artifact and restore only into the prepared empty destination schema.

## Resolve owners before loading

The event's **definer** is the database account whose privileges govern execution. A syntactically valid event can fail at runtime if that account is absent or lacks access to its tables and routines. MySQL explains this in [event privileges](https://dev.mysql.com/doc/refman/8.0/en/events-privileges.html).

Agree on a destination owner and least-privilege grants. If source definers cannot be preserved on Azure, create an explicitly reviewed migration copy with the intended ownership changes. Keep the original dump unchanged. Do not use an unrestricted text replacement across SQL bodies, comments, and quoted strings.

Load that reviewed artifact only after confirming the target schema is empty, dependencies are available, and the scheduler is off. Here `TARGET_HOST`, `RESTORE_USER`, and `CA_FILE` have the same roles as their source equivalents. `appdb-reviewed.sql` is the approved copy, not an automatically generated file from the previous command.

```bash
mysql --host="$TARGET_HOST" --user="$RESTORE_USER" --password \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca="$CA_FILE" \
  --show-warnings appdb < appdb-reviewed.sql
```

Do not add `--force` to ignore errors. The [mysql client options](https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html) document warning output and batch error handling. A failed load may leave partial objects; investigate rather than rerunning over them blindly.

## Compare schedules, then prove one execution

Repeat the inventory and definition checks on the target. Compare event names, bodies, owners, schedules, status, SQL mode, time zone, and completion policy. Treat changed ownership as an approved difference, not an unnoticed side effect.

Time zones deserve explicit attention. MySQL interprets schedule times using the session time zone when the event is created or altered and retains an event time zone. Verify named-zone support and intended daylight-saving behavior on the destination. Do not silently replace a local business schedule with UTC. See [event time representation](https://dev.mysql.com/doc/refman/8.0/en/events-metadata.html).

Review one-time events and expired schedules separately. A past one-time event with `ON COMPLETION NOT PRESERVE` can be dropped immediately at creation, with a warning. Decide whether missed work should be reconciled, rescheduled, or intentionally skipped; a dump is not a replay queue. See [CREATE EVENT behavior](https://dev.mysql.com/doc/refman/8.0/en/create-event.html).

Before enabling the destination scheduler, keep unapproved events disabled. Make status changes under the intended owner or with an explicitly authorized definer clause: [ALTER EVENT can change the definer](https://dev.mysql.com/doc/refman/8.0/en/alter-event.html). Recheck ownership afterward.

With source jobs still paused, allow one approved event to run against controlled test data. Confirm the intended data change or job-ledger entry and inspect available server error logs; scheduler errors and warnings are recorded there according to the [scheduler status documentation](https://dev.mysql.com/doc/refman/8.0/en/events-status-info.html).

Finally, transfer scheduling ownership to the destination and enable only the previously approved jobs. Keep source scheduling paused throughout rollback deliberations. Reopening both schedulers without reconciling completed work can duplicate effects even when both databases contain valid event definitions.
