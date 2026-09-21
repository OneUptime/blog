# How to Enable PostgreSQL Subscriber Triggers and Measure Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Performance, Monitoring

Description: Enable selected replica triggers on PostgreSQL subscribers and measure their cost with controlled workloads and function statistics.

A subscriber may need a local audit trail or a derived table that the publisher does not maintain. Adding a normal trigger is not enough: logical replication sessions use `session_replication_role = replica`, so ordinary triggers do not fire. Enable only the trigger whose side effects you have designed for replicated changes.

The examples target PostgreSQL 18 and an existing subscription whose `public.orders` table has finished initial synchronization. The table has a bigint primary key named `id`. Run the trigger DDL as its owner on the subscriber.

## Choose the trigger mode and timing

Use `ENABLE REPLICA` when only replication sessions should invoke the trigger. Use `ENABLE ALWAYS` when both normal application writes and replication should invoke it. Plain `ENABLE TRIGGER` restores the ordinary origin-session behavior. These are table-level trigger properties, not subscription settings. [ALTER TABLE trigger modes](https://www.postgresql.org/docs/18/sql-altertable.html)

Ongoing logical apply fires eligible row triggers, not statement triggers. Initial synchronization behaves like `COPY`, so eligible insert statement triggers can fire there as well. Benchmark and validate those phases separately. [Logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html)

An `AFTER ROW` trigger is a useful starting point for an audit side effect because it does not rewrite incoming values:

```sql
CREATE TABLE public.order_replication_audit (
    audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL,
    operation text NOT NULL,
    observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION public.audit_replicated_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.order_replication_audit(order_id, operation)
        VALUES (OLD.id, TG_OP);
        RETURN OLD;
    END IF;

    INSERT INTO public.order_replication_audit(order_id, operation)
    VALUES (NEW.id, TG_OP);
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_replicated_order
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_replicated_order();

ALTER TABLE public.orders
ENABLE REPLICA TRIGGER audit_replicated_order;
```

Keep the audit table outside any publication that would send it back into this data flow. Its identity sequence is local and must have sufficient capacity. Ensure the role used while applying `orders` can insert into the audit table; creating both tables under the same intended owner simplifies that arrangement. Automatic generation of this identity column does not require a separate sequence grant.

With PostgreSQL 18's default subscription behavior, apply switches to each target table owner. A trigger's access to other objects therefore depends on that ownership and its grants. Avoid changing `run_as_owner` merely to hide a permission error. [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html)

## Verify behavior before timing it

On a staging publisher, perform one insert, one update, and one delete of a known order. Wait for the subscriber, then inspect:

```sql
SELECT order_id, operation, observed_at
FROM public.order_replication_audit
WHERE order_id = 900001
ORDER BY audit_id;
```

Expect three rows in the corresponding order. Confirm that an ordinary subscriber-side transaction does not create an audit row when the trigger is in replica mode. Roll that local test back to avoid divergence. If production must reject local writes, retain its existing access controls; a replica trigger does not impose that restriction.

Inventory the configured mode rather than relying on a migration log:

```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass
  AND NOT tgisinternal;
```

## Measure marginal cost

Run two otherwise identical staging experiments with the same batch size, transaction size, indexes, hardware, and subscriber query load. In the first, leave the trigger in ordinary mode. In the second, enable replica mode. Use fresh, nonoverlapping order IDs and wait for the first run to drain before starting the next.

Measure publisher transaction completion, time until the final batch is visible on the subscriber, subscriber CPU and write throughput, and audit-table growth. Report medians and the slowest runs; one timing is vulnerable to cache and checkpoint effects.

For a PL/pgSQL function, an administrator can temporarily enable function statistics on the subscriber:

```sql
ALTER SYSTEM SET track_functions = 'pl';
SELECT pg_reload_conf();
```

Read snapshots before and after each workload. Before the first tracked call, this query can return no row; use zero as the initial baseline in that case:

```sql
SELECT calls, total_time, self_time
FROM pg_stat_user_functions
WHERE funcid = 'public.audit_replicated_order()'::regprocedure;
```

Compute `(after.total_time - before.total_time) / (after.calls - before.calls)` for average milliseconds per invocation only when the call delta is positive and the statistics have not been reset between snapshots. The ordinary-mode replication baseline should have no calls, so its per-invocation average is undefined. The counters are cumulative and can be reported with a delay; read them after the worker becomes idle, using fresh transactions. Their delta isolates function time but does not capture every downstream storage or checkpoint cost. [PostgreSQL statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)

## Roll back deliberately

If the function raises an error, the replication transaction cannot complete. Repair the function or its permissions and observe the worker retry. If `disable_on_error = true` disabled the subscription, re-enable it with `ALTER SUBSCRIPTION subscription_name ENABLE` after the repair. Disabling required auditing is a business decision because resumed transactions would then leave no audit trail.

For an approved rollback to ordinary trigger behavior:

```sql
ALTER TABLE public.orders ENABLE TRIGGER audit_replicated_order;
```

Restore the previous `track_functions` setting after measurement. Retain the audit rows for inspection, and verify both resumed replication and the absence of unexpected side effects before deploying the chosen mode to production.
