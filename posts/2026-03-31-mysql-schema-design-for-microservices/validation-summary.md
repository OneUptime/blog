# Validation Summary: How to Design MySQL Schema for Microservices

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- Microservices architecture patterns (database-per-service, outbox pattern)
- Flyway, Liquibase, golang-migrate (migration tools)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — UUID() Function: https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_uuid
- MySQL 8.0 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- ISO 4217 Currency Codes (3-letter codes for CHAR(3) currency column)

## Issues Found
No technical issues found.

## Review Notes
- The `DEFAULT (UUID())` expression default syntax requires MySQL 8.0.13 or later. The post does not explicitly state a MySQL version requirement. This is acceptable since MySQL 5.7 reached end-of-life in October 2023 and MySQL 8.0 is the current supported major version.
- The post uses the term "natural key" to describe UUIDs used as cross-service identifiers. In traditional database theory, UUIDs are surrogate keys while natural keys have inherent business meaning (e.g., email, SKU). The `product_sku` reference is a true natural key, but `customer_id` (a UUID) is technically a surrogate key. However, in microservices literature this usage is common — the distinction being made is between database-level foreign keys and logical business identifiers shared across services. The intent is clear and the pattern advice is correct.
