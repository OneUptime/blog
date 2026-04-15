# How to Use ClickHouse Migrations for Schema Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Migration, Schema, DDL, Administration, Operation

Description: Learn how to manage ClickHouse schema changes safely using a migration table pattern, apply DDL changes with ALTER TABLE, and handle migrations in CI/CD pipelines.

---

ClickHouse does not have a built-in migration framework like Flyway or Liquibase. Managing schema changes requires a migration tracking table, disciplined use of `ALTER TABLE`, and awareness of which DDL operations are instant and which trigger a background mutation that can take hours. This guide covers a migration pattern that works reliably in production.

## Why Schema Migrations in ClickHouse Are Different

Unlike row-oriented databases, ClickHouse DDL has important characteristics:

- `ALTER TABLE ADD COLUMN` is instant (metadata-only)
- `ALTER TABLE DROP COLUMN` triggers a background mutation on all parts
- `ALTER TABLE MODIFY COLUMN` can be instant or trigger a mutation depending on whether the data needs to be rewritten
- `ALTER TABLE ... UPDATE` and `ALTER TABLE ... DELETE` are mutations that run in the background and can take minutes to hours

Understanding these distinctions is critical for safe migrations.

## Setting Up a Migration Tracking Table

Create a table to record all applied migrations:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations
(
    version      String,
    description  String,
    applied_at   DateTime DEFAULT now(),
    checksum     String,
    applied_by   String DEFAULT currentUser(),
    duration_ms  UInt64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/schema_migrations', '{replica}')
ORDER BY (version)
COMMENT 'Tracks applied schema migrations';
```

For non-replicated deployments:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations
(
    version      String,
    description  String,
    applied_at   DateTime DEFAULT now(),
    checksum     String,
    applied_by   String DEFAULT currentUser(),
    duration_ms  UInt64
)
ENGINE = MergeTree
ORDER BY (version);
```

## Migration Script Structure

Organize migrations as numbered SQL files:

```text
migrations/
  V001__create_events_table.sql
  V002__add_user_agent_column.sql
  V003__add_session_id_index.sql
  V004__partition_by_month.sql
  V005__add_ttl_policy.sql
```

Each migration file should be idempotent and use `IF NOT EXISTS` where possible:

```sql
-- V001__create_events_table.sql
CREATE TABLE IF NOT EXISTS events
(
    event_id     UUID DEFAULT generateUUIDv4(),
    event_time   DateTime64(3) DEFAULT now64(),
    event_date   Date DEFAULT toDate(event_time),
    user_id      UInt64,
    event_type   LowCardinality(String),
    properties   String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_time)
TTL event_date + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;
```

```sql
-- V002__add_user_agent_column.sql
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS user_agent String DEFAULT '';
```

```sql
-- V003__add_session_id_index.sql
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS session_id String DEFAULT '',
    ADD INDEX IF NOT EXISTS idx_session_id session_id TYPE bloom_filter GRANULARITY 1;
```

## Migration Runner Script

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-migrate.sh

set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/opt/clickhouse-migrations}"
CH_HOST="${CLICKHOUSE_HOST:-localhost}"
CH_USER="${CLICKHOUSE_USER:-default}"
CH_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
CH_DATABASE="${CLICKHOUSE_DATABASE:-default}"
DRY_RUN="${DRY_RUN:-false}"

log() {
    echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $1"
}

ch() {
    clickhouse-client \
        --host "$CH_HOST" \
        --user "$CH_USER" \
        --password "$CH_PASSWORD" \
        --database "$CH_DATABASE" \
        --query "$1"
}

# Ensure migration table exists
ch "
CREATE TABLE IF NOT EXISTS schema_migrations
(
    version      String,
    description  String,
    applied_at   DateTime DEFAULT now(),
    checksum     String,
    applied_by   String DEFAULT currentUser(),
    duration_ms  UInt64
)
ENGINE = MergeTree
ORDER BY version;
"

log "Scanning migrations in ${MIGRATIONS_DIR}..."

# Apply pending migrations
for MIGRATION_FILE in $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | sort); do
    FILENAME=$(basename "$MIGRATION_FILE")
    VERSION=$(echo "$FILENAME" | grep -oP '^V\d+')
    DESCRIPTION=$(echo "$FILENAME" | sed 's/^V[0-9]*__//' | sed 's/\.sql$//' | tr '_' ' ')
    CHECKSUM=$(md5sum "$MIGRATION_FILE" | cut -d' ' -f1)

    # Check if already applied
    APPLIED=$(ch "SELECT count() FROM schema_migrations WHERE version = '${VERSION}'" 2>/dev/null || echo "0")
    if [ "$APPLIED" -gt 0 ]; then
        log "SKIP: ${VERSION} - ${DESCRIPTION} (already applied)"
        continue
    fi

    log "APPLY: ${VERSION} - ${DESCRIPTION}"

    if [ "$DRY_RUN" = "true" ]; then
        log "  DRY RUN: would execute ${MIGRATION_FILE}"
        continue
    fi

    # Execute the migration
    START_TIME=$(date +%s%3N)
    clickhouse-client \
        --host "$CH_HOST" \
        --user "$CH_USER" \
        --password "$CH_PASSWORD" \
        --database "$CH_DATABASE" \
        --multiquery < "$MIGRATION_FILE"
    END_TIME=$(date +%s%3N)
    DURATION=$((END_TIME - START_TIME))

    # Record the migration
    ch "
    INSERT INTO schema_migrations (version, description, checksum, duration_ms)
    VALUES ('${VERSION}', '${DESCRIPTION}', '${CHECKSUM}', ${DURATION});
    "

    log "DONE: ${VERSION} in ${DURATION}ms"
done

log "Migration run complete."
log "Applied migrations:"
ch "SELECT version, description, applied_at, duration_ms FROM schema_migrations ORDER BY version"
```

Make it executable:

```bash
chmod +x /usr/local/bin/clickhouse-migrate.sh

# Run migrations
CLICKHOUSE_DATABASE=my_database \
MIGRATIONS_DIR=/opt/clickhouse-migrations \
/usr/local/bin/clickhouse-migrate.sh

# Dry run
DRY_RUN=true /usr/local/bin/clickhouse-migrate.sh
```

## Common Migration Patterns

### Adding a Column with Default Value

```sql
-- V010__add_country_column.sql
-- Safe: instant, metadata-only change
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS country LowCardinality(String) DEFAULT '';
```

### Adding a Materialized Column

```sql
-- V011__add_hour_column.sql
-- Materializes a computed column for faster GROUP BY
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_hour UInt8
    MATERIALIZED toHour(event_time);
```

### Changing Column Type (Safe Pattern)

Changing a column type that requires data rewrite should be done in steps:

```sql
-- V012__widen_user_id_step1.sql
-- Step 1: Add the new wider column
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS user_id_v2 UInt64 DEFAULT toUInt64(user_id);

-- Step 2: Materialize the column on existing data parts (runs as a background mutation)
ALTER TABLE events MATERIALIZE COLUMN user_id_v2;
```

```sql
-- V013__widen_user_id_step2.sql
-- Only run after verifying the MATERIALIZE COLUMN mutation is complete
-- (check: SELECT count() FROM system.mutations WHERE table = 'events' AND is_done = 0)
ALTER TABLE events
    DROP COLUMN IF EXISTS user_id;

ALTER TABLE events
    RENAME COLUMN user_id_v2 TO user_id;
```

### Adding a Skip Index

```sql
-- V014__add_event_type_index.sql
ALTER TABLE events
    ADD INDEX IF NOT EXISTS idx_event_type event_type TYPE set(100) GRANULARITY 1;

-- Materialize the index on existing data
ALTER TABLE events MATERIALIZE INDEX idx_event_type;
```

### Adding a TTL Policy

```sql
-- V015__add_ttl.sql
ALTER TABLE events
    MODIFY TTL event_date + INTERVAL 365 DAY;
```

## Monitoring Long-Running Migrations

After applying a migration that triggers a mutation, monitor its progress:

```sql
-- Check mutation progress
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    parts_to_do,
    parts_to_do_names,
    is_done,
    latest_fail_reason
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;

-- Detailed part-level progress
SELECT
    database,
    table,
    elapsed,
    progress,
    is_mutation,
    result_part_name
FROM system.merges
WHERE is_mutation = 1
ORDER BY elapsed DESC;
```

Kill a stuck mutation if needed:

```sql
KILL MUTATION WHERE database = 'my_database' AND table = 'events' AND mutation_id = 'mutation_123.txt';
```

## CI/CD Integration

Add migration execution to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ClickHouse client
        run: |
          curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list
          sudo apt-get update
          sudo apt-get install -y clickhouse-client

      - name: Run dry-run migration
        env:
          CLICKHOUSE_HOST: ${{ secrets.CLICKHOUSE_HOST }}
          CLICKHOUSE_USER: ${{ secrets.CLICKHOUSE_USER }}
          CLICKHOUSE_PASSWORD: ${{ secrets.CLICKHOUSE_PASSWORD }}
          CLICKHOUSE_DATABASE: production
          MIGRATIONS_DIR: ./migrations
          DRY_RUN: "true"
        run: chmod +x ./clickhouse-migrate.sh && ./clickhouse-migrate.sh

      - name: Apply migrations
        env:
          CLICKHOUSE_HOST: ${{ secrets.CLICKHOUSE_HOST }}
          CLICKHOUSE_USER: ${{ secrets.CLICKHOUSE_USER }}
          CLICKHOUSE_PASSWORD: ${{ secrets.CLICKHOUSE_PASSWORD }}
          CLICKHOUSE_DATABASE: production
          MIGRATIONS_DIR: ./migrations
        run: ./clickhouse-migrate.sh
```

## Viewing Migration History

```sql
SELECT
    version,
    description,
    applied_at,
    applied_by,
    concat(toString(duration_ms), 'ms') AS duration
FROM schema_migrations
ORDER BY version;
```

## Summary

ClickHouse schema migrations are managed with a `schema_migrations` tracking table, numbered SQL files, and a shell-based migration runner that checks for already-applied versions and records results. Use `ADD COLUMN IF NOT EXISTS` for safe additive changes (instant, metadata-only) and plan carefully for type changes that require data rewrites. Always check `system.mutations` after running a migration that modifies data to monitor background progress. Integrate the migration runner into your CI/CD pipeline with a dry-run step to preview changes before applying them to production.
