# Validation Summary: How to Use Aggregate Projections in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL projections (aggregate projections)
- ClickHouse AggregateFunction State/Merge combinators (`countState`/`countMerge`, `uniqState`/`uniqMerge`, `quantileTDigestState`/`quantileTDigestMerge`)
- ClickHouse `EXPLAIN` query plan introspection

## Sources Consulted
- ClickHouse ALTER PROJECTION reference: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse Projections data-modeling guide: https://clickhouse.com/docs/data-modeling/projections
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators

## Issues Found
1. **Incorrect direction of projection/query GROUP BY matching rule.** The post originally stated "The projection's GROUP BY keys form a prefix of or exactly match the query's GROUP BY". This is reversed — for an aggregate projection to satisfy a query, the *query's* GROUP BY keys must be a subset of (or exactly match) the *projection's* GROUP BY keys, so ClickHouse can further roll up the pre-aggregated rows. Rewrote the bullet to: "The query's GROUP BY keys are a subset of or exactly match the projection's GROUP BY keys (so ClickHouse can roll up the pre-aggregated data to answer the query)".
2. **Incorrect `EXPLAIN` output guidance.** The post told readers to run a bare `EXPLAIN` and look for `ReadFromProjection`. That step name does not exist in ClickHouse's plan output. Projection usage is surfaced via `EXPLAIN projections = 1`, which annotates the `ReadFromMergeTree` step with a `Projections:` section containing the projection name. Updated both the `EXPLAIN` statement and the follow-up sentence accordingly.

## Review Notes
- `ALTER TABLE ... ADD PROJECTION (...)`, `MATERIALIZE PROJECTION`, and `DROP PROJECTION` syntax are all correct per the ClickHouse ALTER reference.
- The State/Merge combinator examples (`countState`, `uniqState`, `quantileTDigestState(0.99)(...)` and their `Merge` counterparts) use the documented parametric syntax and are correct.
- The comparison table between aggregate projections and materialized views is accurate at a high level; "atomic with insert" is a fair characterization of projection maintenance semantics, though readers should be aware projection builds on existing parts happen asynchronously when `MATERIALIZE PROJECTION` is issued.
- No version pinning is given; the behavior described aligns with recent stable ClickHouse releases (23.x+). Older versions had weaker projection planner support, so readers on very old ClickHouse installs may need `optimize_use_projections = 1` explicitly.
