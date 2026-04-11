# How to Use SHOW TRIGGERS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Schema

Description: Learn how to use SHOW TRIGGERS in MySQL to list trigger definitions, view timing and event details, and inspect trigger bodies.

---

## What Is SHOW TRIGGERS

`SHOW TRIGGERS` lists all triggers defined in a database along with key metadata such as the event that fires the trigger (`INSERT`, `UPDATE`, `DELETE`), the timing (`BEFORE` or `AFTER`), the associated table, the trigger body, and the definer. It is useful for auditing, debugging, and understanding how data changes are intercepted in your schema.

```sql
SHOW TRIGGERS;
SHOW TRIGGERS FROM database_name;
SHOW TRIGGERS LIKE 'pattern';
SHOW TRIGGERS WHERE condition;
```

## Basic Usage

```sql
USE myapp_db;
SHOW TRIGGERS\G
```

```text
*************************** 1. row ***************************
             Trigger: before_order_insert
               Event: INSERT
               Table: orders
           Statement: BEGIN
  SET NEW.created_at = NOW();
  SET NEW.status = IFNULL(NEW.status, 'pending');
END
              Timing: BEFORE
             Created: 2024-01-15 10:30:00.00
            sql_mode: STRICT_TRANS_TABLES
             Definer: root@localhost
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
  Database Collation: utf8mb4_0900_ai_ci
```

## Filtering by Table

To show triggers for a specific table:

```sql
SHOW TRIGGERS FROM myapp_db WHERE `Table` = 'orders';
```

## Filtering with LIKE

The `LIKE` clause matches against **table names**, not trigger names:

```sql
-- Find triggers on tables with 'order' in the table name
SHOW TRIGGERS LIKE '%order%';

-- Find triggers on tables starting with 'audit_'
SHOW TRIGGERS LIKE 'audit_%';
```

To filter by trigger name, use `WHERE` instead:

```sql
SHOW TRIGGERS WHERE `Trigger` LIKE '%audit%';
```

## Key Output Columns

- **Trigger**: Name of the trigger
- **Event**: The DML event that fires it (`INSERT`, `UPDATE`, or `DELETE`)
- **Table**: The table the trigger is attached to
- **Statement**: The trigger body (the SQL it executes)
- **Timing**: When it fires relative to the event (`BEFORE` or `AFTER`)
- **Definer**: The user who created the trigger
- **sql_mode**: The SQL mode in effect when the trigger was created

## Querying information_schema for Triggers

For programmatic access or cross-database queries:

```sql
SELECT
  TRIGGER_NAME,
  EVENT_MANIPULATION AS event,
  EVENT_OBJECT_TABLE AS table_name,
  ACTION_TIMING AS timing,
  ACTION_STATEMENT AS body,
  DEFINER,
  CREATED
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'myapp_db'
ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION;
```

## Viewing All Triggers Across All Databases

```sql
SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_OBJECT_TABLE, EVENT_MANIPULATION, ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA NOT IN ('mysql', 'sys')
ORDER BY TRIGGER_SCHEMA, EVENT_OBJECT_TABLE;
```

## Common Use Cases for SHOW TRIGGERS

Audit before a migration to understand side effects:

```sql
-- Find all triggers on tables you plan to modify
SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING, ACTION_STATEMENT
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'myapp_db'
  AND EVENT_OBJECT_TABLE IN ('users', 'orders', 'products');
```

Find triggers that might cause performance issues:

```sql
-- Find AFTER INSERT triggers (can slow bulk inserts)
SHOW TRIGGERS WHERE `Timing` = 'AFTER' AND `Event` = 'INSERT';
```

## Viewing the Full Trigger Definition

For the complete `CREATE TRIGGER` syntax:

```sql
SHOW CREATE TRIGGER trigger_name;
```

```sql
SHOW CREATE TRIGGER before_order_insert;
```

## Summary

`SHOW TRIGGERS` reveals all trigger definitions in a MySQL database, including event type, timing, associated table, and the trigger body. Use it before migrations to understand DML side effects, during debugging to trace unexpected data changes, and for schema documentation. For multi-database or automated queries, `information_schema.TRIGGERS` provides the same data in a queryable format.
