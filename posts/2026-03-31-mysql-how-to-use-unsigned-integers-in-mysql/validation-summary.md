# Validation Summary: How to Use Unsigned Integers in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (integer data types, UNSIGNED modifier, strict SQL mode, AUTO_INCREMENT)
- SQL DDL and DML syntax

## Sources Consulted
- MySQL 8.0 Reference Manual: Integer Types (https://dev.mysql.com/doc/refman/8.0/en/integer-types.html)
- MySQL 8.0 Reference Manual: Out-of-Range and Overflow Handling (https://dev.mysql.com/doc/refman/8.0/en/out-of-range-and-overflow.html)
- MySQL 8.0 Reference Manual: Server SQL Modes (https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html)
- MySQL 8.0 Reference Manual: CREATE TABLE Syntax (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA COLUMNS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html)

## Issues Found
- **Incorrect underflow protection using GREATEST**: The post recommended `GREATEST(0, stock - 10)` as a way to protect against unsigned arithmetic underflow. This does not work because the subtraction `stock - 10` is evaluated first in unsigned arithmetic context. When `stock` is less than 10, MySQL raises `ERROR 1690 (BIGINT UNSIGNED value is out of range)` before `GREATEST` can clamp the value. The expression never produces a negative number for GREATEST to handle — the unsigned subtraction itself fails. Removed the incorrect GREATEST example and clarified the error behavior, keeping the correct `WHERE stock >= 10` conditional approach.

## Review Notes
- All integer type ranges in the table are verified correct against MySQL documentation.
- All SQL syntax examples are valid and use current, non-deprecated features.
- The UNSIGNED attribute for integer types is NOT deprecated in MySQL 8.0 (only UNSIGNED on FLOAT/DOUBLE/DECIMAL is deprecated as of 8.0.17).
- The strict SQL mode default in MySQL 5.7+ claim is correct (STRICT_TRANS_TABLES is included in the default sql_mode).
- The error code 1264 (22003) shown for out-of-range INSERT is correct.
- The information_schema query and SHOW CREATE TABLE examples are syntactically correct and accurate.
