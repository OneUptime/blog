# How to Use system.mutations Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.mutations, ALTER TABLE, Mutation, Monitoring, MergeTree

Description: Use system.mutations to track the status, progress, and errors of ALTER TABLE UPDATE and DELETE mutations running in ClickHouse MergeTree tables.

---

In ClickHouse, `ALTER TABLE ... UPDATE` and `ALTER TABLE ... DELETE` statements create asynchronous "mutations" that rewrite data parts in the background. The `system.mutations` table lets you monitor their progress, detect failures, and understand which parts are still pending rewrite.

## What is system.mutations?

`system.mutations` is a system table that stores all mutations submitted to MergeTree tables - both running and completed. Unlike `system.merges`, this table retains finished mutation records based on the `finished_mutations_to_keep` storage engine parameter. Older entries are automatically deleted.

Key columns:
- `mutation_id` - unique identifier (e.g., `mutation_1.txt`)
- `command` - the SQL that triggered the mutation
- `create_time` - when the mutation was submitted
- `parts_to_do` - number of parts still to be rewritten
- `is_done` - whether the mutation has completed
- `latest_failed_part` - the most recent part that failed to mutate
- `latest_fail_reason` - exception text for the last failure

## Listing Active Mutations

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    parts_to_do,
    is_done,
    latest_fail_reason
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;
```

## Checking Mutation Progress

Track how many parts still need rewriting:

```sql
SELECT
    mutation_id,
    command,
    parts_to_do,
    parts_to_do_names
FROM system.mutations
WHERE database = 'mydb'
  AND table    = 'events'
  AND is_done  = 0;
```

When `parts_to_do` reaches 0, the mutation is complete and `is_done` becomes 1.

## Monitoring Mutation History

See all completed mutations for a table:

```sql
SELECT
    mutation_id,
    command,
    create_time,
    is_done
FROM system.mutations
WHERE database = 'mydb'
  AND table    = 'events'
ORDER BY create_time DESC
LIMIT 20;
```

## Diagnosing Failed Mutations

If a mutation is stuck with `parts_to_do > 0` and `is_done = 0`:

```sql
SELECT
    mutation_id,
    latest_failed_part,
    latest_fail_reason,
    parts_to_do
FROM system.mutations
WHERE database = 'mydb'
  AND table    = 'events'
  AND is_done  = 0;
```

Common failure reasons include out-of-memory errors or broken parts. Resolve the underlying issue and the mutation will retry automatically.

## Canceling a Mutation

To cancel a stuck mutation:

```sql
KILL MUTATION WHERE database = 'mydb' AND table = 'events' AND mutation_id = 'mutation_1.txt';
```

Canceling removes the mutation from the queue but does not undo changes already applied to completed parts.

## Performance Impact

Mutations rewrite entire data parts, which is CPU and I/O intensive. Check current mutation load alongside merge activity:

```sql
SELECT
    (SELECT count() FROM system.mutations WHERE is_done = 0) AS pending_mutations,
    (SELECT count() FROM system.merges)                       AS active_merges;
```

Consider scheduling large mutations during low-traffic windows.

## Summary

`system.mutations` is the primary tool for tracking ALTER TABLE UPDATE and DELETE operations in ClickHouse. Monitor `parts_to_do` to track progress, check `latest_fail_reason` when mutations stall, and use `KILL MUTATION` to cancel problematic ones. Always plan mutations carefully in production due to their I/O impact.
