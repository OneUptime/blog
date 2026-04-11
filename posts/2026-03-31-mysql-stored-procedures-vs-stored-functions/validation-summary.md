# Validation Summary: How to Choose Between Stored Procedures and Stored Functions in MySQL

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- MySQL stored procedures
- MySQL stored functions
- MySQL DETERMINISTIC characteristic
- MySQL binary logging and replication considerations

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: Stored Routines and MySQL Privileges (https://dev.mysql.com/doc/refman/8.0/en/stored-routines-privileges.html)
- MySQL 8.0 Reference Manual: Binary Logging of Stored Programs (https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html)
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement for Stored Functions (https://dev.mysql.com/doc/refman/8.0/en/create-function.html)
- MySQL 8.0 Reference Manual: DATEDIFF Function (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff)
- MySQL 8.0 Reference Manual: SHA2 Function (https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2)

## Issues Found
1. **`days_until_expiry` function incorrectly declared as DETERMINISTIC**: The function uses `CURDATE()`, which returns a different value each day. A deterministic function must always produce the same output for the same input parameters. Since `DATEDIFF(p_expires, CURDATE())` varies by day for the same `p_expires` value, the function is non-deterministic. Changed `DETERMINISTIC` to `NOT DETERMINISTIC` and updated the comment from "Safe for replication and query caching" to "Not deterministic because CURDATE() changes daily."

## Review Notes
- The comparison table is accurate and covers the key differences well.
- All SQL syntax (DELIMITER, CREATE PROCEDURE/FUNCTION, parameter modes, RETURNS clause) is correct for MySQL 5.7+/8.0.
- The `register_user` procedure correctly demonstrates transactions, OUT parameters, and `LAST_INSERT_ID()`.
- The `tax_amount` function is correctly declared DETERMINISTIC since it is a pure computation with no external state dependency.
- The `apply_discount` procedure name is slightly misleading — it recalculates `total_price` using tax rather than applying a discount — but this is a naming choice, not a technical error.
- The claim that DETERMINISTIC "allows the optimizer to cache results" is a common simplification. In practice, MySQL does not heavily optimize based on this characteristic; its primary importance is for binary logging and replication safety. This is not strictly wrong but could be more precise in a future revision.
