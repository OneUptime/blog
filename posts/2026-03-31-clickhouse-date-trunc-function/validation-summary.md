# Validation Summary: How to Use date_trunc() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- `date_trunc()` / `dateTrunc()` function
- `toStartOf*` and `toStartOfInterval()` helpers
- DateTime / Date types and timezone handling

## Sources Consulted
- ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#dateTrunc
- ClickHouse source: `src/Functions/date_trunc.cpp` (return-type branching at lines 75–80, embedded docs table around lines 218–219)
- ClickHouse docs on `toStartOfWeek` / ISO week behavior

## Issues Found

1. **Incorrect return-type display in the example output table.** The post showed `trunc_week`, `trunc_month`, `trunc_quarter`, and `trunc_year` as `YYYY-MM-DD HH:MM:SS`. Per `date_trunc.cpp`, those units return `Date` (not `DateTime`) when given a `DateTime` input, so they display as `YYYY-MM-DD`. Updated the table accordingly and added a one-sentence note clarifying which units return `DateTime` vs `Date`.

2. **Incorrect default-timezone claim.** The post stated `date_trunc('day', ...)` "truncates to midnight UTC" by default. Per the official docs, when no timezone argument is supplied, the function uses the timezone of the input value (i.e., the column's declared timezone, or the server timezone). Reworded the section to reflect this and to note that UTC is just one possible case.

3. **Misleading "alias family" wording.** The intro said ClickHouse supports `date_trunc()` "as an alias family for its `toStartOf*` functions." The docs only list `DATE_TRUNC` as an alias of `dateTrunc`; `date_trunc` is not formally an alias of `toStartOf*`, even though it is functionally equivalent. Reworded to "implements it with the same semantics as its `toStartOf*` functions."

## Review Notes

- The post intentionally limits the supported-units list to those usable with `DateTime` (`'second'` through `'year'`). For `DateTime64` inputs, ClickHouse also supports `'nanosecond'`, `'microsecond'`, and `'millisecond'`. The omission is acceptable given the post's scope, but a future revision could mention sub-second units when discussing `DateTime64`.
- The `'2026-03-31 14:23:47'::DateTime` cast syntax is valid in current ClickHouse.
- Week alignment to Monday matches `dateTrunc`'s ISO-8601 behavior. (Note for readers: this differs from `toStartOfWeek`, whose default mode 0 starts the week on Sunday.)
- The window-function example using `sum(sum(amount)) OVER (...)` is valid ClickHouse syntax for cumulative aggregations.
- All other code examples (daily/weekly/monthly/quarterly aggregations, timezone-aware day boundaries, comparison with `toStartOf*` and `toStartOfInterval()`) are syntactically and semantically correct.
