# Validation Summary: How to Query INFORMATION_SCHEMA.STATISTICS (Indexes) in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.STATISTICS view
- SQL (DDL metadata queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html)
- MySQL 8.0 Reference Manual: SHOW INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/show-index.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)

## Issues Found
No technical issues found.

## Review Notes
- The "Counting Indexes per Table" query calculates `secondary_indexes` as `COUNT(DISTINCT INDEX_NAME) - 1`, which assumes every table has a primary key. For tables without a primary key, this would undercount by one. This is a reasonable simplification for well-designed schemas but worth noting.
- The "Finding Low-Cardinality Indexes" section's explanatory text mentions "non-unique index" but the query filters by `INDEX_NAME != 'PRIMARY'` rather than `NON_UNIQUE = 1`, so it would also return low-cardinality unique secondary indexes. This is arguably useful behavior but the text could be more precise.
- All column names, descriptions, and SQL syntax are accurate per MySQL 8.0 documentation.
- The GROUP_CONCAT usage in "Listing All Indexes for a Schema" correctly orders by SEQ_IN_INDEX for proper composite index column ordering.
