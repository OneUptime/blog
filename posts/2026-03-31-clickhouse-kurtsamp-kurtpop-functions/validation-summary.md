# Validation Summary: How to Use kurtSamp() and kurtPop() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (aggregate functions: `kurtSamp`, `kurtPop`, `skewSamp`, `stddevSamp`, `avg`, `count`, `toStartOfHour`)
- Statistics (kurtosis, skewness, moments)

## Sources Consulted
- ClickHouse official documentation — kurtSamp: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtsamp
- ClickHouse official documentation — kurtPop: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtpop
- ClickHouse source code — `src/AggregateFunctions/Moments.h` and `AggregateFunctionFourthMoment.cpp`
- Wikipedia on kurtosis (Pearson vs. Fisher / excess kurtosis definitions)

## Issues Found
The post incorrectly stated that ClickHouse's `kurtSamp()` and `kurtPop()` return **excess kurtosis (Fisher's definition)**, where a normal distribution equals 0. This is wrong.

Verification: The official ClickHouse docs show `kurtPop(x)` over the values 1..10 returns `1.7757575757575756`. That is exactly the Pearson kurtosis m4/m2² for that sample (excess kurtosis would be `-1.2242...`). The ClickHouse source (`Moments.h`) computes the fourth central moment and divides by variance squared — it does **not** subtract 3. So a normal distribution yields ≈ 3, not 0.

Fixes applied:
- Rewrote the intro paragraph to state the functions return standard (Pearson) kurtosis, where normal ≈ 3, and noted that users must subtract 3 to get excess kurtosis.
- Updated the "Syntax" section: renamed the variants and added the "normal ≈ 3; subtract 3 for Fisher" note.
- Corrected the "Interpreting Kurtosis Values" table: mesokurtic ≈ 3, leptokurtic > 3, platykurtic < 3, very heavy tails > 6 (previously 0 / >0 / <0 / >3, which were all off by 3).
- Renamed result aliases from `excess_kurtosis` to `kurtosis` in all example queries for consistency.
- Updated the Mermaid diagram nodes to reflect Pearson kurtosis (≈ 3 for normal) instead of excess kurtosis (= 0).
- Revised the prose after the basic-example query ("A high positive kurtosis…" → "A kurtosis value well above 3…") and the summary section to match the corrected definition.

## Review Notes
- All SQL syntax used (`today()`, `now() - INTERVAL 48 HOUR`, `BETWEEN`, `toStartOfHour`, `if(...)`, `round(...)`, `HAVING`) is valid ClickHouse SQL.
- The `> 10` heavy-tail alert threshold in the final query is still reasonable under Pearson kurtosis (normal = 3, so 10 indicates clearly heavy tails); left unchanged.
- The claim that `kurtSamp` and `kurtPop` converge for large N is qualitatively correct, though the official docs do not publish the exact bias-correction formula. The phrasing is vague enough to remain accurate.
- Minor future improvement: the docs note `kurtSamp` returns `nan` for sample sizes ≤ 1; the post doesn't mention that edge case but it is not incorrect.
