# How to Trace Lineage Through Procedures, Triggers, and Intermediate Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, SQL, PostgreSQL, Database, Data Engineering

Description: Combine database definitions, nested runtime evidence, and session-scoped identities to trace dependencies hidden behind SQL calls.

---

The statement visible to an orchestrator can be deceptively simple:

```sql
CALL reporting.refresh_daily_revenue('2026-09-08');
```

Inside that call, a procedure may create temporary tables, invoke another routine, and update a target whose trigger writes an audit table. A parser that sees only `CALL` cannot recover those edges. A parser that sees only today's procedure body can also be wrong about an older execution or a runtime branch.

Reliable lineage combines two evidence layers:

- design evidence from routine bodies, trigger definitions, and database catalogs
- runtime evidence from nested statements and successful transaction outcomes

Keep those layers distinguishable in the graph.

## Model the hidden execution boundaries

Represent routines and triggers as executable nodes, not only annotations on a table:

```text
orchestrator job
  -> calls procedure reporting.refresh_daily_revenue
  -> invokes trigger function audit.capture_revenue_change

procedure
  -> reads raw.orders
  -> writes temp daily_order_totals
  -> writes analytics.daily_revenue

trigger function
  -> writes audit.revenue_changes
```

This explains both data flow and execution ownership. A direct table-to-table projection can be derived for simple impact views without discarding the routine nodes from evidence storage.

Use stable identities that include engine, instance, database, schema, routine name, and overload signature where the engine permits overloaded routines. A name without argument types may identify several PostgreSQL functions.

## Inventory PostgreSQL trigger definitions

PostgreSQL stores table and view triggers in `pg_trigger`. Its `tgrelid` points to the relation and `tgfoid` points to the invoked function in `pg_proc`. An inventory query can retrieve non-internal triggers and their current definitions:

```sql
SELECT
  table_ns.nspname AS table_schema,
  table_rel.relname AS table_name,
  trig.tgname AS trigger_name,
  function_ns.nspname AS function_schema,
  proc.proname AS function_name,
  pg_get_triggerdef(trig.oid) AS trigger_definition,
  pg_get_function_identity_arguments(proc.oid) AS identity_arguments,
  pg_get_functiondef(proc.oid) AS function_definition
FROM pg_trigger AS trig
JOIN pg_class AS table_rel
  ON table_rel.oid = trig.tgrelid
JOIN pg_namespace AS table_ns
  ON table_ns.oid = table_rel.relnamespace
JOIN pg_proc AS proc
  ON proc.oid = trig.tgfoid
JOIN pg_namespace AS function_ns
  ON function_ns.oid = proc.pronamespace
WHERE NOT trig.tgisinternal;
```

This is a current-state snapshot. Archive it with database version, collection time, and a definition hash. If a trigger or procedure changes, today's definition does not prove what ran last month.

Internal constraint triggers are excluded above because they can overwhelm application lineage. Include them only if referential-integrity effects are part of the lineage contract.

PostgreSQL event triggers are stored separately in `pg_event_trigger` and react to DDL events, not ordinary table row changes. Do not mix them with `pg_trigger` records.

## Parse routine bodies as declared possibilities

Extract and parse static SQL in the routine body, including calls to other routines. Label those edges `DECLARED` or `POSSIBLE` until execution evidence supports them.

Static parsing will be incomplete when the routine uses:

- `EXECUTE` with concatenated identifiers
- conditionals that choose different tables
- loop-generated statements
- external-language functions
- session search paths or caller-dependent privileges
- remote database links or foreign-data wrappers

When dynamic identifiers come from a finite allowlist, expand them as possible targets and store the predicate that selects them. Never label every possible target as observed for every call.

## Capture nested statements at runtime

The strongest capture point is the database session that executes the resolved nested statement. Propagate an orchestrator run ID into the connection's application identity or session context so child statements can be joined back to the calling job.

PostgreSQL's `pg_stat_statements.track=all` includes nested statements executed inside functions, while the default `top` records only top-level statements. However, `pg_stat_statements` aggregates equivalent statement structures and retains a bounded number of entries. It is useful for coverage and discovery, not as a per-call execution ledger.

For targeted diagnosis, `auto_explain.log_nested_statements=on` makes statements inside functions eligible for execution-plan logging. `auto_explain` adds overhead, especially with analysis or per-node timing, so use duration thresholds or sampling and test it before production rollout.

Other engines may provide query history, audit events, extended events, or access history that exposes nested work. For each source, record whether it proves submission, successful statement completion, or durable commit.

## Trace trigger effects separately

A trigger's dependency has two parts:

1. The firing relation and event defined by `CREATE TRIGGER`.
2. The reads and writes performed by its function during this execution.

PostgreSQL supports `BEFORE`, `AFTER`, and `INSTEAD OF` triggers, at row or statement granularity where applicable. A `BEFORE` or `INSTEAD OF` trigger can change or skip the original operation. Therefore, seeing an attempted insert on the base table is not enough to assert both the base write and every trigger output.

Preserve trigger order, firing condition, enabled state, and transaction. Deferred constraint triggers can run later in the transaction. Publish durable write edges only after commit evidence when the source makes it available.

Avoid a simple rule that every update to a triggered table writes every object mentioned in the function. `WHEN` predicates and function branches can make that false.

## Give temporary objects execution-scoped identities

The name `tmp_revenue` is not globally unique. It may be recreated several times in one session and can exist simultaneously in many sessions. Identify a temporary dataset with at least:

```text
database instance + session ID + temporary schema + name + creation sequence
```

For example:

```text
postgres-temp://warehouse/session-4821/pg_temp_7/tmp_revenue#2
```

Process statements in order:

```sql
CREATE TEMP TABLE tmp_revenue AS
SELECT order_date, SUM(net_amount) AS revenue
FROM raw.orders
GROUP BY order_date;

INSERT INTO analytics.daily_revenue
SELECT * FROM tmp_revenue;

DROP TABLE tmp_revenue;
```

The evidence graph retains both edges through the temporary node. A display projection may collapse them to `raw.orders -> analytics.daily_revenue`, but only after verifying that no other statement added rows to or changed the temporary table.

Common table expressions are query-scoped logical intermediates, not persistent database assets. Keep them inside the expression graph unless users need statement-plan detail.

## Reconstruct a call tree before flattening

Correlate events using explicit identifiers where possible:

```text
pipeline run ID
  -> database session ID
  -> transaction ID
  -> top-level statement ID
  -> nested statement sequence
  -> trigger invocation
```

Wall-clock proximity is not enough when a pooled connection serves concurrent work. Preserve parent statement IDs or a database audit sequence if the engine supplies them.

Build the execution tree first, then derive lineage edges. This prevents a trigger fired by one statement from being attached to a neighboring statement in the same log stream.

## Handle recursion and cycles

Procedures can call procedures, and triggers can cause writes that fire more triggers. Protect the collector with:

- a maximum call depth
- a visited invocation identifier, not only a visited routine name
- statement and event count limits
- explicit recursion or cycle flags

A repeated routine name is not necessarily a cycle if it is called for distinct partitions. Conversely, flattening recursive calls into one node can hide an infinite-trigger incident. Keep execution instances separate from recurring routine definitions.

## Reconcile declared and observed lineage

For each successful procedure call, compare static possibilities with nested runtime evidence:

```python
unexpected = observed_edges - declared_edges
not_seen = declared_edges - observed_edges
```

An unexpected edge may reveal dynamic SQL, a changed search path, or a missing procedure version. A declared edge not seen in one call may be an untaken branch. Evaluate it over a complete schedule window before marking it stale.

Track these coverage counters:

- calls correlated to a session and transaction
- nested statements captured
- nested statements parsed
- trigger definitions versioned
- temporary object lifecycles closed
- successful writes with commit evidence
- unresolved dynamic identifiers

## Test with a purpose-built chain

Create a canary procedure that:

1. Reads a permanent source.
2. Builds and consumes a temporary table.
3. Writes a target with an `AFTER` trigger.
4. Makes the trigger write a separate audit table.
5. Runs one branch conditionally.
6. Rolls back one test invocation and commits another.

Assert the call tree, intermediate identities, committed edges, and absence of durable edges from the rollback. Repeat after database upgrades and collector configuration changes.

## Conclusion

Stored procedures and triggers hide executable steps behind small SQL calls, while temporary objects reuse names outside global catalog identity. Inventory versioned definitions for design lineage, capture nested runtime statements for observed lineage, scope intermediates to their creation instance, and wait for transaction outcome before publishing writes. Flatten only for display, never at the expense of evidence.

## Official Documentation

- [PostgreSQL `pg_trigger` catalog](https://www.postgresql.org/docs/current/catalog-pg-trigger.html)
- [PostgreSQL `pg_proc` catalog](https://www.postgresql.org/docs/current/catalog-pg-proc.html)
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL `CREATE TRIGGER`](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/triggers.html)
- [PostgreSQL `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL `auto_explain`](https://www.postgresql.org/docs/current/auto-explain.html)
- [PostgreSQL temporary table syntax](https://www.postgresql.org/docs/current/sql-createtable.html)
