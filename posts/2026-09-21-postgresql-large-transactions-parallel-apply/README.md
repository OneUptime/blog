# How to Reduce Logical Replication Lag from Large PostgreSQL Transactions with Parallel Apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Performance, Monitoring

Description: Use PostgreSQL parallel apply for streamed transactions, budget worker capacity, and compare commit-to-visibility latency with a controlled workload.

A large transaction can leave a logical subscriber apparently quiet and then force it to perform a long burst of work after the publisher commits. Streaming with parallel apply can move some of that application work earlier, while the source transaction is still open.

This walkthrough uses PostgreSQL 18 on both ends. PostgreSQL 16 introduced the `parallel` streaming option, but defaults differ: version 16 defaults to `off`, while version 18 defaults to `parallel`. Inspect the existing subscription rather than assuming its behavior from the server version. [PostgreSQL 16 CREATE SUBSCRIPTION](https://www.postgresql.org/docs/16/sql-createsubscription.html), [PostgreSQL 18 CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html)

## Establish what streaming changes

With streaming disabled, the publisher decodes the complete transaction before sending it. With `streaming = on`, streamed changes are written to temporary files on the subscriber and applied after source commit. With `streaming = parallel`, an available parallel apply worker can apply incoming streamed changes before that commit arrives. If no such worker is available, PostgreSQL falls back to temporary files.

This does not make half a transaction visible to readers. Nor does it split one giant transaction across an arbitrary number of workers. The practical benefit depends on transaction shape, available workers, storage, and how much work can overlap the publisher's remaining execution time.

Check the subscriber's current settings:

```sql
SELECT subname, substream
FROM pg_subscription
WHERE subname = 'orders_sub';

SELECT name, setting, context, pending_restart
FROM pg_settings
WHERE name IN (
    'max_worker_processes',
    'max_logical_replication_workers',
    'max_parallel_apply_workers_per_subscription',
    'max_sync_workers_per_subscription'
)
ORDER BY name;
```

`substream` records the subscription's streaming mode; `p` means parallel. Check the catalog reference for the exact server version when interpreting encoded values. [pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html)

## Budget workers before raising limits

The logical worker pool is shared by leader apply workers, initial synchronization workers, and parallel apply workers. The broader background worker pool also serves other features. Raising only the per-subscription parallel limit cannot create global capacity. [Logical replication configuration](https://www.postgresql.org/docs/18/logical-replication-config.html)

For a staging server with two subscriptions, consider a budget of two leaders, four parallel workers, and two synchronization workers, plus headroom. Record the actual values appropriate to that server in configuration management. Inspect `context` and `pending_restart` to distinguish reloadable changes from those requiring a restart.

Do not confuse initial-copy parallelism with ongoing transaction apply. `max_sync_workers_per_subscription` controls table synchronization; changing it does not accelerate an already synchronized table's large transactions.

Enable parallel streaming explicitly:

```sql
ALTER SUBSCRIPTION orders_sub SET (streaming = parallel);
```

On the publisher, inspect `logical_decoding_work_mem`. Streaming is relevant when decoding needs to stream a transaction; tiny transactions may never exercise the path. Lowering that memory setting purely to obtain an impressive benchmark can change the workload substantially, so retain production-like settings for the acceptance test. [Resource consumption settings](https://www.postgresql.org/docs/18/runtime-config-resource.html)

## Measure a repeatable workload

Use a dedicated staging table on both servers:

```sql
CREATE TABLE public.apply_benchmark (
    id bigint PRIMARY KEY,
    batch_id bigint NOT NULL,
    payload text NOT NULL
);
```

Add it to the tested publication and refresh the subscription. Wait until its table synchronization state is ready. Choose a batch size that produces a representative WAL volume without threatening available disk.

On the publisher, run one transaction, using a fresh ID range for every run:

```sql
BEGIN;
INSERT INTO public.apply_benchmark(id, batch_id, payload)
SELECT n, 1, repeat(md5(n::text), 64)
FROM generate_series(1, 100000) AS n;
COMMIT;
```

Record the publisher commit completion time and poll this on the subscriber from new transactions:

```sql
SELECT count(*)
FROM public.apply_benchmark
WHERE batch_id = 1;
```

Record when the count first reaches 100000. Compare the interval between publisher commit and subscriber visibility across several runs using `streaming = on` and `streaming = parallel`. Use a monotonic timer in the test client so wall-clock synchronization does not distort the comparison.

Also compare total elapsed time from the start of the source transaction. A lower post-commit delay can be valuable even when total work and resource usage do not decrease.

## Observe workers and investigate regressions

During the workload, inspect PostgreSQL 18 worker activity:

```sql
SELECT subname, worker_type, pid, leader_pid, relid
FROM pg_stat_subscription
WHERE subname = 'orders_sub';
```

Parallel workers can disappear after their work completes, so sample during the transaction. The view's available columns vary by major version; this query is for version 18. [Subscription statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)

If parallel workers do not appear, inspect worker limits, publisher transaction size, and logs before assuming a configuration failure. If performance worsens, inspect subscriber I/O saturation, indexes, enabled replica triggers, and concurrent query load. More simultaneous work can expose a storage bottleneck.

Rollback is an explicit subscription change:

```sql
ALTER SUBSCRIPTION orders_sub SET (streaming = on);
```

After any change, verify the benchmark's exact row count and continued application of a small subsequent transaction. For apply errors, preserve the transaction and repair the underlying schema or data problem; skipping transactions to improve lag numbers compromises correctness. Adopt parallel apply when the measured visibility improvement fits the subscriber's CPU, memory, and disk budget.
