# How to Capture Runtime Data Lineage for Dynamic SQL That Static Parsers Miss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, OpenLineage, SQL, Observability, Data Pipeline

Description: Capture the identifiers and datasets selected at runtime, then emit trustworthy lineage for generated SQL, procedures, and parameterized jobs.

---

Static analysis sees the code that might run. Dynamic SQL chooses the code that did run only after configuration, templates, branches, and stored procedures have resolved. A job such as this can target a different table on every invocation:

```python
source = allowed_sources[tenant]
target = f"analytics.daily_orders_{run_date:%Y%m%d}"
sql = f"INSERT INTO {target} SELECT * FROM {source} WHERE ordered_at < %s"
cursor.execute(sql, (cutoff,))
```

The bind value does not change lineage, but the two identifiers do. A repository parser cannot know their runtime values. The reliable capture point is the component that has both the final identifiers and the execution outcome.

## Define observed lineage separately from declared lineage

Keep two evidence classes:

- **Declared lineage** comes from pipeline definitions, templates, and static SQL. It describes possible or intended dependencies.
- **Observed lineage** comes from a particular run after identifiers resolve. It describes the datasets actually read or written.

Do not silently merge them. Store an evidence field such as `STATIC`, `RUNTIME_DRIVER`, `DATABASE_LOG`, or `MANUAL`, plus producer version and capture time. When the declared and observed graphs differ, the difference is a useful alert rather than something to hide.

## Capture at the narrowest trustworthy boundary

Instrumentation is most accurate when it sits close to execution:

1. A framework or operator integration that already knows input and output objects.
2. A database client wrapper around `execute` and `executemany`.
3. A stored procedure that writes an audit row for its resolved operations.
4. Database audit or statement logs as a fallback.

The application layer knows job identity and template variables. The database layer knows what arrived and whether it succeeded. In high-value pipelines, capture both and reconcile them by a propagated run ID.

Add the run ID to the database session without putting it in a table name. For PostgreSQL, an application name is easy to inspect:

```python
run_id = "7bf9fd33-417f-4f64-91eb-d69458cb292c"
conn = psycopg.connect(
    dsn,
    application_name=f"lineage:{run_id}",
)
```

Also include the orchestrator run ID in the lineage event. Never derive identity from timestamps alone because retries can overlap.

## Separate identifiers from values

Parameterized values should stay parameterized. Capturing literal customer IDs, email addresses, or tokens in a lineage service creates an unnecessary sensitive-data copy. Record the query template or a redacted normalized form:

```sql
INSERT INTO analytics.daily_orders_20260907
SELECT *
FROM tenant_42.orders
WHERE ordered_at < ?
```

Identifiers cannot normally be passed as bind parameters. Resolve them through an allowlist and capture the canonical identifier separately:

```python
from psycopg import sql

source_schema = allowed_tenants[tenant]
statement = sql.SQL("""
    INSERT INTO analytics.daily_orders
    SELECT order_id, net_amount
    FROM {}.orders
    WHERE ordered_at < %s
""").format(sql.Identifier(source_schema))

cursor.execute(statement, (cutoff,))
observed_input = f"warehouse.{source_schema}.orders"
observed_output = "warehouse.analytics.daily_orders"
```

This approach prevents SQL injection and makes the selected dataset explicit without saving the cutoff value.

## Emit the run only after the evidence is known

OpenLineage models a recurring job separately from a run. Reuse one UUID throughout the run cycle. A normal batch emits `START`, then `COMPLETE`; emit `FAIL` or `ABORT` for a terminal failure instead.

The official Python client can emit a runtime boundary directly:

```python
from datetime import datetime, timezone
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState
from openlineage.client.uuid import generate_new_uuid

client = OpenLineageClient()
run = Run(str(generate_new_uuid()))
job = Job(namespace="scheduler://production", name="orders.materialize_daily")

def now():
    return datetime.now(timezone.utc).isoformat()

client.emit(RunEvent(
    eventType=RunState.START,
    eventTime=now(),
    run=run,
    job=job,
    producer="https://pipelines.example/lineage/1.3.0",
))

# Execute the SQL here and resolve actual datasets.

client.emit(RunEvent(
    eventType=RunState.COMPLETE,
    eventTime=now(),
    run=run,
    job=job,
    producer="https://pipelines.example/lineage/1.3.0",
    inputs=[Dataset(
        namespace="postgres://warehouse.example:5432",
        name="warehouse.tenant_42.orders",
    )],
    outputs=[Dataset(
        namespace="postgres://warehouse.example:5432",
        name="warehouse.analytics.daily_orders",
    )],
))
```

In production, put terminal emission in `try`, `except`, and `finally` logic so a database failure becomes a `FAIL` event. Do not emit `COMPLETE` merely because the client submitted a statement; wait for successful execution or transaction commit, according to the job's contract.

## Handle procedures and multi-statement jobs

A procedure call can hide many reads and writes:

```sql
CALL reporting.refresh_tenant_summary('tenant_42');
```

The call text alone provides no table lineage. Choose one of these patterns:

- Instrument the procedure to append resolved object names to a transaction-scoped audit table.
- Capture its child statements from database auditing and associate them with session, transaction, and run IDs.
- Maintain declared procedure lineage, then mark it as declared rather than observed.

If one job independently writes several outputs, a plain list of all inputs and outputs can imply a Cartesian product. OpenLineage's Lineage Job Facet can state exact input-to-output edges. Use it when `input_a` produces only `output_a` and `input_b` produces only `output_b`.

Temporary tables need session identity too. Track their creation, consumption, and drop in statement order. Either retain them as temporary dataset nodes or collapse them after the run into physical source-to-target edges.

## Use query logs as a controlled fallback

PostgreSQL can log statements and can add session information through `log_line_prefix`. MySQL's general query log records each SQL statement received, but it is disabled by default and records receipt order, which can differ from execution order. MySQL Performance Schema statement history is bounded and discards old rows as new ones arrive.

These properties lead to several rules:

- Treat log capture as a stream with checkpoints, not an occasional scrape.
- Preserve connection, transaction, database, user, and server query identifiers.
- Wait for success evidence before creating a write edge.
- Redact literals before events leave the database security boundary.
- Measure dropped, truncated, or unparsable records.
- Keep log retention independent from lineage retention.

Logs can still miss SQL executed inside procedural code, truncate long text, or lack an orchestrator identity. Run a canary job with a known input and output on every deployment and assert that its lineage arrives exactly once.

## Reconcile runtime and static graphs

After each run, compare the observed edge set to the declared edge set:

```python
unexpected = observed_edges - declared_edges
not_observed = declared_edges - observed_edges

if unexpected:
    alert("new runtime dependency", sorted(unexpected))
```

An unexpected production input may indicate a feature flag, tenant routing error, or unreviewed procedure change. A declared edge that was not observed may simply be a branch that did not execute, so aggregate evidence over a suitable time window before removing it.

Track coverage with concrete counters: successful database statements, statements correlated to a run, statements parsed, writes with confirmed outputs, and events accepted by the lineage backend. A graph with no coverage signal looks complete even when half its events were dropped.

## Conclusion

Dynamic SQL lineage becomes dependable when capture happens after identifiers resolve and before execution context disappears. Keep values redacted, correlate application and database evidence with one run ID, emit terminal state only after the outcome is known, and preserve the difference between declared and observed dependencies.

## Official Documentation

- [OpenLineage run cycle](https://openlineage.io/docs/spec/run-cycle/)
- [OpenLineage Python client usage](https://openlineage.io/docs/client/python/usage/)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [OpenLineage Lineage Job Facet](https://openlineage.io/docs/spec/facets/job-facets/lineage/)
- [PostgreSQL error reporting and logging](https://www.postgresql.org/docs/current/runtime-config-logging.html)
- [PostgreSQL application_name](https://www.postgresql.org/docs/current/runtime-config-logging.html#GUC-APPLICATION-NAME)
- [MySQL general query log](https://dev.mysql.com/doc/refman/8.4/en/query-log.html)
- [MySQL statement event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-tables.html)
