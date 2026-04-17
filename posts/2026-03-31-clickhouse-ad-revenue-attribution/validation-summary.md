# Validation Summary: How to Track Ad Revenue Attribution with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, ASOF JOIN, LowCardinality, INTERVAL, sumIf, argMax-style patterns)
- SQL for analytics / ad-tech attribution modeling

## Sources Consulted
- ClickHouse JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse ASOF JOIN section (same page)
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions/
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Conditional aggregates (`sumIf`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if

## Issues Found

### 1. Last-Click Attribution query was logically incorrect
The original query used:
```sql
row_number() OVER (PARTITION BY user_id ORDER BY event_time DESC) AS rn
```
partitioned globally per user, then filtered `rn = 1` in the JOIN. This returns the user's *overall* most recent touchpoint, not the last touchpoint preceding *each individual conversion*. For users with multiple conversions, only one conversion (at most) would receive correct attribution; others would match the wrong touchpoint or be silently dropped if the user's latest touchpoint occurs after a conversion.

**Fix:** Replaced the window-function subquery with `ASOF JOIN`, which is the idiomatic ClickHouse pattern for per-row "most recent match by timestamp" joins. The revised query uses:
```sql
ASOF JOIN (...) AS t
    ON c.user_id = t.user_id AND c.convert_time >= t.event_time
```
This correctly finds the greatest `t.event_time` that is `<= c.convert_time` for each conversion, matching the article's stated behavior ("the last touchpoint before each conversion"). ASOF JOIN also sidesteps restrictions on non-equi JOIN conditions in ClickHouse and is more efficient.

## Review Notes
- The Linear Multi-Touch Attribution query is syntactically and logically correct. Note that it does not filter by `event_type`, unlike the last-click query; this is an intentional modeling choice (some attribution models count impressions and clicks equally) but inconsistent with the last-click example. Left as-is.
- The Attribution Window Analysis query sums conversion revenue once per matched touchpoint, so if a campaign has multiple touchpoints preceding a conversion, that conversion's revenue is counted multiple times. This is a common "revenue touched" metric rather than strict attribution; the article frames it as lookback-window analysis, which is defensible. Left as-is but worth clarifying in a future revision.
- The ROAS by Channel query references a `campaign_spend` table that is not defined in the post. It is a standard pattern and clearly meant as an example of joining spend data; a brief DDL or note would help readers. Also has the same multiple-touchpoint inflation issue as the previous query for both numerator and denominator.
- `INTERVAL 30 DAY` / `INTERVAL 1 DAY` etc. syntax is valid ClickHouse.
- `LowCardinality(String)`, `MergeTree`, `PARTITION BY`, `ORDER BY` usage is standard and correct.
- Non-equality conditions in JOIN ON (used in Linear Multi-Touch, Attribution Window Analysis, and ROAS queries) are supported in current ClickHouse versions with the standard analyzer and hash/grace_hash join algorithms.
