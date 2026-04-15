# Validation Summary: How to Use LIMIT BY in ClickHouse for Top-N Per Group

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- LIMIT BY clause
- Window functions (ROW_NUMBER) for comparison

## Sources Consulted
- ClickHouse official documentation — LIMIT BY: https://clickhouse.com/docs/en/sql-reference/statements/select/limit-by
- ClickHouse official documentation — LIMIT: https://clickhouse.com/docs/en/sql-reference/statements/select/limit

## Issues Found
- **Misleading text in "LIMIT BY with Aggregations" section**: The original text stated "LIMIT BY operates on individual rows, not aggregated results. If you need top groups by an aggregate, use ORDER BY on the aggregate result and a regular LIMIT." This contradicted the code example directly below it, which correctly uses `LIMIT BY` after `GROUP BY`. After `GROUP BY`, each aggregated group becomes a row in the result set, and `LIMIT BY` works on those rows just fine — as the official docs demonstrate with their own GROUP BY + LIMIT BY example. Fixed the text to accurately describe this behavior.

## Review Notes
- The post does not mention the `LIMIT BY ALL` shorthand, which automatically uses all non-aggregate SELECT expressions as the BY keys. This is a valid omission for a focused tutorial but could be a useful addition in the future.
- All SQL syntax (`LIMIT n BY`, `LIMIT n OFFSET m BY`, combining `LIMIT BY` with trailing `LIMIT`) is verified correct against official ClickHouse documentation.
- The advice to always pair `LIMIT BY` with `ORDER BY` for deterministic results is sound and aligns with the docs' note about non-deterministic row ordering due to multi-threading.
- The window function comparison is fair and accurate.
