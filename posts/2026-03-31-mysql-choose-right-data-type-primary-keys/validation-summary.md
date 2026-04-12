# Validation Summary: How to Choose the Right Data Type for Primary Keys in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- SQL DDL (CREATE TABLE, PRIMARY KEY, AUTO_INCREMENT)
- MySQL UUID functions (UUID(), UUID_TO_BIN(), BIN_TO_UUID())

## Sources Consulted
- MySQL 8.0 Reference Manual — Integer Types: https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual — UUID_TO_BIN(): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid-to-bin
- MySQL 8.0 Reference Manual — UUID(): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid
- MySQL 8.0 Reference Manual — Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found
No technical issues found.

## Review Notes
- The UUID functions (UUID_TO_BIN, BIN_TO_UUID) and expression defaults (DEFAULT (expr)) require MySQL 8.0.13+. The post does not mention this version requirement, which could be noted in a future update for readers on older MySQL versions.
- The claim that BINARY(16) "halves" storage compared to CHAR(36) slightly understates the savings (16 bytes vs 36 bytes is a 56% reduction), but this is a minor approximation and not an error.
- MySQL's UUID() function generates UUID v1 (time-based). The swap_flag=1 in UUID_TO_BIN rearranges the time-low and time-high portions so the binary value is roughly time-ordered, which is correctly described in the post as reducing index fragmentation.
