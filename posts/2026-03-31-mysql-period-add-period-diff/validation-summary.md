# Validation Summary: How to Use PERIOD_ADD() and PERIOD_DIFF() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (PERIOD_ADD, PERIOD_DIFF, DATE_FORMAT, TIMESTAMPDIFF functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — Two-Digit Years in Dates: https://dev.mysql.com/doc/refman/8.0/en/two-digit-years.html
- MySQL source code (`mysys/my_time.cc` — `convert_period_to_month`, `convert_month_to_period`, `valid_period` functions)
- MySQL source code (`sql/item_timefunc.cc` — `Item_func_period_add::val_int`, `Item_func_period_diff::val_int`)

## Issues Found

1. **Incorrect claim about period 0 behavior (line 47):** The post stated "Returns `0` if `P` is `0`." In MySQL 8.0+, passing 0 as the period argument to `PERIOD_ADD()` raises an `ER_WRONG_ARGUMENTS` error via the `valid_period()` check, rather than returning 0. This behavior was true in MySQL 5.7 and earlier but changed in MySQL 8.0. **Fixed** to: "`P` must be a valid period value. Passing `0` raises an error in MySQL 8.0+."

2. **Incorrect claim in Limitations section (line 208):** The post stated "Period `0` is treated specially and returns `0` from `PERIOD_ADD()`." Same issue as above — incorrect for MySQL 8.0+. **Fixed** to: "Passing `0` as a period to `PERIOD_ADD()` raises an error in MySQL 8.0+."

## Review Notes
- All 12 SQL code examples (PERIOD_ADD and PERIOD_DIFF return values) were verified correct by tracing through the MySQL source code arithmetic.
- The DATE_FORMAT conversion technique (`DATE_FORMAT(date, '%Y%m') + 0`) is correct and is a valid approach for converting dates to period integers.
- The TIMESTAMPDIFF comparison example correctly illustrates the difference between month-level period arithmetic and complete-month-elapsed calculation.
- The two-digit year interpretation rules (00-69 → 2000-2069, 70-99 → 1970-1999) are correctly stated per official MySQL documentation.
- The mermaid diagram accurately represents the internal arithmetic logic.
- The subscription table example produces the correct results as shown.
