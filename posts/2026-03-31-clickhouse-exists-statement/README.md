# How to Use EXISTS Statement in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, EXISTS, Metadata

Description: Learn how to check for the existence of tables, views, dictionaries, and databases in ClickHouse using the EXISTS statement and how to use it in scripts.

---

Before creating, dropping, or altering a database object, it is often useful to check whether that object already exists. ClickHouse provides the EXISTS statement for this purpose. It performs a metadata-only lookup and returns a single integer - 1 if the object exists or 0 if it does not. This post covers all supported object types and practical scripting patterns.

## EXISTS TABLE

```sql
EXISTS TABLE analytics.events;
```

Returns `1` if the table exists in the `analytics` database, `0` otherwise. The table must be fully qualified when you are not in the target database.

```sql
USE analytics;
EXISTS TABLE events;
-- Returns 1 or 0
```

## EXISTS VIEW

```sql
EXISTS VIEW analytics.events_summary_view;
```

Materialized views and regular views are both checked with EXISTS VIEW.

```sql
EXISTS VIEW analytics.daily_totals;
```

## EXISTS DICTIONARY

External dictionaries can be checked before loading or reloading:

```sql
EXISTS DICTIONARY analytics.products_dict;
```

Returns 1 if the dictionary is registered in the catalog, regardless of whether it has been loaded into memory.

## EXISTS DATABASE

```sql
EXISTS DATABASE analytics;
```

Returns 1 if the database exists. Useful in provisioning scripts before creating schemas.

## Return Values

All EXISTS variants return a single-column, single-row result set:

| Result | Meaning |
|--------|---------|
| 1 | The object exists |
| 0 | The object does not exist |

## Using EXISTS in Scripts

Because EXISTS returns a plain integer, it integrates naturally into bash scripts via `clickhouse-client`:

```bash
#!/bin/bash

TABLE_EXISTS=$(clickhouse-client \
  --query "EXISTS TABLE analytics.events" \
  --format TabSeparated)

if [ "$TABLE_EXISTS" -eq 1 ]; then
  echo "Table exists, skipping creation."
else
  echo "Table not found, creating..."
  clickhouse-client --query "
    CREATE TABLE analytics.events
    (
        event_id   UUID,
        event_type String,
        created_at DateTime
    )
    ENGINE = MergeTree()
    ORDER BY created_at;
  "
fi
```

## Conditional DDL Patterns

The EXISTS statement is commonly paired with IF EXISTS or IF NOT EXISTS DDL clauses. Because EXISTS is a standalone statement rather than a scalar expression, when you need to branch logic based on the existence of multiple objects in a single query, query the `system.tables`, `system.databases`, and `system.dictionaries` catalogs instead:

```sql
-- Check before deciding which branch to execute
SELECT
    (SELECT count() FROM system.tables WHERE database = 'analytics' AND name = 'events')         > 0 AS has_events,
    (SELECT count() FROM system.tables WHERE database = 'analytics' AND name = 'events_archive') > 0 AS has_archive,
    (SELECT count() FROM system.databases WHERE name = 'staging')                                > 0 AS has_staging;
```

```sql
-- Use in a conditional insert pipeline (pseudo-code style)
-- First, verify the target exists
EXISTS TABLE analytics.events;

-- Then proceed with the insert
INSERT INTO analytics.events
SELECT * FROM staging.raw_events;
```

## Practical Example - Pre-flight Check

```sql
-- Validate that all required objects are present before running a pipeline
SELECT
    multiIf(
        (SELECT count() FROM system.tables       WHERE database = 'analytics' AND name = 'events')        = 0, 'MISSING: analytics.events',
        (SELECT count() FROM system.tables       WHERE database = 'dim'       AND name = 'products')      = 0, 'MISSING: dim.products',
        (SELECT count() FROM system.dictionaries WHERE database = 'dim'       AND name = 'products_dict') = 0, 'MISSING: dim.products_dict',
        'ALL OK'
    ) AS preflight_status;
```

```bash
# Shell pre-flight for a migration script
for TABLE in "analytics.events" "analytics.users" "analytics.sessions"; do
  RESULT=$(clickhouse-client --query "EXISTS TABLE ${TABLE}")
  if [ "$RESULT" -ne 1 ]; then
    echo "ERROR: ${TABLE} does not exist. Aborting."
    exit 1
  fi
done
echo "All tables verified."
```

## Summary

The EXISTS statement in ClickHouse is a lightweight metadata query that returns 1 or 0 for tables, views, dictionaries, and databases. It is ideal for defensive scripting, pre-flight checks, and conditional pipeline logic where you need to verify the presence of a schema object before proceeding with DDL or data operations.
