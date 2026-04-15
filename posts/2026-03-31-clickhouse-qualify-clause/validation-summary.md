# Validation Summary: How to Use QUALIFY Clause in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- SQL QUALIFY clause
- Window functions: row_number(), rank(), dense_rank(), ntile(), count() OVER

## Sources Consulted
- ClickHouse official documentation — SELECT QUALIFY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/qualify
- ClickHouse official documentation — SELECT syntax: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse GitHub repository — PR #62619 (Analyzer support for QUALIFY clause)

## Issues Found
1. **Unsubstantiated performance claim (line 127)**: The post stated "Both approaches should produce similar query plans because ClickHouse pushes the filter down in either case." The official documentation makes no claim about query plan equivalence or filter push-down optimization for QUALIFY vs. subquery approaches. Changed to simply state that both approaches produce the same result and that QUALIFY is preferred for readability, without making unverified optimizer claims.

2. **Misleading claim about expression validity in QUALIFY (Summary section)**: The post stated "Any expression valid in a WHERE clause is also valid in QUALIFY." The official documentation explicitly notes that QUALIFY cannot be used when there are no window functions to evaluate — you must use WHERE instead. Updated to clarify that the query must contain at least one window function for QUALIFY to be used.

## Review Notes
- QUALIFY was introduced in ClickHouse 24.5 (merged April 2024) and initially required the new analyzer (`allow_experimental_analyzer = 1`), which became the default in later versions. The blog does not mention version requirements. This is not incorrect but could be confusing for users on older ClickHouse versions.
- The official documentation only provides examples with `COUNT() OVER(...)` in QUALIFY. The blog's examples with `row_number()`, `rank()`, `dense_rank()`, and `ntile()` are reasonable extrapolations since QUALIFY works on any window function result, but they are not explicitly documented.
- All SQL syntax in the examples is correct and follows ClickHouse conventions.
- The explanation of evaluation order (WHERE before window functions, QUALIFY after) is accurate per the official documentation.
