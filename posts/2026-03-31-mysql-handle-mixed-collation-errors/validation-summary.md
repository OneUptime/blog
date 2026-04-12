# Validation Summary: How to Handle Mixed Collation Errors in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (collation system, character sets, `information_schema`)
- SQL DDL (`ALTER TABLE`, `ALTER DATABASE`)
- SQL functions (`CONVERT()`, `COLLATE`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Character Sets, Collations, Unicode: https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA COLUMNS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual — Collation Coercibility in Expressions: https://dev.mysql.com/doc/refman/8.0/en/charset-collation-coercibility.html
- MySQL 8.0 Reference Manual — ALTER DATABASE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-database.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — CONVERT() Function: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#function_convert

## Issues Found
No technical issues found.

## Review Notes
- The migration script in the "Generating a Migration Script" section covers the main string types (`varchar`, `char`, `text`, `tinytext`, `mediumtext`, `longtext`) but omits `enum` and `set`, which also carry collation. This is acceptable since collation mismatches on those types are rare in practice, and the post advises reviewing generated statements individually.
- The example column names differ slightly between the diagnostic query (`customer_id`, `id`) and the fix examples (`customer_ref`, `id`). This is a minor stylistic inconsistency but does not affect technical accuracy — they serve as illustrative placeholders.
- Fix 3 (`ALTER DATABASE`) correctly notes it only affects new tables. Existing tables retain their original collation and must be altered individually, which the migration script section addresses.
