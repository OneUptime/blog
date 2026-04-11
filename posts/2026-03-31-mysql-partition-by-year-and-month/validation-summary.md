# Validation Summary: How to Partition by Year and Month in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (partitioning features: RANGE, RANGE COLUMNS)
- MySQL built-in functions: YEAR(), MONTH(), TO_DAYS()
- MySQL Events (scheduled event automation)
- MySQL EXPLAIN (query plan analysis)

## Sources Consulted
- MySQL 8.0 Reference Manual: Partitioning Types — https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual: RANGE COLUMNS Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-columns-range.html
- MySQL 8.0 Reference Manual: Partition Pruning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual: Partition Management (REORGANIZE, DROP) — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management-range-list.html
- MySQL 8.0 Reference Manual: CREATE EVENT — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: TO_DAYS() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_to-days

## Issues Found
1. **Partition pruning example used function-based WHERE conditions instead of range conditions.**
   - **What was wrong:** The EXPLAIN example used `WHERE YEAR(event_date) = 2025 AND MONTH(event_date) = 3` and claimed the output would show only partition `p202503`. With `PARTITION BY RANGE (YEAR(event_date) * 100 + MONTH(event_date))`, MySQL's optimizer cannot algebraically decompose separate YEAR() and MONTH() function calls in the WHERE clause back into the composite partition expression. This means partition pruning would NOT occur and all partitions would be scanned.
   - **What was changed:** Replaced the WHERE clause with range conditions on the column itself (`WHERE event_date >= '2025-03-01' AND event_date < '2025-04-01'`), which allows MySQL to evaluate the partition expression at the boundary values and correctly prune to the single matching partition. Added an explanatory note warning readers not to use YEAR()/MONTH() functions in WHERE clauses when partition pruning is desired.
   - **Why:** Range conditions on the partitioning column are the reliable way to enable partition pruning for RANGE partitions with expression-based keys. This is documented in MySQL's partition pruning documentation.

## Review Notes
- The MySQL Event for automating partition creation requires `event_scheduler = ON` in the MySQL server configuration. The post does not mention this prerequisite, but this is a minor omission rather than an error.
- All three partitioning methods (YEAR*100+MONTH, RANGE COLUMNS, TO_DAYS) are correctly demonstrated with proper syntax and semantics.
- The December-to-January year rollover logic in the automation event is correctly handled.
- Primary keys correctly include the partitioning column in all examples, as required by MySQL's partitioning constraints on unique keys.
