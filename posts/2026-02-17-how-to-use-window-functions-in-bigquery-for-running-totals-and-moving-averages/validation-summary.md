# Validation Summary: How to Use Window Functions in BigQuery for Running Totals and Moving Averages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- SQL window functions
- Aggregate analytic functions
- Navigation functions
- Numbering functions

## Sources Consulted
- BigQuery window function calls: https://cloud.google.com/bigquery/docs/reference/standard-sql/window-function-calls
- BigQuery window functions overview: https://cloud.google.com/bigquery/docs/reference/standard-sql/window-functions
- BigQuery navigation functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/navigation_functions
- BigQuery numbering functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions
- BigQuery date functions, including UNIX_DATE: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- BigQuery lexical structure and reserved keywords: https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical

## Issues Found
- The post described `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` as the default frame when `ORDER BY` is specified. BigQuery's documented default for aggregate analytic functions with `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so I corrected the explanation and the simplified-query comment.
- The ROWS vs RANGE example said to use RANGE with interval expressions for dates. BigQuery's window `RANGE` frame requires exactly one numeric `ORDER BY` expression, and the official documentation recommends `UNIX_DATE()` for dates, so I corrected the comment.
- The post stated that ROWS and RANGE produce the same result when there are no gaps. That is only reliably true for the shown daily revenue case when there is one row per date, so I clarified that condition.

## Review Notes
The remaining SQL examples are syntactically consistent with BigQuery GoogleSQL. The `LAST_VALUE` example correctly uses an explicit unbounded following frame to avoid returning the current frame's last value.
