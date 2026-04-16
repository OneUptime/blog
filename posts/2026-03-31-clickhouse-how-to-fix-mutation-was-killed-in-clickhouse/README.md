# How to Fix 'Mutation was killed' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mutation, DDL, Troubleshooting, Operation

Description: Learn why ClickHouse mutations get killed and how to prevent, diagnose, and resume failed ALTER TABLE UPDATE and DELETE operations.

---

## Understanding the Error

Mutations in ClickHouse are background operations triggered by `ALTER TABLE ... UPDATE` or `ALTER TABLE ... DELETE`. When a mutation is forcibly stopped, you see:

```text
DB::Exception: Mutation was killed. (MUTATION_WAS_KILLED)
```

This can happen because:
- The mutation was explicitly cancelled with `KILL MUTATION`
- The ClickHouse server restarted during the mutation
- A timeout or resource limit was exceeded
- The mutation conflicted with another operation

## Checking Mutation Status

```sql
-- View all mutations and their status
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    is_done,
    parts_to_do,
    latest_fail_time,
    latest_fail_reason
FROM system.mutations
WHERE database = 'analytics'
ORDER BY create_time DESC;
```

A mutation with `is_done = 0` and a non-empty `latest_fail_reason` has stalled.

## Common Causes and Fixes

### Fix 1 - Killed by KILL MUTATION Command

If someone ran `KILL MUTATION`, re-submit the mutation:

```sql
-- Re-run the update/delete
ALTER TABLE analytics.events
UPDATE user_name = 'anonymized'
WHERE user_id = 12345;

-- Monitor the new mutation
SELECT mutation_id, command, is_done, parts_to_do
FROM system.mutations
WHERE table = 'events' AND is_done = 0;
```

### Fix 2 - Server Restart Interrupted the Mutation

ClickHouse resumes mutations automatically after restart. Check if it is progressing:

```sql
-- Watch parts_to_do decrease over time
SELECT
    mutation_id,
    parts_to_do,
    parts_to_do_names
FROM system.mutations
WHERE table = 'events' AND is_done = 0;
```

If `parts_to_do` is not decreasing, check background merge threads:

```sql
-- Ensure background mutations are running
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%Mutation%';
```

### Fix 3 - Increase Background Processing Threads

```xml
<!-- config.xml -->
<background_pool_size>16</background_pool_size>
<background_schedule_pool_size>16</background_schedule_pool_size>
```

After editing the config, apply the change (note that only increases take effect at runtime — lowering the pool requires a server restart):

```sql
SYSTEM RELOAD CONFIG;
```

### Fix 4 - Use Lightweight Deletes Instead of Mutations

For delete operations, ClickHouse 22.8+ supports lightweight deletes that avoid the full mutation rewrite. Lightweight DELETE became generally available in 23.3 and is enabled by default; on 22.8–23.2 you need to enable the experimental flag first:

```sql
-- Only required on ClickHouse 22.8 – 23.2
SET allow_experimental_lightweight_delete = 1;

-- Delete rows without a full mutation
DELETE FROM analytics.events WHERE event_date < '2023-01-01';
```

### Fix 5 - Cancel a Stuck Mutation and Retry with Smaller Batches

```sql
-- Cancel stuck mutation
KILL MUTATION WHERE database = 'analytics' AND table = 'events' AND mutation_id = 'mutation_123';

-- Re-apply in date-bounded batches
ALTER TABLE analytics.events
UPDATE status = 'archived'
WHERE status = 'old' AND event_date = '2024-01-01';

-- Repeat for each partition
ALTER TABLE analytics.events
UPDATE status = 'archived'
WHERE status = 'old' AND event_date = '2024-01-02';
```

## Preventing Mutations from Being Killed

### Keep Nondeterministic Functions Consistent Across Replicas

Mutations that use functions like `now()` can diverge between replicas and cause retries or aborts. Enabling `mutations_execute_nondeterministic_on_initiator` evaluates these functions on the initiator and replaces them with literals, keeping replicas in sync:

```xml
<!-- users.xml -->
<profiles>
  <default>
    <mutations_execute_nondeterministic_on_initiator>1</mutations_execute_nondeterministic_on_initiator>
  </default>
</profiles>
```

### Monitor Mutation Queue Length

```sql
-- Alert if too many pending mutations
SELECT
    table,
    count() AS pending_mutations,
    sum(parts_to_do) AS total_parts_remaining
FROM system.mutations
WHERE is_done = 0
GROUP BY table;
```

## Summary

"Mutation was killed" errors in ClickHouse occur when a background ALTER UPDATE or ALTER DELETE operation is terminated before completion. Check `system.mutations` for the failure reason, restart stuck mutations by re-submitting the command, and ensure background threads are not starved. For frequent large deletes, switch to lightweight deletes or TTL policies to avoid the overhead of traditional mutations entirely.
