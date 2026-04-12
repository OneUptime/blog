# Validation Summary: How to Create a Descending Index in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- Descending indexes (B-tree)
- SQL DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX)
- EXPLAIN query analysis
- information_schema.STATISTICS

## Sources Consulted
- MySQL 8.0 Reference Manual — Section 10.3.13 "Descending Indexes" (https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html)
- MySQL 8.0 Reference Manual — CREATE INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- MySQL 5.7 Reference Manual — CREATE INDEX Statement (confirmed DESC was parsed but ignored pre-8.0)
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA STATISTICS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html)

## Issues Found
- **Incorrect storage engine claim (line 98):** The post stated "Descending indexes are only supported for InnoDB and MyISAM in MySQL 8.0+." The MySQL 8.0 documentation explicitly states descending indexes are supported **only for the InnoDB storage engine**. MyISAM is not supported. Changed to: "Descending indexes are supported only for the InnoDB storage engine in MySQL 8.0+."

## Review Notes
- The EXPLAIN example in the "Verifying with EXPLAIN" section uses a slightly different query (`SELECT id, category, price`) than the one introduced in "Mixed-Order Composite Indexes" (`SELECT id, category, price, name`). The EXPLAIN version drops `name`, making it a covering index query that shows "Using index" in the output. This is not technically wrong but is a minor inconsistency — the key takeaway about the absence of "Using filesort" remains valid regardless.
- The claim that backward index scans are "slightly less cache-friendly" is a reasonable technical explanation commonly cited in the MySQL community, though the official docs use the more general term "performance penalty" without specifying the cause.
- All SQL syntax is correct and follows MySQL 8.0 conventions.
- The information_schema.STATISTICS query for checking index direction is correct — COLLATION values of 'A' (ascending) and 'D' (descending) are documented.
