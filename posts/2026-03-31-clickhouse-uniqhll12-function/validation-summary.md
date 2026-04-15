# Validation Summary: How to Use uniqHLL12() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- HyperLogLog algorithm
- ClickHouse aggregate functions (uniqHLL12, uniqExact, uniq, uniqCombined)
- ClickHouse aggregate function combinators (-If, -Array, -State, -Merge)
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- ClickHouse official documentation for uniqHLL12: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse official documentation for uniq: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation for uniqCombined: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse official documentation for uniqExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- HyperLogLog theoretical standard error formula: 1.04/sqrt(m) where m = number of registers

## Issues Found
1. **Incorrect error rate for uniqHLL12() (three occurrences)**:
   - **What was wrong**: The post claimed uniqHLL12() has a "typical error rate of around 0.8%" in the introduction, the comparison table, and the summary section.
   - **What was changed**: Corrected to ~1.6% in all three locations.
   - **Why**: The ClickHouse documentation states the maximum error is ~1.6% for high-cardinality datasets (10K-100M elements). The theoretical HyperLogLog standard error with 2^12 registers is 1.04/sqrt(4096) = 1.04/64 ≈ 1.625%, which confirms ~1.6%. The 0.8% figure was roughly half the actual error rate.

2. **Incorrect algorithm name for uniq() in comparison table**:
   - **What was wrong**: The comparison table listed the uniq() algorithm as "Adaptive HLL".
   - **What was changed**: Corrected to "Adaptive sampling".
   - **Why**: The ClickHouse documentation describes uniq() as using "an adaptive sampling algorithm" that maintains a sample of element hash values up to 65,536. It is not a HyperLogLog variant.

## Review Notes
- The ClickHouse documentation explicitly recommends against using uniqHLL12(): "We do not recommend using this function. In most cases, use the uniq or uniqCombined function." The blog post does not mention this recommendation. While not a factual error in the post's claims, readers should be aware of this official guidance.
- The ClickHouse docs note that uniqHLL12() error can be up to ~10% for small datasets (<10K elements) and increases significantly for extremely high cardinality (1B+ elements). The post's statement that "for very low cardinalities (under 100), the error can be higher" is directionally correct but understates the range — the higher error applies to datasets under 10K, not just under 100.
- All SQL syntax, combinator usage (-If, -Array, -State, -Merge), AggregatingMergeTree patterns, and materialized view examples are correct.
- The memory usage claim of ~2.5 KB is confirmed by the docs: "2^12 5-bit cells are used. The size of the state is slightly more than 2.5 KB."
