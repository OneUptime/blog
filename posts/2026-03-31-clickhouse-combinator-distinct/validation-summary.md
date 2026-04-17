# Validation Summary: How to Use the -Distinct Aggregate Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL aggregate functions and combinators (`-Distinct`)
- Specific functions: `sumDistinct`, `avgDistinct`, `countDistinct`, `groupArrayDistinct`, `uniq`, `uniqHLL12`, `uniqExact`

## Sources Consulted
- ClickHouse official documentation on aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs on `uniq`, `uniqExact`, `uniqHLL12`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse docs on `count` (and `COUNT(DISTINCT ...)` → `uniqExact` behavior): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse docs on `groupArray`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- Manual arithmetic verification of every numeric output in the post.

## Issues Found
1. **Incorrect `sum(salary)` output for engineering.** The output block showed `engineering  469000`, but the correct value for the given sample data is `95000*3 + 88000*2 = 461000` (the body text immediately below the block already stated 461000, confirming the output was the wrong value). Updated the output block to show `461000`.
2. **Incorrect `avg(salary)` output and accompanying math for engineering.** The output block showed `avg_with_duplicates = 93800` and the explanation text claimed `(95000*3 + 88000*2) / 5 = 93800`. The correct value is `461000 / 5 = 92200`. Fixed both the output block and the math in the explanatory sentence.

Marketing values (`222000` sum, `74000` avg, `150000` sumDistinct, `75000` avgDistinct) were all correct and left unchanged. All `sumDistinct`, `avgDistinct`, `countDistinct`, and `groupArrayDistinct` outputs were correct and left unchanged.

## Review Notes
- The `-Distinct` combinator is a real, documented ClickHouse feature and the described behavior (deduplicate values before feeding them to the aggregate) is accurate.
- `countDistinct` is effectively equivalent to `uniqExact` in ClickHouse, and `COUNT(DISTINCT x)` is translated to `uniqExact(x)` — so the post's claim that the two forms return the same result is correct for this example.
- The performance caveat about `-Distinct` consuming memory proportional to cardinality is accurate; recommending `uniq`/`uniqHLL12` for approximate counts is sound.
- Minor stylistic note (not fixed): `uniqHLL12` uses a HyperLogLog with 2^12 cells; for most users `uniq` (adaptive) is the default recommendation. The post's recommendation is still technically valid.
