# Validation Summary: How to Use meanZTest() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `meanZTest()` aggregate function (two-sample z-test)
- ClickHouse SQL syntax (WITH clauses, tuple unpacking, MergeTree engine)
- Statistical hypothesis testing (z-test, p-values, confidence intervals)

## Sources Consulted
- ClickHouse official documentation for `meanZTest()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/meanztest

## Issues Found
1. **Pre-Computed Variance example was logically incorrect (lines 124-142)**
   - **What was wrong:** The original WITH clause used `varPop(revenue) AS var_control` as a bare aggregate expression (not a scalar subquery), and the main query filtered with `WHERE variant = 0`. This meant `meanZTest()` would only receive rows from one group (control), making the two-sample z-test impossible — the function requires data from both populations (variant 0 and non-zero) to compute a meaningful result.
   - **What was changed:** Rewrote both variance computations as proper scalar subqueries (`SELECT varPop(revenue) FROM ab_experiment WHERE variant = 0/1`) and removed the `WHERE variant = 0` filter from the main query so both groups are passed to `meanZTest()`.
   - **Why:** The z-test aggregate function uses the `sample_index` argument to split rows into two populations. If all rows belong to a single population, the test cannot compute a valid z-statistic or p-value.

## Review Notes
- The blog correctly describes `y` (sample_index) as accepting "0 or 1". The official docs specify "0 for first population, non-zero for second population" — so any non-zero value works, not just 1. The blog's description is valid for the examples shown but is a slight simplification.
- The blog's disclaimer that "subqueries with dynamic variance values may require a join approach in practice" is a useful caveat. Parametric aggregate function parameters in ClickHouse typically require constant expressions; scalar subqueries from WITH clauses should evaluate to constants, but behavior may vary across ClickHouse versions.
- The CTR example variance estimates (0.21 for ~30% click rate, 0.24 for ~40% click rate) are statistically correct: Var(Bernoulli) = p(1-p), so 0.3×0.7 = 0.21 and 0.4×0.6 = 0.24.
- The segmented analysis example references `ab_experiment_with_country`, a table not created in the post. This is acceptable as a conceptual illustration, and the query pattern (GROUP BY with an aggregate function) is correct.
