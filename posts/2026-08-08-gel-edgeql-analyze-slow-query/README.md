# Diagnose a Slow EdgeQL Query With Analyze

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, EdgeQL, ANALYZE, Query Performance, Indexes

Description: Diagnose slow EdgeQL with Gel analyze, realistic cardinalities, expanded plans, query statistics, and measured index changes.

---

A slow EdgeQL query is not enough evidence for adding an index. The delay may come from scanning too many objects, returning a large nested shape, repeating work across a multi link, using an expression that does not match an index, or simply testing a cold or unrepresentative environment.

Gel provides two complementary views:

- `analyze` explains one execution of one query; and
- `sys::QueryStats`, available since Gel 6, aggregates planning and execution statistics across calls.

Use aggregate statistics to find important queries, then use `analyze` with representative parameters to understand one of them.

## Capture the Exact Query First

Preserve the EdgeQL text, its parameters, target branch, active globals, result shape, and observed duration. These details affect both meaning and work performed.

For example, this query is more specific than the report that incident search is slow:

```edgeql
select Incident {
  id,
  title,
  created_at,
  owner: {
    id,
    name
  }
}
filter .tenant.id = <uuid>$tenant_id
  and .status = <IncidentStatus>$status
order by .created_at desc
limit 50;
```

Record whether the production request also supplies access-policy globals. A plan tested as a superuser without those globals may see a different visible set and different predicates from the application request.

Confirm the branch explicitly when there is any doubt:

```bash
gel query 'select sys::get_current_branch()'
```

Do not tune a local sample containing 200 incidents and assume the result transfers to a production branch containing millions.

## Run Analyze in the REPL or CLI

In a Gel REPL, prepend `analyze`:

```edgeql
analyze select Incident {
  id,
  title,
  created_at
}
filter .status = <IncidentStatus>'open'
order by .created_at desc
limit 50;
```

Then request fine-grained output:

```text
\expand
```

The standalone command accepts a quoted query and can print expanded output immediately:

```bash
gel analyze --expand \
  "select Incident { id, title, created_at }
   filter .status = <IncidentStatus>'open'
   order by .created_at desc
   limit 50"
```

The Gel UI also visualizes analyzed queries. The text and visual views represent the same investigation at different levels of detail, so use whichever makes it easiest to map expensive plan nodes back to the EdgeQL shape.

## Read the Coarse Plan From the Top Down

The documented coarse output includes `Time`, `Cost`, `Loops`, `Rows`, `Width`, and `Relations` for each mapped part of the query.

Read them as signals, not as isolated verdicts:

- `Time` is measured execution time in milliseconds for the node across all loops; plan-node timings include child work and are not additive.
- `Cost` is the planner's estimate for comparing possible plans, not application latency in milliseconds.
- `Loops` is the number of times a plan node was executed.
- `Rows` is the average number of rows emitted per loop; multiply it by `Loops` to estimate total rows emitted by the node.
- `Width` is the planner's estimated average output-row width in bytes.
- `Relations` maps the work to Gel object types and links.

A node with modest work per loop can dominate after many loops. A node with a large `Rows × Loops` product may be acceptable if the query intentionally exports that volume, but suspicious when the final result contains only 50 objects. A wide nested shape can spend meaningful time producing and transferring data even after object lookup is efficient.

Use expanded output to inspect the lower-level access path. Gel's analyzer maps EdgeQL portions to the underlying PostgreSQL plan, so exact plan-node names can change as the schema, data statistics, server version, and query change.

## Check Result Cardinality Before Indexes

In EdgeQL every value is a set, and cardinality describes how many elements it may contain. Gel tracks cardinality statically for query validation, while the actual number of matching objects determines runtime work.

Start with the top-level candidate set:

```edgeql
select count((
  select Incident
  filter .tenant.id = <uuid>$tenant_id
    and .status = <IncidentStatus>$status
));
```

Then check each multi path returned in the shape. This query caps comments per incident:

```edgeql
select Incident {
  id,
  title,
  recent_comments := (
    select .comments
    order by .created_at desc
    limit 10
  ) {
    id,
    body,
    created_at
  }
}
filter .tenant.id = <uuid>$tenant_id
order by .created_at desc
limit 50;
```

The outer `limit 50` does not automatically limit the number of comments inside every incident's shape. Bound multi relationships independently when the product requirement permits it.

For approximate type size, Gel 7 and later expose a statistics-based helper:

```edgeql
select sys::approximate_count(introspect Incident);
```

The result is deliberately approximate. Use it for scale context, not billing, pagination totals, or correctness checks.

Also distinguish a cardinality assertion from a performance limit. `assert_single()` fails if a set contains more than one element, while `limit 1` silently chooses at most one. Neither substitutes for an `exclusive` constraint when the business key must be unique.

## Trace Paths That Multiply Work

Review each path in filters and computed fields. A single link stays at most one target; a multi link can contribute many targets. Nested multi shapes are often legitimate, but each needs an intentional bound or an acceptance that the response grows with related data.

Computed properties and links are evaluated from their EdgeQL expressions when queried. If a frequently selected computed field traverses a large set or performs an aggregate, analyze the query both with and without that field. This isolates lookup cost from shape-computation cost without changing semantics accidentally.

Access policies can also filter object types during selection. Reproduce the request's globals and role so the plan includes the same policy expressions and visible data. Do not disable policies for a benchmark and then compare that result directly with application latency.

## Verify Whether an Index Is Eligible and Used

Gel automatically indexes object IDs, links, and properties with `exclusive` constraints. A new explicit index on any of these is usually redundant.

For other filters, declare indexes in schema. A simple example is:

```gel
type Incident {
  required tenant: Tenant;
  required status: IncidentStatus;
  required created_at: datetime;

  index on ((.status, .created_at));
}
```

The right index depends on the complete predicate. If tenants are large and queries are tenant-scoped, test a tuple that reflects that access pattern rather than copying the example blindly:

```gel
type Incident {
  required tenant: Tenant;
  required status: IncidentStatus;
  required created_at: datetime;

  index on ((.tenant, .status, .created_at));
}
```

After applying the migration in a safe branch, rerun the same query, parameters, and globals. In expanded output, inspect the access path for the relevant relation and compare rows, loops, time, and total latency.

The PostgreSQL planner may still choose a sequential scan. That can be correct when the type is small or when the predicate matches a large fraction of objects. The existence of an index does not require its use.

## Match Expression Indexes Exactly

If the filter uses a normalized expression, a plain property index may not be the relevant candidate:

```edgeql
select User {
  id,
  display_name
}
filter str_lower(.display_name) = str_lower(<str>$name);
```

The corresponding expression index is:

```gel
type User {
  required display_name: str;

  index on (str_lower(.display_name));
}
```

Gel requires an index expression to be immutable and singleton. Keep application queries aligned with the indexed normalization expression, then confirm eligibility through `analyze`. Similar-looking expressions are not automatically the same planner expression.

## Use QueryStats to Prioritize Work

Gel 6 introduced `sys::QueryStats`. This query finds statements with high cumulative execution time in the current branch:

```edgeql
select sys::QueryStats {
  query,
  query_type,
  tag,
  calls,
  rows,
  plans,
  total_plan_time,
  mean_plan_time,
  total_exec_time,
  mean_exec_time
}
filter .branch.name = sys::get_current_branch()
order by .total_exec_time desc
limit 20;
```

Interpret aggregate fields in context:

- high `mean_exec_time` identifies queries that are slow on average;
- high `total_exec_time` identifies workload impact;
- `calls` distinguishes a rarely executed statement from a hot path;
- `rows` is the cumulative number of rows retrieved or affected, so compare it with `calls` to gauge average per-call volume; and
- `plans` and planning times show how much time is spent preparing backend plans.

The server caches planned statements and reuses them when possible, so execution and planning totals answer different questions. Query tags can help distinguish origins when clients set them.

In Gel 7's permission model, a non-superuser needs `sys::perm::query_stats_read` to read these objects, `sys::perm::analyze` to analyze queries, and `sys::perm::approximate_count` to call the approximate-count helper. Grant only the operational permissions the role actually needs.

Gel also provides `sys::reset_query_stats()`, including branch-specific and entry-specific options. Resetting discards accumulated evidence, so make it a deliberate measurement boundary rather than a routine troubleshooting first step.

## Compare Changes With a Small Experiment

Use a controlled sequence:

1. Save the original `analyze --expand` output.
2. Record application-level latency and result size over several representative values.
3. Apply one schema or query change in a test branch.
4. Refresh data scale and distribution if the branch is synthetic.
5. Repeat the identical measurements.
6. Check write throughput and index-build behavior before production rollout.

Do not change the query shape, add an index, reduce result size, and upgrade the server in one experiment. Even if latency improves, you will not know which change produced it.

For a large existing type, Gel 7 and later support `build_concurrently := true` on an index. This defers the build to the final step of `gel migration apply` (or `gel migrate`), where it runs without locking reads or writes. Use `gel migration apply --no-index-build` to skip that final build and trigger it later with another `gel migration apply`. Until the index is built, it remains inactive, so verify completion before testing index use.

## Version-aware Notes

Query analysis arrived before the EdgeDB-to-Gel rename. Older material may show `edgedb analyze` and the `edgedb` REPL; current tooling uses `gel analyze` and `gel`.

`sys::QueryStats` was added in Gel 6, so it is not available on EdgeDB 5 and older servers. `sys::approximate_count()`, concurrent index building, and the fine-grained permission names discussed above were added in Gel 7. On every version, use an up-to-date CLI compatible with the target server and consult that server version's documentation before automating plan parsing, because human-readable output can evolve.

## Official Documentation

- [EdgeQL analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [Gel analyze CLI](https://docs.geldata.com/reference/using/cli/gel_analyze)
- [Gel CLI REPL and expand command](https://docs.geldata.com/reference/using/cli/gel)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Gel set and cardinality assertions](https://docs.geldata.com/reference/stdlib/set)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel system types and QueryStats](https://docs.geldata.com/reference/stdlib/sys)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel permissions](https://docs.geldata.com/reference/datamodel/permissions)
- [PostgreSQL planner statistics](https://www.postgresql.org/docs/current/planner-stats.html)

## Conclusion

Find consequential queries with `sys::QueryStats`, reproduce one with its real parameters and policy context, and inspect it with `analyze` plus expanded output. Check top-level and nested cardinalities before adding an index. When an index is justified, model the actual filter or expression, apply one change, and compare the same workload. A verified plan improvement is useful evidence; the mere presence of an index is not.
