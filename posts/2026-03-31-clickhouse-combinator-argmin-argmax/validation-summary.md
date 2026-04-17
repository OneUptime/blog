# Validation Summary: How to Use -ArgMin and -ArgMax Combinators in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate functions: `argMin`, `argMax`, `min`, `max`, `sum`
- ClickHouse aggregate function combinators: `-State`, `-Merge` (used in the materialized-view example)
- MergeTree table engine
- AggregatingMergeTree table engine
- ClickHouse materialized views (with `TO` target table)
- ClickHouse data types: `UInt32`, `UInt64`, `Float64`, `String`, `Date`, `DateTime`, `AggregateFunction(...)`

## Sources Consulted
- ClickHouse `argMin` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse `argMax` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `AggregatingMergeTree` documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse `MergeTree` documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse materialized views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found

1. **Title and tags incorrectly classified `argMin`/`argMax` as "combinators".**
   - Original title: "How to Use -ArgMin and -ArgMax Combinators in ClickHouse" (with leading dashes, the notation used for combinators like `-If`, `-State`, `-ForEach`).
   - Original tags included "Combinator".
   - Per the official ClickHouse reference docs, `argMin` and `argMax` are aggregate functions, not combinators. Combinators are suffixes (e.g. `-If`, `-Array`, `-State`, `-Merge`, `-ForEach`, `-Distinct`, `-Resample`) that wrap an aggregate function to modify its behavior; `argMin`/`argMax` themselves are stand-alone aggregate functions documented under the aggregate-function reference.
   - Fix: retitled to "How to Use argMin and argMax Aggregate Functions in ClickHouse" (removing the leading dashes and the "Combinators" label) and removed the "Combinator" tag from the tag list. The rest of the prose already correctly described them as "first-class aggregate functions".

2. **Incorrect claim that tie-breaking is "deterministic but arbitrary".**
   - Original text (Syntax section): "If multiple rows share the same minimum or maximum key, the result is deterministic but arbitrary - the first such row encountered in storage order."
   - Original text (Summary section): "When ties exist, the result is deterministic within a given data part order but not guaranteed to match any specific row..."
   - The ClickHouse `argMin` / `argMax` reference explicitly states that when several `arg` values correspond to the same extreme `val`, "which of the associated `arg` is returned is not deterministic." With parallel execution, the row that "wins" depends on processing order and can vary between runs.
   - Fix: rewrote both passages to state that the result is **not** deterministic for ties and depends on processing order, and revised the tie-breaking guidance in the Summary to recommend encoding a secondary sort key into the key column (e.g. a tuple `(event_time, row_id)`) for predictable results.

3. **Materialized-view example would not aggregate correctly across multiple inserts.**
   - Original example defined `daily_ohlc` as `ReplacingMergeTree` and used plain `argMin(price, trade_time)`, `argMax(price, trade_time)`, `max(price)`, `min(price)`, `sum(volume)` inside the materialized view's `SELECT`.
   - A materialized view with `TO` runs its `SELECT` on each insert batch, producing per-batch aggregates. With `ReplacingMergeTree` and no version column, rows sharing the sorting key `(symbol, trade_date)` are eventually merged down to a single arbitrary row - not a re-aggregation. So only one batch's partial OHLC would survive, and the "open" / "close" / "high" / "low" / "volume" values would be wrong once a day's trades arrive in more than one insert.
   - Fix: switched the target table engine to `AggregatingMergeTree`, changed each column to the corresponding `AggregateFunction(...)` type (`AggregateFunction(argMin, Float64, DateTime)`, `AggregateFunction(argMax, Float64, DateTime)`, `AggregateFunction(max, Float64)`, `AggregateFunction(min, Float64)`, `AggregateFunction(sum, UInt32)`), and changed the view's `SELECT` to use the `-State` combinator forms (`argMinState`, `argMaxState`, `maxState`, `minState`, `sumState`). Added a follow-up `SELECT` that reads the stored states with the matching `-Merge` functions (`argMinMerge`, `argMaxMerge`, `maxMerge`, `minMerge`, `sumMerge`) grouped by `(symbol, trade_date)`, which is the idiomatic way to finalize results across all insert batches.

All arithmetic in the worked examples was recomputed by hand and matches the claimed outputs:

- **First/last event per user**: user 1 first at 09:00 (`pageview`, `/home`), last at 09:10 (`signup`, `/signup`); user 2 first at 10:00 (`pageview`, `/home`), last at 10:04 (`click`, `/blog`); user 3 single row at 11:00. ✓
- **OHLC per symbol**: AAPL open 172.5 (09:30), close 175.1 (15:59), high 175.1, low 171.8, total volume 1000+500+800+1200+2000 = 5500. ✓ GOOG open 180.0 (09:30), close 179.8 (15:59), high 182.5, low 179.8, total volume 300+600+400 = 1300. ✓
- **Region orders** `argMax(user_id, amount)`: us-east max 1200 → user 102; eu-west max 920 → user 203. ✓
- **Full row at extreme** (per-symbol argMax with `price` as key): AAPL high 175.10 at 15:59 with volume 2000; GOOG high 182.50 at 12:00 with volume 600. ✓

All SQL syntax, `CREATE TABLE`, `INSERT`, `SELECT`, `GROUP BY`, `ENGINE = MergeTree() / AggregatingMergeTree()`, and the `AggregateFunction(...)` type declarations are valid ClickHouse syntax.

## Review Notes

- The "argMin on String Keys" example reports `user_at_first_alphabetical_action = 1` for the minimum string `"click"`, which is tied between user 1 (row 09:02) and user 2 (row 10:04). Because tie-breaking on the key is non-deterministic (now explicitly called out in the Syntax and Summary sections), the shown value of `1` is only one plausible outcome - another run might return `2`. The example still correctly demonstrates lexicographic string comparison, so it was left as-is. Readers reproducing the query may observe either value.
- `argMin(event_time, event_time)` / `argMax(event_time, event_time)` in the first example is equivalent to `min(event_time)` / `max(event_time)` but was kept to stay consistent with the tutorial's pattern of pulling multiple attributes via a shared key column.
- The Date/DateTime literal format used in `INSERT ... VALUES` (e.g. `'2026-03-31 09:00:00'`) relies on ClickHouse's implicit string-to-DateTime conversion, which is widely supported and the common pattern in ClickHouse tutorials.
- `argMinIf` / `argMaxIf` (combining `argMin`/`argMax` with the `-If` combinator for conditional aggregation) is a natural extension for readers but is intentionally out of scope for this post.
