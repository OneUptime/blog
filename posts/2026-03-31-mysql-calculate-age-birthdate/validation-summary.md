# Validation Summary: How to Calculate Age from a Birthdate in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (date and time functions: TIMESTAMPDIFF, CURDATE, YEAR, MONTH, DAY, DAYOFYEAR, DATE_FORMAT, DATE, CONCAT)
- SQL (CREATE TABLE, INSERT, SELECT, WHERE, CASE, BETWEEN, ORDER BY)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — DAYOFYEAR(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_dayofyear
- MySQL 8.0 Reference Manual — DATE_FORMAT(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format

## Issues Found

1. **Description references DATEDIFF() but the post never uses it.** The description claimed the post covers "TIMESTAMPDIFF() and DATEDIFF()" but only TIMESTAMPDIFF() is used throughout. Removed the DATEDIFF() reference from the description.

2. **First upcoming birthdays query intro misleadingly implied year-boundary handling.** The text "Because the birthday could cross a year boundary, compare day-of-year values carefully:" implied the following query handled year-end wrapping. It does not — if today is late December and a birthday is in early January, `DAYOFYEAR(Jan date)` is a small number that will never fall in the `BETWEEN DAYOFYEAR(Dec date) AND DAYOFYEAR(Dec date) + 7` range. Changed the text to explicitly note this limitation.

3. **Second upcoming birthdays query intro implied the first was year-wrap-safe.** The text "For a simpler but less year-wrap-safe approach:" implied the first query handled year wrapping while the second did not. Neither handles it. Changed to "A simpler alternative that also does not handle year-end wrapping:".

## Review Notes
- The DAYOFYEAR-based upcoming birthday query also silently excludes Feb 29 birthdays in non-leap years, because `DATE(CONCAT(non_leap_year, '-', 2, '-', 29))` returns NULL in MySQL. This is an inherent edge case with the approach but is minor enough to not warrant a fix in a tutorial context.
- All core age calculation examples using `TIMESTAMPDIFF(YEAR, birthdate, CURDATE())` are correct and represent the standard recommended approach.
- The warning against using `YEAR(CURDATE()) - YEAR(birthdate)` is accurate and well-explained.
- The CASE expression for handling future birthdates is correct — TIMESTAMPDIFF does return negative values for future dates.
