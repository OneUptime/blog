# Validation Summary: Common ClickHouse Materialized View Mistakes

## Status
validated

## Post Type
Guide / Pitfalls reference (short technical listicle)

## Technologies Covered
- ClickHouse (SQL, materialized views)
- AggregatingMergeTree engine
- Aggregate state function combinators (`-State`, `-Merge`)
- `POPULATE` clause and `TO` clause syntax for materialized views
- DateTime helper functions (`toStartOfHour`)

## Sources Consulted
- ClickHouse docs — AggregatingMergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs — CREATE VIEW (materialized views, POPULATE, TO clause): https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse docs — AggregateFunction data type: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse docs — DateTime functions (`toStartOfHour`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions

## Issues Found
- **Mistake 2 — inner table TTL/partitioning claim**: The original post said the implicit `.inner` table "cannot have custom TTL or partitioning." This is inaccurate: ClickHouse does allow `PARTITION BY` and `TTL` clauses in the `CREATE MATERIALIZED VIEW` statement, and they apply to the inner table. The real operational pain is that the auto-generated `.inner_id.<uuid>` name makes post-hoc `ALTER` awkward. Updated the wording to reflect this — now calls out the auto-generated name and difficulty of altering later, preserving the mistake's overall recommendation to use `TO`.

## Review Notes
- All SQL snippets are syntactically valid: `sumState`/`sumMerge`, `AggregateFunction(sum, Float64)`, `toStartOfHour(ts)`, and the `TO target_table` syntax all match current ClickHouse docs.
- Mistake 1's justification (plain `sum` breaks with `AggregatingMergeTree`) is correct — the column would either produce a type mismatch or be merged incorrectly across parts.
- Mistake 3's backfill pattern (explicit `INSERT INTO target SELECT ... sumState(...) FROM source`) is the recommended approach.
- Mistake 4 is slightly imprecise: for chained MVs where B reads A's target, B does fire after A writes to its target (causal ordering exists), so "undefined order" most accurately applies to sibling MVs on the same source table. The broader recommendation (prefer reading directly from the source table) is still sound and widely given, so the section was left as is.
- Mistake 5 matches the official docs verbatim — docs explicitly warn against `POPULATE` in production, and note it is not supported with `Replicated` database engine or ClickHouse Cloud (worth considering adding as a follow-up note, but not required for accuracy).
