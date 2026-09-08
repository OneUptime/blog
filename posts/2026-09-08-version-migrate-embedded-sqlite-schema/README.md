# How to Version and Migrate an Embedded SQLite Schema Across App Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Schema Migration, Database, Application Development, Data Integrity

Description: Ship ordered, transactional SQLite migrations with compatibility gates, backups, integrity checks, and safe rollout behavior.

---

An embedded application and its SQLite file are upgraded separately in failure terms. Installation can be interrupted, a user can launch an older binary, and a migration can run on a nearly full device. Treat the schema version as a compatibility contract, not as a convenient integer to increment.

## Use an application-owned version

SQLite reserves `PRAGMA user_version` for applications and does not interpret it. Use it as the schema version:

```sql
PRAGMA user_version;
PRAGMA user_version = 7;
```

Do not write `PRAGMA schema_version`. SQLite maintains that internal value for schema-change detection, and manually changing it can cause corruption or stale prepared statements.

Keep immutable, ordered migrations in source control:

```text
migrations/
  001_initial.sql
  002_add_device_state.sql
  003_rebuild_event_timestamp.sql
```

Each application release declares the lowest and highest schema versions it can safely open. If the file is newer than the binary supports, stop with a clear error. An old binary must never guess that a future schema is compatible.

## Run one migration under one write transaction

Enable connection invariants before beginning and acquire the write reservation early:

```sql
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

BEGIN IMMEDIATE;

ALTER TABLE device ADD COLUMN state TEXT NOT NULL DEFAULT 'unknown';

PRAGMA user_version = 2;
COMMIT;
```

Set `user_version` only after that migration's changes have succeeded, but inside the same transaction. On any error, roll back. Never catch a migration exception and continue startup with a partially understood schema.

`BEGIN IMMEDIATE` fails before migration work begins if another process owns the writer. Coordinate application upgrades so only one designated process migrates. Other processes should wait for that process to finish, reopen the database, and re-check the version.

## Design migrations for SQLite's ALTER TABLE behavior

SQLite supports renaming a table, renaming a column, adding a column, and dropping a column, subject to version and constraint rules. SQLite 3.53.0 also added `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` and `DROP NOT NULL`. Gate migrations that use a newer operation on `sqlite_version()` for every binary that might run that migration. Track read compatibility for binaries that later open the file as a separate policy. Other changes usually require rebuilding the table.

Follow SQLite's documented generalized ALTER TABLE procedure exactly. When foreign-key enforcement is enabled, its safe sequence is:

1. record that foreign keys are enabled, then run `PRAGMA foreign_keys=OFF` before starting a transaction;
2. begin the write transaction and save the definitions of dependent indexes, triggers, and views;
3. create a new table with the target definition;
4. copy and explicitly transform named columns;
5. drop the old table and rename the new table to the original name;
6. recreate affected indexes, triggers, and views;
7. run `PRAGMA foreign_key_check` before commit;
8. commit, then restore `PRAGMA foreign_keys=ON` outside the transaction.

Changing `foreign_keys` inside a transaction is a no-op, which is why the first and last steps sit outside it. Avoid editing `sqlite_schema` directly. A rebuild script should list columns rather than relying on `SELECT *`, validate conversions before dropping the source table, and run `integrity_check` after the migration.

For a large table, estimate temporary disk use. A transactional rebuild can need space for both versions plus journal or WAL growth. Refuse to start if free-space headroom is inadequate.

## Make migrations deterministic and restartable

Migration code should depend only on the current database state and the shipped migration, not on a remote service or wall-clock result. Do not make network calls inside the transaction. Bundle lookup data with the application when it is required for a conversion.

An interrupted transaction should roll back when SQLite recovers. At the next start, the unchanged `user_version` causes the same migration to run again. Test termination at multiple points to confirm this behavior on each supported filesystem.

Avoid broad `IF NOT EXISTS` clauses as a substitute for version control. They can turn an unexpected half-schema into apparent success. Check exact prerequisites and fail when they differ.

## Back up and verify around the change

Before a destructive or one-way migration, create a database-aware backup using SQLite's online backup API or a cleanly quiesced copy. Record its checksum, source version, and application release.

After every migration sequence, run:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
PRAGMA user_version;
```

Also check application invariants and query plans for critical paths. `integrity_check` does not validate foreign keys, and neither pragma knows whether a unit conversion or timestamp transformation was logically correct.

## Plan upgrade and downgrade policy

A safe fleet rollout answers these questions in advance:

- Can the old binary read the new schema during a rolling update?
- Does the migration take an exclusive maintenance window?
- Is rollback implemented as a reverse migration or as a full database restore?
- What happens when the device is offline halfway through package installation?
- How are two installed app versions prevented from alternating against one file?

For additive changes, use an expand-and-contract sequence when two binary versions must overlap. First add nullable or defaulted structures that both versions tolerate, then deploy code that uses them, and remove old structures only after no older binary can run.

For destructive conversions, prefer restoring the pre-migration backup over attempting an improvised downgrade. A reverse migration must be tested with the same rigor as the forward path.

## Test representative upgrade paths

Do not test only a fresh install. Maintain fixtures for the oldest supported schema, every currently deployed schema, unusual but valid data, maximum-size values, orphan checks, low disk space, a competing writer, and process termination during migration.

Test a second startup after success. It should perform no schema changes and should verify the version quickly.

## Conclusion

Use `user_version` as an explicit application contract and ship immutable sequential migrations. Acquire the writer with `BEGIN IMMEDIATE`, update the version in the same transaction, and fail closed on unknown schemas. Back up destructive changes, follow SQLite's table-rebuild procedure, validate both structure and meaning, and test interrupted upgrades as a normal operating condition.

## Official Documentation

- [SQLite `user_version` pragma](https://www.sqlite.org/pragma.html#pragma_user_version)
- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html)
- [SQLite online backup API](https://www.sqlite.org/backup.html)
