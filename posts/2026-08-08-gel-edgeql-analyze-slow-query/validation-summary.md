# Validation Summary: Diagnose a Slow EdgeQL Query With Analyze

## Status

validated

## Post Type

Technical performance-troubleshooting guide

## Technologies Covered

- Gel 6 and Gel 7
- EdgeDB historical tooling and naming
- EdgeQL queries and cardinality
- Gel schema definition language and indexes
- Gel CLI, REPL, UI, and query analyzer
- `sys::QueryStats` and `sys::approximate_count()`
- Gel access policies and role permissions
- PostgreSQL query planning and `EXPLAIN ANALYZE` metrics

## Sources Consulted

- [Gel EdgeQL analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [Gel analyze CLI](https://docs.geldata.com/reference/using/cli/gel_analyze)
- [Gel interactive shell and `\expand`](https://docs.geldata.com/reference/using/cli/gel)
- [Gel query CLI](https://docs.geldata.com/reference/using/cli/gel_query)
- [EdgeQL select and nested shapes](https://docs.geldata.com/reference/edgeql/select)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [Gel set functions and cardinality assertions](https://docs.geldata.com/reference/stdlib/set)
- [Gel links](https://docs.geldata.com/reference/datamodel/links)
- [Gel computed properties and links](https://docs.geldata.com/reference/datamodel/computeds)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel constraints](https://docs.geldata.com/reference/datamodel/constraints)
- [Gel system functions and types](https://docs.geldata.com/reference/stdlib/sys)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel permissions](https://docs.geldata.com/reference/datamodel/permissions)
- [EdgeDB 3 changelog](https://docs.geldata.com/resources/changelog/3_x)
- [Gel 6 changelog](https://docs.geldata.com/resources/changelog/6_x)
- [Gel 7 changelog](https://docs.geldata.com/resources/changelog/7_x)
- [Upgrading from EdgeDB 5 to Gel](https://docs.geldata.com/resources/upgrading)
- [Gel CLI analyzer rendering source](https://github.com/geldata/gel-cli/blob/master/src/analyze/tree.rs)
- [Gel coarse-plan mapping source](https://github.com/geldata/gel/blob/master/edb/server/compiler/explain/coarse_grained.py)
- [PostgreSQL `EXPLAIN` documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL planner statistics](https://www.postgresql.org/docs/current/planner-stats.html)

## Issues Found

- The coarse-plan metric descriptions treated `Rows` as total flow and left `Time` open to being read as exclusive node time. Updated them to reflect Gel's actual output: `Time` is milliseconds across all loops and includes child work, `Rows` is average emitted rows per loop, and `Width` is estimated average output-row width in bytes. The related guidance now uses `Rows × Loops` for approximate total emitted rows.
- The post presented `sys::approximate_count()` without a version boundary. The function was added in Gel 7, so the text and version notes now say Gel 7 and later. The Gel 7 permission note now also includes the required `sys::perm::approximate_count` permission for non-superusers.
- The QueryStats guidance described `mean_exec_time` as identifying individual slow calls, used `calls` to label outliers, and treated `rows` as generic result volume. It now correctly describes average execution time, execution frequency, and the cumulative number of rows retrieved or affected, with `calls` providing per-call context.
- Concurrent index building and `--no-index-build` were presented without their Gel 7 boundary, and the timing of the deferred build was underspecified. The text now identifies Gel 7 and later, explains the normal final build step, and states how a later `gel migration apply` builds an index skipped with `--no-index-build`.
- The planner discussion said it may still choose "a scan," although an index access path is also a scan. This now says "a sequential scan."
- The CLI compatibility note could be read as requiring identical CLI and server versions. It now recommends an up-to-date CLI compatible with the target server and the target server version's documentation.

## Review Notes

- The EdgeQL queries, nested shape, tuple and expression indexes, QueryStats selection, `gel query`, and `gel analyze --expand` forms were checked against the official references and exercised against the official Gel 7 Docker image.
- `sys::approximate_count()` includes subtypes by default and is intentionally statistics-based, so even a newly populated type may report a stale estimate until planner statistics are refreshed. The post already correctly warns against using it for exact totals or correctness.
- Human-readable plan nodes and formatting can change with server and CLI releases; the post correctly warns against treating that output as a stable automation interface.
