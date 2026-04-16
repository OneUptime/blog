# Validation Summary: How to Use -Resample Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL aggregate function combinators (`-Resample`)
- ClickHouse array functions (`arrayMap`, `arrayEnumerate`)
- Time series / histogram aggregation patterns

## Sources Consulted
- ClickHouse official docs — Aggregate Function Combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators (confirmed `-Resample` syntax `<aggFunction>Resample(start, end, step)(<aggFunction_params>, resampling_key)`, that `end` is exclusive (`[start, end)`), and the canonical `groupArrayResample(30, 75, 30)(name, age)` example)
- ClickHouse docs — `uniq` / `count` aggregate functions (to confirm semantic difference for DAU-style counting)
- ClickHouse docs — `arrayEnumerate` (returns 1-based indices)

## Issues Found
1. **Off-by-one bucket labels in "Using arrayMap with -Resample Output"** — the original `arrayMap` used `bucket_idx * 100` and `(bucket_idx + 1) * 100`, producing labels starting at `100-200ms` instead of `0-100ms` (since `arrayEnumerate` is 1-based). Fixed to use `(bucket_idx - 1) * 100` and `bucket_idx * 100` so labels correctly cover `0-100ms`, `100-200ms`, ... matching the histogram/latency examples elsewhere in the post.
2. **"Daily active users" example used `countResample` instead of `uniqResample`** — `count(user_id)` counts non-null rows per day, not *distinct* users, which contradicts the "daily active users" label. Replaced with `uniqResample(...)(user_id, toUInt32(toDate(ts)))` so the code actually computes distinct users per day.

## Review Notes
- The syntax `aggFunctionResample(start, end, step)(value_args..., resampling_key)` and the `[start, end)` semantics are consistent with the official ClickHouse documentation.
- The post's claim that "empty buckets are represented as zero values" holds cleanly for `count` and `sum` (which are the aggregations used in the examples). For other aggregations (e.g. `avg`, `max`, `min`) the empty bucket result is the default state of that function (e.g. `nan` for `avg`), which may surprise readers — worth a brief caveat in a future revision but not incorrect as written.
- Using `response_ms` as both the value argument and the resampling key in the basic example works (it counts non-null `response_ms` rows per bucket) but is slightly redundant; `countResample(0, 1000, 100)(response_ms)` would also work since `count()` has no required value argument. Left as-is because it is a valid and pedagogically consistent form that matches the multi-aggregation example.
- `AS` aliases inside the tuple constructor in the histogram example (`(i - 1) * 100 AS bucket_start`, etc.) are accepted by ClickHouse's parser but the inner aliases do not propagate as tuple field names — the result remains an anonymous tuple. Harmless but not load-bearing.
- ClickHouse supports both `||` and `concat()` for string concatenation; the post uses both, which is consistent with ClickHouse SQL.
