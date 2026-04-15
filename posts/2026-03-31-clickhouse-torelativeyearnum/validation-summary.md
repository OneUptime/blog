# Validation Summary: How to Use toRelativeYearNum() and toRelativeMonthNum() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect and date/time functions)
- `toRelativeYearNum()`, `toRelativeMonthNum()`, `toRelativeWeekNum()` functions
- ClickHouse window functions (`lagInFrame`)
- `toIntervalMonth()` interval arithmetic

## Sources Consulted
- ClickHouse source code: `src/Functions/DateTimeTransforms.h` — `ToRelativeYearNumImpl` and `ToRelativeMonthNumImpl` implementations (https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/DateTimeTransforms.h)
- ClickHouse source code: `src/Common/DateLUTImpl.h` — `toRelativeMonthNum()` and `toYear()` methods (https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/DateLUTImpl.h)
- ClickHouse source code: `src/Functions/toRelativeYearNum.cpp` and `src/Functions/toRelativeMonthNum.cpp` — function registration and documentation strings
- ClickHouse official documentation: date-time functions page (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)

## Issues Found

### 1. Incorrect description of toRelativeYearNum return value
**What was wrong:** The post stated that `toRelativeYearNum()` "returns the count of years since 1970." The ClickHouse source code (`ToRelativeYearNumImpl`) shows it calls `time_zone.toYear(t)`, which returns the calendar year (e.g., 1970, 2024), not an offset from epoch.
**What was changed:** Updated the intro and section descriptions to correctly state it returns the calendar year number.

### 2. Incorrect example output values
**What was wrong:** The post claimed `toRelativeYearNum('1970-01-01')` = 0 and `toRelativeYearNum('2024-01-15')` = 54. The actual values are 1970 and 2024 respectively. Similarly, `toRelativeMonthNum('2024-01-15')` was shown as 649, but the actual value is 24289 (computed as 2024 × 12 + 1).
**What was changed:** Corrected the example output table to show the actual values: 1970, 2024, and 24289.

### 3. Incorrect arithmetic explanation
**What was wrong:** The post explained "January 2024 is 649 months after January 1970 (54 * 12 + 1)." The formula `54 * 12 + 1 = 649` is both the wrong formula and the wrong result. `toRelativeMonthNum` computes `year * 12 + month`, so Jan 2024 = 24289. The difference between Jan 2024 and Jan 1970 is 24289 − 23641 = 648 months.
**What was changed:** Replaced the explanation with the correct formula and demonstrated how subtraction yields the elapsed months.

### 4. Incorrect "Converting Back to a Readable Date" formula
**What was wrong:** The post used `toDate('1970-01-01') + toIntervalMonth(current_month_num)` to convert back. Since `current_month_num` is an absolute value like 24289 (not an offset from epoch), this would produce a wildly incorrect date.
**What was changed:** Fixed the formula to subtract the epoch's month number first: `toDate('1970-01-01') + toIntervalMonth(current_month_num - toRelativeMonthNum(toDate('1970-01-01')))`.

### 5. Misleading "epoch-relative" framing
**What was wrong:** The intro and summary described the functions as "counting elapsed units since the Unix epoch" and "measuring distance from the Unix epoch." `toRelativeYearNum` returns the calendar year (not a distance), and `toRelativeMonthNum` returns `year * 12 + month` (an absolute month numbering, not months since epoch).
**What was changed:** Updated descriptions to accurately say these functions produce monotonically increasing integers suitable for arithmetic, with specific formulas.

## Review Notes
- All practical query patterns (cohort analysis, rolling window, joins, YoY offsets) are correct because they use **differences** between `toRelative*Num` values, which produce correct results regardless of the absolute base offset.
- The `lagInFrame` window function usage in the YoY example is valid ClickHouse syntax. `lag()` would also work equivalently here.
- The `toRelativeWeekNum` function referenced in the final example is a real ClickHouse function and is used correctly.
