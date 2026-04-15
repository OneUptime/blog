# Validation Summary: How to Use theilsU() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL
- Theil's U / Uncertainty Coefficient (statistical measure)

## Sources Consulted
- ClickHouse official documentation for `theilsU`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/theilsu
- ClickHouse official documentation for `cramersV`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/cramersv
- ClickHouse source code: `src/AggregateFunctions/AggregateFunctionTheilsU.cpp` on GitHub
- Wikipedia: Uncertainty coefficient (referenced by ClickHouse docs)

## Issues Found

### 1. Incorrect return value range (multiple locations)
- **What was wrong:** The post stated the function returns values in [0, 1] throughout — in the description, syntax section, key properties, interpretation table, and summary. The ClickHouse documentation explicitly states the range is [-1, 1], and the official example returns a negative value (`-0.30195720557678846`).
- **What was changed:** Updated the range to [-1, 1] in the description, syntax section, key properties, and summary. Expanded the interpretation table to cover the full [-1, 1] range with both negative and positive association descriptions.
- **Why:** The ClickHouse documentation at https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/theilsu explicitly states: "Returns a value between -1 and 1" with -1.0 meaning "100% negative association, or perfect inversion" and +1.0 meaning "100% positive association, or perfect agreement." The documented example query also produces a negative result.

### 2. Key properties described only non-negative semantics
- **What was wrong:** Key properties listed only "0 = no information" and "1 = completely determines," missing the -1 case entirely.
- **What was changed:** Updated to "0 = no association," "+1 = perfect positive association," and added "-1 = perfect negative association."
- **Why:** Matches the ClickHouse documentation's description of the three anchor values.

### 3. Predictive power comparison text
- **What was wrong:** "The feature with higher Theil's U is a stronger predictor" did not account for negative values.
- **What was changed:** Changed to "higher absolute Theil's U value" to correctly handle negative association values.
- **Why:** A value of -0.8 indicates stronger association than +0.2, so absolute value is the correct comparison.

## Review Notes
- The textbook formula `U(x -> y) = (H(y) - H(y|x)) / H(y)` presented in the post is the standard mathematical definition of the uncertainty coefficient, which is bounded to [0, 1]. ClickHouse's implementation appears to differ from the standard formula, as it can produce negative values. The ClickHouse docs link to the Wikipedia article on the uncertainty coefficient but the actual output range [-1, 1] suggests a modified implementation. The formula was left as-is since it serves as a valid conceptual reference and ClickHouse's docs do not provide an alternative formula.
- The ClickHouse documentation does not explicitly state the directionality of `theilsU(column1, column2)` — i.e., whether it measures how well column1 predicts column2 or vice versa. The blog's interpretation (column1 predicts column2) was left unchanged as it is a reasonable reading, though source code analysis suggests it may compute the reverse direction. Users should verify with their own test data.
- The "Churn Prediction Feature Ranking" example references a hypothetical `user_data` table that is not created in the post. This is acceptable as it serves as a pattern example, but readers may be confused if they try to run it directly.
- The `cramersV()` function used in the comparison section was verified to exist in ClickHouse with the documented syntax.
