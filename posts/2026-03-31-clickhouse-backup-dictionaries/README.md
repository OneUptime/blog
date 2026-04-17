# How to Back Up ClickHouse Dictionaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Dictionary, Disaster Recovery, Operation

Description: Learn how to back up ClickHouse dictionaries, including their definitions and underlying data, to ensure full recovery after failures.

---

ClickHouse dictionaries are key-value lookup structures used in queries for fast joins and data enrichment. Backing up dictionaries properly requires capturing both the dictionary definition (DDL) and, for embedded dictionaries, the source data.

## Types of Dictionaries and Backup Strategies

ClickHouse supports several dictionary source types, each with a different backup approach:

- **Embedded (internal) dictionaries** - backed up with BACKUP TABLE or BACKUP DATABASE
- **External source dictionaries** (MySQL, PostgreSQL, files) - only the DDL needs backup; data lives in the source
- **Complex key dictionaries with ClickHouse table source** - back up both DDL and the source table

## Backing Up Dictionaries with BACKUP DATABASE

When a dictionary is created with `CREATE DICTIONARY` and stored in a ClickHouse database, it is included in `BACKUP DATABASE`:

```sql
-- Back up all dictionaries in a database
BACKUP DATABASE production
TO Disk('backups', 'production_backup_2026-03-31/');
```

Verify the backup completed successfully:

```sql
SELECT name, status, num_files, total_size
FROM system.backup_log
WHERE name LIKE '%production_backup_2026-03-31%'
ORDER BY event_time DESC
LIMIT 1;
```

## Exporting Dictionary DDL

Export dictionary definitions as SQL for manual backup:

```sql
-- Show CREATE DICTIONARY statement
SHOW CREATE DICTIONARY production.country_codes;
```

Save all dictionary definitions to a file by iterating over `system.dictionaries` and running `SHOW CREATE DICTIONARY` for each one:

```bash
: > /backup/dictionary_definitions.sql
clickhouse-client --query "
SELECT database, name
FROM system.dictionaries
WHERE database NOT IN ('system')
FORMAT TabSeparated" | while IFS=$'\t' read -r db name; do
  clickhouse-client --query "SHOW CREATE DICTIONARY \`$db\`.\`$name\` FORMAT TSVRaw" >> /backup/dictionary_definitions.sql
  echo ";" >> /backup/dictionary_definitions.sql
done
```

## Backing Up File-Based Dictionaries

For dictionaries loading from local CSV or XML files, back up the source files too:

```bash
# Back up dictionary source files
DICT_SRC="/etc/clickhouse-server/dictionaries"
BACKUP_DIR="/backup/dictionaries/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
cp -r "$DICT_SRC"/* "$BACKUP_DIR/"

# Back up DDL
clickhouse-client --query "SHOW CREATE DICTIONARY default.my_dict FORMAT TSVRaw" > "$BACKUP_DIR/my_dict.sql"
```

## Restoring Dictionaries

Restore from a BACKUP DATABASE that includes dictionaries:

```sql
RESTORE DATABASE production AS production_restored
FROM Disk('backups', 'production_backup_2026-03-31/');
```

Or restore only the dictionaries by name:

```sql
RESTORE DICTIONARY production.country_codes
FROM Disk('backups', 'production_backup_2026-03-31/');
```

## Restoring from DDL Export

If restoring from SQL exports, run the DDL file:

```bash
clickhouse-client < /backup/dictionary_definitions.sql
```

Then reload the dictionaries:

```sql
SYSTEM RELOAD DICTIONARIES;
```

## Verifying Dictionary State After Restore

Check that all dictionaries loaded successfully:

```sql
SELECT
    database,
    name,
    status,
    element_count,
    load_factor,
    last_successful_update_time
FROM system.dictionaries
ORDER BY database, name;
```

A `status` of `LOADED` means the dictionary is ready. `FAILED` means the dictionary failed to load - check the `last_exception` field.

## Summary

ClickHouse dictionaries are included in BACKUP DATABASE when stored as database objects. For file-based dictionaries, back up the source files and DDL separately. After restore, verify via `system.dictionaries` that all dictionaries loaded successfully. Keep dictionary source files in version control or alongside database backups for a complete recovery strategy.
