# Validation Summary: How to Use formatDateTime() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse `formatDateTime()` date/time function (MySQL dialect)
- `DateTime` / `DateTime64` types
- ISO 8601 string formatting
- IANA timezone handling

## Sources Consulted
- ClickHouse official docs: Date and Time Functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `formatDateTime` specifier table (MySQL-syntax variant, not Joda)

## Issues Found
The post originally documented `formatDateTime` specifiers using standard C/strftime semantics, but ClickHouse's `formatDateTime` follows the **MySQL dialect** with several important differences. The following fixes were applied:

1. **`%M` (minute)** — INCORRECT. In ClickHouse MySQL-syntax `formatDateTime`, `%M` is the full month name (January–December), not the minute. Replaced with `%i` in the specifier list and in every code example (`'%Y-%m-%d %H:%M:%S'` → `'%Y-%m-%d %H:%i:%S'`, `'%Y-%m-%dT%H:%M:%S'` → `'%Y-%m-%dT%H:%i:%S'`, `'%Y-%m-%d %H:%M'` → `'%Y-%m-%d %H:%i'`, `'%d %b %Y %H:%M'` → `'%d %b %Y %H:%i'`). Also updated the `%T` and `%R` shorthand descriptions from `%H:%M:%S`/`%H:%M` to `%H:%i:%S`/`%H:%i`.
2. **`%W` (week number, Mon-based)** — INCORRECT. In ClickHouse, `%W` is the full weekday name (Monday–Sunday), not a week number. Replaced with `%V` (ISO 8601 week number, 01–53) in the specifier list and in the "Generating Derived Columns for Grouping" SQL (`'%Y-W%W'` → `'%Y-W%V'`).
3. **`%A` (full weekday name)** — NOT SUPPORTED in ClickHouse `formatDateTime`. Removed from the specifier list; the correct ClickHouse specifier for full weekday name is `%W`, which has been kept/relabeled accordingly.
4. **`%B` (full month name)** — NOT SUPPORTED in ClickHouse `formatDateTime`. Removed from the specifier list and corrected in the "Basic String Formatting" example (`'%B %e, %Y'` → `'%M %e, %Y'`). The correct specifier for full month name is `%M`.
5. **`%f`** — Tightened the description from "microseconds, zero-padded (000000)" to "fractional second (123456)" to match ClickHouse's documented behaviour (the width depends on the `DateTime64` scale, not always 6-digit microseconds).
6. Added a short note under the specifier table reminding the reader that ClickHouse uses the MySQL dialect and flagging the `%M`/`%i` and `%W`/`%V` gotchas.
7. Fixed the example value for `%V` on 2026-03-31 (ISO week 14, not 13).

## Review Notes
- Function signatures `formatDateTime(dt, format)` and `formatDateTime(dt, format, timezone)` are correct per current ClickHouse docs.
- Remaining specifiers in the table (`%Y`, `%y`, `%m`, `%d`, `%H`, `%I`, `%S`, `%p`, `%e`, `%j`, `%w`, `%a`, `%b`, `%F`, `%T`, `%R`, `%%`) match the official documentation.
- The `toUnixTimestamp64Milli` / `leftPad` approach for millisecond-precision ISO 8601 output is valid ClickHouse SQL.
- The timezone-aware examples (`'UTC'`, `'America/Chicago'`, `'Asia/Singapore'`) use correct IANA zone names.
- ClickHouse also provides `formatDateTimeInJodaSyntax()` if users prefer Joda-style pattern letters (e.g. `HH:mm:ss`); this post intentionally only covers the MySQL-syntax variant, which is acceptable for the stated scope.
- Week numbering: `%V` returns ISO 8601 week (01–53, Monday-based, week with first Thursday is week 1). ClickHouse's MySQL-syntax `formatDateTime` does not expose a Sunday-based week specifier — `%U` is not supported in the table.
