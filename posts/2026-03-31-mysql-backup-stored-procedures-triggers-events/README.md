# How to Back Up MySQL Stored Procedures, Triggers, and Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Stored Procedure, Trigger, Event

Description: Learn how to back up and restore MySQL stored procedures, triggers, and scheduled events using mysqldump and manual extraction.

---

MySQL logical backups created with `mysqldump` include table data by default, but stored procedures, triggers, and events require specific flags to be included. Neglecting these objects means your backup is incomplete and a restore will be missing critical business logic.

## Default mysqldump Behavior

By default, `mysqldump` includes triggers but excludes stored procedures, functions, and events. This surprises many users who assume a full backup is truly complete.

```bash
# Default: includes triggers, excludes routines and events
mysqldump -u root -p mydb > mydb_default.sql
```

## Including Routines and Events

Add the `--routines` and `--events` flags to include all objects:

```bash
mysqldump -u root -p \
  --routines \
  --events \
  --triggers \
  mydb > mydb_full.sql
```

For an all-databases backup:

```bash
mysqldump -u root -p \
  --all-databases \
  --routines \
  --events \
  --triggers \
  --single-transaction \
  > all_databases_full.sql
```

## Backing Up Only Routines

To extract just stored procedures, functions, and events without data:

```bash
mysqldump -u root -p \
  --no-data \
  --no-create-info \
  --routines \
  --events \
  mydb > mydb_routines_only.sql
```

## Backing Up Routines via information_schema

You can also query routines directly from the `information_schema`:

```sql
SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
FROM information_schema.routines
WHERE routine_schema = 'mydb'
ORDER BY routine_type, routine_name;
```

To export the full `CREATE` statement:

```sql
SHOW CREATE PROCEDURE mydb.calculate_discount;
SHOW CREATE FUNCTION mydb.get_tax_rate;
SHOW CREATE EVENT mydb.daily_cleanup;
```

## Verifying Objects in a Backup File

After creating a backup, confirm it contains the expected objects:

```bash
# Check for stored procedures
grep -c "PROCEDURE" mydb_full.sql

# Check for triggers
grep -c "TRIGGER" mydb_full.sql

# Check for events
grep -c "CREATE.*EVENT" mydb_full.sql
```

## Restoring Routines from Backup

Restore the full backup including routines:

```bash
mysql -u root -p mydb < mydb_full.sql
```

When restoring only routines to an existing database, use the routines-only dump:

```bash
mysql -u root -p mydb < mydb_routines_only.sql
```

## Checking DEFINER Clauses

Routines often contain `DEFINER` clauses that reference specific users. If restoring to a different server, those users may not exist:

```bash
# Strip DEFINER clauses before restoring
sed 's/DEFINER=[^ ]* //g' mydb_full.sql > mydb_nodefiner.sql

mysql -u root -p mydb < mydb_nodefiner.sql
```

Or recreate the user on the target server:

```sql
CREATE USER 'app_user'@'%' IDENTIFIED BY 'AppPassword';
GRANT EXECUTE ON mydb.* TO 'app_user'@'%';
```

## Listing All Objects for Verification

After a restore, verify all expected objects are present:

```sql
-- List stored procedures
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'mydb';

-- List triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'mydb';

-- List events
SELECT event_name, status, event_definition
FROM information_schema.events
WHERE event_schema = 'mydb';
```

## Summary

Always include `--routines`, `--events`, and `--triggers` when running `mysqldump` to capture all database objects. Use the `--no-data --no-create-info --routines --events` combination to export only business logic for lightweight version-controlled backups. After restoring, verify object presence via `information_schema` queries and handle `DEFINER` clauses when migrating between servers.
