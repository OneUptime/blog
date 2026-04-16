# How to Use golang-migrate with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Golang-migrate, Schema Migration, Go, DevOps

Description: Learn how to use golang-migrate to manage ClickHouse schema migrations with versioned SQL files, supporting both up and down migrations.

---

`golang-migrate` is a popular database migration tool that supports ClickHouse via its native driver. It applies versioned SQL migration files in order, tracking the current schema version in ClickHouse itself.

## Installation

```bash
# Install the CLI
go install -tags 'clickhouse' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Or download binary
brew install golang-migrate
```

## Creating the Migrations Directory

```bash
mkdir -p migrations
```

## Writing Migration Files

Files follow the naming convention: `{version}_{description}.{up|down}.sql`

```bash
touch migrations/000001_create_events_table.up.sql
touch migrations/000001_create_events_table.down.sql
touch migrations/000002_add_session_id_column.up.sql
touch migrations/000002_add_session_id_column.down.sql
```

### Up Migration: Create Table

```sql
-- migrations/000001_create_events_table.up.sql
CREATE TABLE IF NOT EXISTS events (
    ts          DateTime,
    user_id     String,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = MergeTree()
ORDER BY (user_id, ts)
PARTITION BY toYYYYMM(ts);
```

### Down Migration: Drop Table

```sql
-- migrations/000001_create_events_table.down.sql
DROP TABLE IF EXISTS events;
```

### Up Migration: Add Column

```sql
-- migrations/000002_add_session_id_column.up.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id String DEFAULT '';
```

### Down Migration: Remove Column

```sql
-- migrations/000002_add_session_id_column.down.sql
ALTER TABLE events DROP COLUMN IF EXISTS session_id;
```

## Running Migrations

```bash
migrate \
  -path ./migrations \
  -database "clickhouse://localhost:9000/analytics?x-multi-statement=true" \
  up
```

For ClickHouse Cloud or HTTPS:

```bash
migrate \
  -path ./migrations \
  -database "clickhouse://user:pass@host.clickhouse.cloud:9440/analytics?secure=true&x-multi-statement=true" \
  up
```

## Rolling Back

```bash
# Roll back one migration
migrate -path ./migrations \
  -database "clickhouse://localhost:9000/analytics" \
  down 1

# Roll back all
migrate -path ./migrations \
  -database "clickhouse://localhost:9000/analytics" \
  down
```

## Checking Migration Status

```bash
migrate -path ./migrations \
  -database "clickhouse://localhost:9000/analytics" \
  version
```

## Using in Go Applications

```go
import (
    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/clickhouse"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

m, err := migrate.New("file://migrations", "clickhouse://localhost:9000/analytics")
if err != nil {
    log.Fatal(err)
}
if err := m.Up(); err != nil && err != migrate.ErrNoChange {
    log.Fatal(err)
}
```

## Summary

`golang-migrate` provides a simple, well-supported migration workflow for ClickHouse with versioned SQL files, rollback support, and both CLI and programmatic interfaces - suitable for teams with existing Go tooling.
