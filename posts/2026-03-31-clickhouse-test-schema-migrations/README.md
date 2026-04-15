# How to Test ClickHouse Schema Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Migration, Testing, DevOps, SQL

Description: Learn how to test ClickHouse schema migrations by running them against a test instance, verifying table structure, and checking backward compatibility.

---

## Why Test Schema Migrations

ClickHouse DDL operations are often irreversible or have side effects - dropping columns, changing types, or adding materialized columns. Testing migrations in isolation before applying them to production catches destructive errors and validates that application queries still work after the schema change.

## Migration File Convention

Use numbered SQL files to maintain ordered migrations:

```text
migrations/
  001_create_events.sql
  002_add_revenue_column.sql
  003_change_status_type.sql
  004_add_bloom_index.sql
```

## Migration Runner

```python
import clickhouse_connect
import os, glob

def run_migrations(client, migration_dir='migrations'):
    client.command('CREATE TABLE IF NOT EXISTS schema_migrations ('
                   '  version UInt32,'
                   '  applied_at DateTime DEFAULT now()'
                   ') ENGINE = MergeTree() ORDER BY version')

    applied = {
        r[0] for r in
        client.query('SELECT version FROM schema_migrations').result_rows
    }

    for path in sorted(glob.glob(f'{migration_dir}/*.sql')):
        version = int(os.path.basename(path).split('_')[0])
        if version in applied:
            continue
        with open(path) as f:
            sql = f.read()
        for stmt in sql.split(';'):
            stmt = stmt.strip()
            if stmt:
                client.command(stmt)
        client.insert('schema_migrations', [[version]],
                      column_names=['version'])
        print(f'Applied migration {version}: {path}')
```

## Test: Verify Schema After Migration

```python
def test_migration_adds_column(ch_client):
    run_migrations(ch_client)

    result = ch_client.query('''
        SELECT name, type
        FROM system.columns
        WHERE database = 'test_db'
          AND table = 'events'
          AND name = 'revenue'
    ''')
    assert len(result.result_rows) == 1
    assert 'Float64' in result.result_rows[0][1]
```

## Test: Data Survives Migration

```python
def test_existing_data_intact_after_migration(ch_client):
    # Insert data before migration
    ch_client.insert('test_db.events', [
        [1, 'purchase', '2025-01-01'],
    ], column_names=['user_id', 'event_type', 'event_date'])

    run_migrations(ch_client)

    result = ch_client.query(
        'SELECT count() FROM test_db.events WHERE user_id = 1'
    )
    assert result.result_rows[0][0] == 1
```

## Test: Migration Is Idempotent

```python
def test_migration_is_idempotent(ch_client):
    run_migrations(ch_client)
    # Running again should not raise errors
    run_migrations(ch_client)
```

## Test: Column Type Change Does Not Truncate Data

```python
def test_no_data_loss_on_type_change(ch_client):
    ch_client.insert('test_db.events', [
        [42, 'test', '2025-06-01'],
    ], column_names=['user_id', 'event_type', 'event_date'])

    # Apply migration that changes event_type from String to LowCardinality(String)
    ch_client.command('''
        ALTER TABLE test_db.events
        MODIFY COLUMN event_type LowCardinality(String)
    ''')

    result = ch_client.query(
        "SELECT event_type FROM test_db.events WHERE user_id = 42"
    )
    assert result.result_rows[0][0] == 'test'
```

## Summary

Test ClickHouse schema migrations by running them against a test database, verifying the resulting column structure via `system.columns`, and asserting that existing data survives the migration. Track applied migrations in a `schema_migrations` table to make the runner idempotent. Run migration tests in CI using a Docker-based ClickHouse service before deploying to production.
