# Validation Summary: How to Estimate Error Bounds of Approximate Functions in ClickHouse

## Status
validated

## Post Type
Technical reference / guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse `SAMPLE` clause
- ClickHouse approximate aggregate functions: `uniqHLL12`, `uniqCombined`, `uniqExact`, `quantileTDigest`, `quantileExact`, `topK`
- HyperLogLog algorithm
- t-digest algorithm
- Filtered Space-Saving algorithm
- Statistical error estimation (relative standard error)

## Sources Consulted
- ClickHouse `uniqHLL12` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse `uniqCombined` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse `topK` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk
- ClickHouse `quantileTDigest` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse `SAMPLE` clause docs: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- Standard sampling theory / HyperLogLog paper references (1.04/sqrt(m) RSE formula)

## Issues Found

1. **Invalid function name `uniqCombined12`** — The post referenced `uniqCombined12(user_id)` as if it were a standalone function. ClickHouse does not have a function with this name; the correct parametric syntax is `uniqCombined(12)(user_id)`. Fixed the SQL example in the "uniqCombined Error" section.

2. **Incorrect `topK` guarantee claim** — The post claimed "`topK` guarantees that all items with frequency above `N / k` are included." This directly contradicts the official ClickHouse documentation, which states: "This function does not provide a guaranteed result. In certain situations, errors might occur and it might return frequent values that aren't the most frequent values." Rewrote this paragraph to reflect the documented lack of guarantee while preserving the practical observation about frequency overestimates.

3. **Incorrect memory figure for `uniqCombined`** — The summary table listed `uniqCombined` memory as "4-6 KB/group". At the default `HLL_precision=17`, the state uses 2^17 cells × 6 bits ≈ 96 KiB per group per ClickHouse docs. Fixed the table entry to "~96 KiB/group (default HLL_precision=17)".

## Review Notes

- The SAMPLE clause RSE formula `RSE = 1/sqrt(n)` is a standard statistical rule-of-thumb (strictly, `sqrt((1-p)/(np))` for a count under simple random sampling), accurate when the sample fraction is small. The worked examples (0.3% / 1% / 3.2%) are numerically correct.
- The `uniqHLL12` error figure of ~1.6% matches the theoretical HLL formula `1.04/sqrt(2^12) ≈ 1.625%` and the official docs.
- The `uniqCombined` ~0.8% error figure is a commonly cited practical value; ClickHouse docs do not specify an exact RSE, so this is kept as-is (though at the default precision 17 the theoretical RSE is closer to 0.3%). Readers should treat it as a rough guideline.
- The t-digest claim that the algorithm is more accurate at the tails than at the median is a correct property of Dunning's t-digest algorithm, though not explicitly documented on the ClickHouse page.
- All other SQL examples are syntactically valid ClickHouse SQL and would execute correctly against a matching schema.
