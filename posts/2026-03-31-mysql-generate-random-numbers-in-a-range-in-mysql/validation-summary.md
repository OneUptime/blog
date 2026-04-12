# Validation Summary: How to Generate Random Numbers in a Range in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (RAND(), FLOOR(), CEIL(), ROUND(), DATE_ADD(), IF() functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_rand
- MySQL 8.0 Reference Manual: FLOOR() — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_floor
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-add

## Issues Found

1. **Dice roll total column uses independent RAND() calls**: In the "Simulating Dice Rolls" section, the `total` column was computed as `(FLOOR(RAND() * 6) + 1) + (FLOOR(RAND() * 6) + 1)`, which generates two new random values rather than summing the `die1` and `die2` columns. Each `RAND()` call in a SELECT list is evaluated independently, so `total` would not equal `die1 + die2`. Fixed by wrapping the die rolls in a subquery and computing `die1 + die2` in the outer SELECT.

2. **Random date range off-by-one for leap year (2 occurrences)**: The formula `FLOOR(RAND() * 365)` was used with a start date of 2024-01-01. Since 2024 is a leap year (366 days), this produces offsets 0–364, corresponding to Jan 1 through Dec 30 — missing Dec 31. The comment claimed the range was "between 2024-01-01 and 2024-12-31". Changed `365` to `366` in both the "Generating Test Data" and "Generating Random Dates in a Range" sections.

## Review Notes
- The `RAND()` function in MySQL returns a value in the range [0, 1) (inclusive of 0, exclusive of 1). The post describes it as "between 0 and 1" which is acceptable for a tutorial audience, though technically it never returns exactly 1.0.
- The random float formula `RAND() * (max - min) + min` similarly produces values in [min, max) rather than [min, max], but this is standard and expected behavior.
- The seeded `RAND(42)` description is correct: the first call with a given seed always returns the same value, and subsequent calls without a seed continue the deterministic sequence.
- The `ORDER BY RAND()` performance warning is valid and well-placed.
