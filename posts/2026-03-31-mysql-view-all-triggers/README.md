# How to View All Triggers in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, SHOW, Information Schema, Metadata

Description: Learn how to list all MySQL triggers using SHOW TRIGGERS, SHOW CREATE TRIGGER, and querying information_schema.TRIGGERS with filtering examples.

---

MySQL stores trigger metadata in `information_schema.TRIGGERS` and exposes it through `SHOW` statements. Knowing how to query this information is essential for database auditing, documentation, and debugging unexpected behavior caused by triggers.

## SHOW TRIGGERS

The quickest way to list triggers is `SHOW TRIGGERS`:

```sql
SHOW TRIGGERS;
```

Filter by table name using `LIKE`:

```sql
SHOW TRIGGERS LIKE 'orders';
```

Filter by database using `FROM` or `IN`:

```sql
SHOW TRIGGERS FROM mydb;
```

Combine both:

```sql
SHOW TRIGGERS FROM mydb LIKE 'users';
```

The output includes: `Trigger`, `Event`, `Table`, `Statement`, `Timing`, `Created`, `sql_mode`, `Definer`, and character set columns.

## SHOW CREATE TRIGGER

To see the full `CREATE TRIGGER` statement for a specific trigger:

```sql
SHOW CREATE TRIGGER trg_orders_after_insert;
```

This is useful when you need to recreate or review the trigger body, including all `DELIMITER` conventions.

## Querying information_schema.TRIGGERS

For scripting and more flexible filtering, query the view directly:

```sql
SELECT
    TRIGGER_SCHEMA,
    TRIGGER_NAME,
    EVENT_MANIPULATION   AS event_type,
    EVENT_OBJECT_TABLE   AS table_name,
    ACTION_TIMING        AS timing,
    ACTION_ORDER         AS exec_order,
    DEFINER,
    CREATED
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'mydb'
ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION, ACTION_ORDER;
```

## Find All AFTER INSERT Triggers Across All Databases

```sql
SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_OBJECT_TABLE
FROM information_schema.TRIGGERS
WHERE ACTION_TIMING = 'AFTER'
  AND EVENT_MANIPULATION = 'INSERT'
ORDER BY TRIGGER_SCHEMA, EVENT_OBJECT_TABLE;
```

## Find Triggers That Reference a Specific Table or Column

```sql
SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_OBJECT_TABLE
FROM information_schema.TRIGGERS
WHERE ACTION_STATEMENT LIKE '%audit_log%';
```

## Count Triggers Per Table

```sql
SELECT EVENT_OBJECT_TABLE, COUNT(*) AS trigger_count
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'mydb'
GROUP BY EVENT_OBJECT_TABLE
ORDER BY trigger_count DESC;
```

## Privileges Required

To see trigger definitions in `information_schema.TRIGGERS`, the user needs the `TRIGGER` privilege on the relevant table. Without the privilege, the row is hidden from the result set.

```sql
GRANT TRIGGER ON mydb.* TO 'developer'@'localhost';
```

## Exporting Trigger Definitions

Use `mysqldump` to export triggers along with the table. Triggers are included by default, so `--triggers` is optional:

```bash
mysqldump --no-data mydb orders > orders_with_triggers.sql
```

Use `--no-data` if you only want the schema and triggers, not the row data. Use `--skip-triggers` to explicitly exclude triggers from the dump.

## Summary

Use `SHOW TRIGGERS LIKE 'table_name'` for a quick view and `SHOW CREATE TRIGGER` to inspect a specific trigger's body. For auditing and scripting, query `information_schema.TRIGGERS` and filter by schema, timing, event type, or action statement content.
