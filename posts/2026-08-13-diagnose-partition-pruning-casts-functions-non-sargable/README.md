# Why Did Partition Pruning Fail? Diagnose Casts, Functions, and Predicates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Partition Pruning, Query Optimization, EXPLAIN, SQL

Description: Diagnose missing partition pruning by inspecting the actual predicate, partition expression, data types, parameters, and execution plan, then rewrite filters without changing semantics.

---

Partition pruning is a proof. The optimizer removes a partition only when it can prove from the partition bounds and query conditions that the partition cannot contain a matching row. A predicate may be logically obvious to a developer and still not have the form, type behavior, or known value the optimizer needs.

When pruning fails, do not begin by adding an index. PostgreSQL pruning uses partition bounds rather than indexes, and MySQL also treats pruning separately from index access. First establish which partitions the engine selected; then isolate why the condition could not narrow them.

## Reproduce the Exact Table and Query

Capture the deployed definition, not an ORM model or migration file. In <code>psql</code>:

~~~sql
\d+ public.events

SELECT *
FROM pg_partition_tree('public.events'::regclass)
ORDER BY level, relid::text;

SELECT pg_get_partkeydef('public.events'::regclass);
~~~

<code>pg_partition_tree</code> shows the actual hierarchy. <code>pg_get_partkeydef</code> returns the partition key definition. Also inspect leaf bounds:

~~~sql
SELECT c.oid::regclass AS relation,
       pg_get_expr(c.relpartbound, c.oid) AS bound
FROM pg_class AS c
WHERE c.oid IN (
    SELECT relid
    FROM pg_partition_tree('public.events'::regclass)
    WHERE isleaf
)
ORDER BY c.oid::regclass::text;
~~~

For MySQL 8.4, use <code>SHOW CREATE TABLE</code> and <code>INFORMATION_SCHEMA.PARTITIONS</code>. The partitioning expression may be <code>YEAR(created_at)</code>, <code>TO_DAYS(created_at)</code>, a column-list definition, or something else. A query that prunes one layout may not prune another.

Record the exact bound parameter values and types sent by the driver. Replacing <code>$1</code> with a hand-written date literal can change both type resolution and when a value becomes known.

## Confirm Pruning Is Enabled and Observe It

PostgreSQL's <code>enable_partition_pruning</code> is on by default:

~~~sql
SHOW enable_partition_pruning;

EXPLAIN (ANALYZE, BUFFERS, SETTINGS, VERBOSE)
SELECT *
FROM events
WHERE occurred_at >= TIMESTAMPTZ '2026-08-13 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-14 00:00:00+00';
~~~

<code>EXPLAIN ANALYZE</code> executes the statement. Use plain <code>EXPLAIN</code> first for expensive or mutating statements. In a static plan, unrelated partitions should be absent. With execution-time pruning, inspect <code>Subplans Removed</code>, <code>loops</code>, and child nodes marked <code>(never executed)</code>.

For MySQL, traditional <code>EXPLAIN</code> includes a <code>partitions</code> column:

~~~sql
EXPLAIN FORMAT=TRADITIONAL
SELECT *
FROM events
WHERE occurred_at >= '2026-08-13 00:00:00'
  AND occurred_at <  '2026-08-14 00:00:00';
~~~

Do not use explicit MySQL <code>PARTITION (...)</code> selection as the initial “fix.” That directs access manually and can conceal a predicate or schema mismatch. Use it only when the application deliberately owns physical partition names.

## Look for a Function on the Partition Column

Suppose PostgreSQL range-partitions a <code>timestamptz</code> column directly. This expression changes the value the condition compares:

~~~sql
WHERE occurred_at::date = DATE '2026-08-13'
~~~

The partition bounds are on <code>occurred_at</code>, not generally on the result of <code>occurred_at::date</code>. An index on the raw timestamp also cannot directly navigate an arbitrary function of that column. For a UTC reporting day evaluated in a UTC session, write the equivalent half-open range on the key:

~~~sql
WHERE occurred_at >= TIMESTAMPTZ '2026-08-13 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-14 00:00:00+00'
~~~

The rewrite must preserve the application's time-zone semantics. Casting a <code>timestamptz</code> to <code>date</code> uses the session time zone. The shown UTC bounds are equivalent to the cast predicate only when the session <code>TimeZone</code> is UTC. Otherwise, derive the half-open instants for the same session or application reporting zone. For an America/New_York business day, calculate the correct instants explicitly and test daylight-saving transitions.

The same diagnosis applies to:

~~~sql
WHERE date_trunc('day', occurred_at) = TIMESTAMPTZ '2026-08-13 00:00:00+00'
WHERE extract(year FROM occurred_at) = 2026
WHERE tenant_id + 0 = 42
~~~

Do not mechanically strip functions. If the table is partitioned by that exact allowed expression, the expression may be the correct pruning key. PostgreSQL permits partition keys that are expressions, with limitations on parent-level unique constraints. Compare the query expression to the deployed partition-key definition.

MySQL supports pruning for specific functions and partition layouts. Its 8.4 manual documents pruning support for <code>TO_DAYS()</code>, <code>TO_SECONDS()</code>, <code>YEAR()</code>, and <code>UNIX_TIMESTAMP()</code> in the relevant partitioning context. That is not a general promise that any deterministic-looking wrapper prunes. Check the current manual and the plan.

## Move Casts to Constants Carefully

A common failure shape casts the partition column because the parameter has the wrong type:

~~~sql
WHERE event_id::text = $1
~~~

If UUID value equality is intended, bind the parameter using the column's native type, or cast the parameter:

~~~sql
WHERE event_id = $1::uuid
~~~

This is not identical to comparing UUID output as text. PostgreSQL accepts several noncanonical UUID input forms but always outputs the canonical form, and invalid UUID text raises an error when cast. Validate that those input semantics are intended.

For a timestamp key, prefer a timestamp parameter rather than comparing formatted text. Text ordering, collations, invalid inputs, and time zones can change semantics.

Not every visible cast blocks pruning. PostgreSQL may insert an implicit cast around a constant while still deriving a compatible bound. The rule is empirical: inspect the expression and plan on the supported server version. Avoid folklore such as “all casts disable pruning.”

Check JDBC, Go, Python, and ORM bindings. An “unknown” string literal in an interactive test may resolve differently from a prepared parameter transmitted as <code>varchar</code>. Log parameter type OIDs or driver types where possible.

## Normalize Boolean Structure

Pruning becomes harder when a branch can match any partition:

~~~sql
WHERE occurred_at >= $1
   OR tenant_id = $2
~~~

The tenant branch has no time restriction, so every time partition may contain a match. Rewriting to <code>UNION ALL</code> can sometimes create independently optimizable branches, but naive branches duplicate rows when both predicates match. A bag-preserving rewrite generally needs <code>UNION ALL</code> plus a null-safe anti-overlap condition, such as adding <code>AND (occurred_at &gt;= $1) IS NOT TRUE</code> to the tenant branch. Plain <code>UNION</code> is equivalent only when projected rows are guaranteed unique or set semantics are intended; otherwise it can collapse distinct source rows with identical projected values. Each approach has its own cost.

Other patterns to inspect include:

- <code>COALESCE(partition_key, fallback)</code>;
- <code>CASE</code> expressions over the key;
- arithmetic that obscures a direct bound;
- <code>NOT</code> and broad inequality predicates;
- a join where the key value is not known until execution;
- a subquery or prepared parameter known only at execution;
- row-level security predicates combined with application filters.

Parameters do not automatically prevent PostgreSQL pruning. Current PostgreSQL can prune during executor initialization and when execution parameters change, including parameterized nested-loop joins. A generic prepared plan may therefore show an <code>Append</code> containing many potential children while <code>EXPLAIN ANALYZE</code> proves that most never execute.

## Distinguish Constraint Exclusion

PostgreSQL declarative partition pruning uses the internal partition bounds. Constraint exclusion is a separate mechanism that examines <code>CHECK</code> constraints. It is plan-time only and slower to apply broadly. Extra leaf constraints may let constraint exclusion eliminate additional children, but changing <code>constraint_exclusion</code> is not the normal remedy for a declaratively partitioned table whose partition-key predicate is malformed.

This distinction matters during migrations from inheritance-based partitioning. An old guide may discuss <code>constraint_exclusion</code> where a current declarative table should be using <code>enable_partition_pruning</code>.

## Use a One-Change Diagnostic Matrix

Run controlled variants and record selected leaves:

| Variant | Purpose |
| --- | --- |
| typed literal on raw key | prove static pruning is possible |
| bound native-type parameter | test driver and execution pruning |
| function on key | reproduce expression mismatch |
| cast on parameter | preserve raw-key comparison |
| cast on key | isolate non-sargable form |
| OR branch without key | expose logically broad condition |

Keep result semantics identical when comparing performance. <code>BETWEEN</code> is inclusive at both ends, while time partitions usually use half-open ranges. Replacing it with an incorrect upper bound can create duplicate boundary results or omit fractional timestamps.

After pruning works, optimize access inside the remaining leaves. Add or adjust indexes only from the residual predicate and ordering requirements. After representative loading, run PostgreSQL <code>ANALYZE events</code> or MySQL <code>ANALYZE TABLE events</code> so row estimates are meaningful.

## Official Documentation

- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Planner Method Configuration](https://www.postgresql.org/docs/current/runtime-config-query.html#RUNTIME-CONFIG-QUERY-ENABLE)
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL: PREPARE](https://www.postgresql.org/docs/current/sql-prepare.html)
- [PostgreSQL: System Information Functions](https://www.postgresql.org/docs/current/functions-info.html)
- [MySQL 8.4: Partition Pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- [MySQL 8.4: Partitioning Limitations Relating to Functions](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-functions.html)
- [MySQL 8.4: Obtaining Information About Partitions](https://dev.mysql.com/doc/refman/8.4/en/partitioning-info.html)
- [MySQL 8.4: EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)

## Conclusion

Missing pruning is usually a failed proof, not an absent index. Compare the deployed partition expression with the exact predicate and parameter types, observe selected children in <code>EXPLAIN</code>, and isolate functions, casts, broad Boolean branches, and runtime-only values one change at a time. Rewrite toward direct, correctly typed bounds only when the rewrite preserves time zones, inclusivity, null behavior, and duplicate semantics. Once the engine reaches the right partitions, tune access within them.
