# Validation Summary: How to Use toDate() and toDateTime() Conversion Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- Date/DateTime/DateTime64 data types
- Type conversion functions (`toDate`, `toDateTime`, `toDateTime64`)
- Safe conversion variants (`*OrNull`, `*OrZero`)
- `parseDateTimeBestEffort` and `parseDateTime` family
- Unix timestamp conversion helpers (`fromUnixTimestamp64Milli`, `fromUnixTimestamp64Nano`)

## Sources Consulted
- ClickHouse type-conversion-functions docs: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- `toDateTime64` reference: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions#toDateTime64
- `fromUnixTimestamp64Milli` reference: https://clickhouse.com/docs/sql-reference/functions/date-time-functions#fromUnixTimestamp64Milli
- `parseDateTimeBestEffort` reference: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions#parsedatetimebesteffort

## Issues Found
- **Incorrect `toDateTime64` millisecond-epoch example.** The post claimed `SELECT toDateTime64(1710489600123, 3, 'UTC');` could convert a millisecond epoch directly. ClickHouse docs explicitly state that an integer input to `toDateTime64` is interpreted as **seconds** regardless of the precision argument — the docs' own example (`toDateTime64(1546300800000, 3)`) shows a far-future/overflow result, not the expected datetime. Replaced the example with `fromUnixTimestamp64Milli(1710489600123)`, which is the correct function for converting a millisecond Unix timestamp to a `DateTime64(3)` value.

## Review Notes
- `toDateTime64(1710489600.123, 3)` (float literal) remains valid — the fractional part is treated as sub-second precision.
- `parseDateTimeBestEffort('15/03/2024 14:30')` is covered by the docs' supported non-standard formats (DD/MM/YYYY when the first component exceeds 12); for ambiguous values (day ≤ 12), the function would interpret as MM/DD/YYYY, so readers should be cautious with locale-specific slash formats.
- `toDateTime('2024-03-15')` works in modern ClickHouse via best-effort date parsing, producing `2024-03-15 00:00:00`.
- `toDateOrZero` / `toDateTimeOrZero` return the lower boundary of the respective type (`1970-01-01` / `1970-01-01 00:00:00`) on failure, as stated in the post.
