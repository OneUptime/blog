# Validation Summary: How to Use groupArrayMovingAvg() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- `groupArrayMovingAvg` aggregate function
- Related functions: `groupArray`, `arrayMap`, `arrayJoin`, `ARRAY JOIN`, `today()`, `toFloat64`, `round`

## Sources Consulted
- Official ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparraymovingavg
- Official ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/functions/array-functions (arrayMap, arrayJoin)
- Official ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- Official ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (today)

## Issues Found
1. **Incorrect return type claim (fixed).** The "Data Type Considerations" section stated that `groupArrayMovingAvg` "always returns an array of `Float64` values regardless of the input type." Per the official docs, it "returns an array of the same size and type as the input data," and for integer inputs it uses rounding toward zero and truncates decimal places. Rewrote the paragraph to describe the actual behavior and updated the accompanying example to cast the input to `Float64` before aggregation, so `arrayMap(x -> round(x, 2), ...)` has fractional values to operate on.

## Review Notes
- The two syntactic forms shown in the "Syntax" section (`groupArrayMovingAvg(column)` and `groupArrayMovingAvg(N)(column)`) correctly match the documented forms (`groupArrayMovingAvg(numbers_for_summing)` and `groupArrayMovingAvg(window_size)(numbers_for_summing)`).
- The description of the no-window case as an expanding moving average is a reasonable restatement of the docs' "window size equal to the number of rows in the column."
- The advice to sort the input subquery before aggregation is practical guidance for getting deterministic results but is not explicitly spelled out on this particular docs page. The wording in the post is reasonable and does not misrepresent the function.
- All other SQL in the post (subqueries, `GROUP BY`, `ARRAY JOIN`, `arrayMap`, `groupArray`, `today()`) is syntactically valid ClickHouse.
