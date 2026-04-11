# Validation Summary: MySQL vs PostgreSQL: Detailed Comparison for Developers

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- MySQL (5.7+, 8.0+)
- PostgreSQL
- InnoDB storage engine
- JSONB
- GIN, BRIN, GiST, SP-GiST indexes
- PostGIS (mentioned)
- Amazon RDS / Aurora MySQL (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — Replication: https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual — CREATE INDEX (functional indexes): https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- PostgreSQL Documentation — JSON Types: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL Documentation — WAL and Replication: https://www.postgresql.org/docs/current/wal-intro.html
- PostgreSQL Documentation — Logical Replication: https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL Documentation — Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL SQL Conformance documentation: https://www.postgresql.org/docs/current/features.html

## Issues Found

1. **MySQL JSON storage incorrectly described as text (line 65)**: The post claimed "MySQL's JSON type stores data as text." This is incorrect — MySQL 5.7+ stores JSON in an optimized binary format internally, not as plain text. Fixed to accurately state that MySQL also uses a binary format, while noting the indexing limitation (no full-column GIN-style index, but functional indexes on specific paths are available since MySQL 8.0.13).

2. **Replication table mislabeled MySQL replication as "Physical replication" (lines 100-101)**: The table categorized MySQL's statement-based and row-based replication under "Physical replication." MySQL's replication via the binary log is logical replication, not physical (WAL-level) replication. Fixed by relabeling to "Replication method" and accurately describing the formats.

3. **Claim of "full SQL:2016 support" for PostgreSQL (line 124)**: The post stated PostgreSQL offers "full SQL:2016 support." No database has complete SQL:2016 compliance, including PostgreSQL (which documents its conformance gaps). Changed "full" to "extensive" to accurately reflect PostgreSQL's strong but incomplete standards compliance.

## Review Notes
- MySQL 8.0+ now supports CTEs, window functions, and lateral joins, which are listed as reasons to choose PostgreSQL. The post doesn't explicitly claim MySQL lacks these features, so the recommendation is defensible (PostgreSQL's implementations are generally considered more mature), but readers using MySQL 8.0+ should be aware these features are available in both databases.
- The data types comparison table listing "LONGTEXT" alongside "JSON" for MySQL is slightly misleading — LONGTEXT is a general text type sometimes used to store JSON strings, not a JSON-specific feature. This is a minor style issue rather than a factual error.
- All SQL code examples are syntactically correct and would work as described in their respective databases.
