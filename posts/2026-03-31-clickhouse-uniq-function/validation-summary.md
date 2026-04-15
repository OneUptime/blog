# Validation Summary: How to Use uniq() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse aggregate functions: `uniq()`, `uniqExact()`, `uniqState()`, `uniqMerge()`
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- ClickHouse official documentation — `uniq()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation — `uniqExact()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse official documentation — `uniqHLL12()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse official documentation — Aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found

1. **Inverted ratio in "Combining with Other Aggregates" section (line 93):**
   - **What was wrong:** The expression `uniq(user_id) / uniq(session_id)` was labeled `avg_sessions_per_user`, but it actually computes users-per-session (unique users divided by unique sessions). Since a user typically has multiple sessions, sessions-per-user should be sessions divided by users.
   - **What was changed:** Swapped to `uniq(session_id) / uniq(user_id) AS avg_sessions_per_user`.
   - **Why:** The original formula was semantically inverted. Average sessions per user = total distinct sessions / total distinct users.

2. **Incorrect memory usage claim in "How uniq() Works" section (line 33):**
   - **What was wrong:** The post stated "approximately 2.5 KB of state per aggregation group." This figure comes from the `uniqHLL12()` documentation, not `uniq()`. The `uniq()` docs do not specify a concrete memory figure, as it uses a different adaptive sampling algorithm internally.
   - **What was changed:** Replaced with "uses a small, bounded amount of state per aggregation group, regardless of cardinality."
   - **Why:** Attributing `uniqHLL12()`'s memory characteristics to `uniq()` is technically inaccurate.

3. **Unverifiable error rate claim in "How uniq() Works" section (line 34):**
   - **What was wrong:** The post stated "typically within 2.2% of the true count." The official `uniq()` documentation does not cite a specific error percentage — it only states the algorithm is "very accurate." The 2.2% figure has no documented source in the official docs.
   - **What was changed:** Replaced with "typically within a few percent of the true count."
   - **Why:** Citing an unsourced specific percentage gives a false sense of precision. The softer phrasing is consistent with what the documentation actually states.

## Review Notes
- The query in the "Accuracy" section uses ClickHouse column alias reuse within the same SELECT clause (`exact_users - approx_users`). This is valid in ClickHouse but is non-standard SQL behavior. This is acceptable for a ClickHouse-focused tutorial.
- All SQL syntax is correct: `uniq()` multi-argument form, `uniqState()`/`uniqMerge()` combinator usage with `AggregatingMergeTree`, `toDate()`, `toStartOfHour()`, `today()`, and `count()` are all valid ClickHouse functions.
- The materialized view pattern (using `uniqState` in the MV and `uniqMerge` in queries) is the correct idiomatic approach for incremental distinct count tracking in ClickHouse.
