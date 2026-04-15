# How to Roll Back Schema Migrations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Migration, Rollback, ALTER TABLE, Database

Description: Learn strategies for rolling back ClickHouse schema migrations safely, including reversible migration patterns and recovery from failed mutations.

---

Rolling back schema changes in ClickHouse requires planning ahead, since not all operations are easily reversible. The key is writing rollback scripts alongside every forward migration and using ClickHouse's mutation system carefully.

## Reversible vs Irreversible Changes

| Operation | Reversible? | Rollback Method |
|---|---|---|
| ADD COLUMN | Yes | DROP COLUMN |
| ADD INDEX | Yes | DROP INDEX |
| DROP COLUMN | No (data lost) | Restore from backup |
| MODIFY COLUMN type | Partial | Revert type if compatible |
| DELETE mutation | No | Restore from backup |

## Writing Rollback Scripts

Every migration should have a paired rollback script:

```sql
-- V3__Add_session_id.up.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id String DEFAULT '';
```

```sql
-- V3__Add_session_id.down.sql
ALTER TABLE events DROP COLUMN IF EXISTS session_id;
```

## Rolling Back an ADD COLUMN

```sql
ALTER TABLE events DROP COLUMN IF EXISTS session_id;
```

This is fast because ClickHouse uses columnar storage - it deletes the entire column files from disk, which completes almost instantly.

## Rolling Back an ADD INDEX

```sql
ALTER TABLE events DROP INDEX idx_session_bloom;
```

## Rolling Back a Column Type Change

If you changed `UInt32` to `UInt64`, revert with:

```sql
ALTER TABLE events MODIFY COLUMN value UInt32;
```

Note: data may have been widened, so downcast with care.

## Cancelling a Running Mutation

If you issued an ALTER UPDATE or DELETE and want to stop it:

```sql
-- Find the mutation ID
SELECT mutation_id, command, is_done FROM system.mutations WHERE table = 'events';

-- Kill it
KILL MUTATION WHERE database = 'default' AND table = 'events' AND mutation_id = 'mutation_3.txt';
```

## Recovery from Failed ADD PROJECTION

```sql
-- Remove a partially materialized projection
ALTER TABLE events DROP PROJECTION proj_by_user;
```

## Using Backup Before Destructive Changes

Before any irreversible change, create a backup or snapshot:

```sql
-- Create a backup table before dropping a column
CREATE TABLE events_backup AS events;
INSERT INTO events_backup SELECT * FROM events;

-- Now proceed with the destructive migration
ALTER TABLE events DROP COLUMN legacy_field;
```

## Rollback in golang-migrate

```bash
migrate -path ./migrations \
  -database "clickhouse://localhost:9000?database=analytics" \
  down 1
```

## Testing Rollbacks in CI

Add a rollback test step to your CI pipeline:

```bash
# Apply migrations
migrate up

# Verify schema
clickhouse-client --query "DESCRIBE TABLE events"

# Roll back
migrate down 1

# Verify rollback
clickhouse-client --query "DESCRIBE TABLE events"
```

## Summary

Rollback safety in ClickHouse depends on writing paired down scripts for every migration and avoiding irreversible operations without backups. Column additions and index changes are fully reversible; data-destructive operations require a backup strategy.
