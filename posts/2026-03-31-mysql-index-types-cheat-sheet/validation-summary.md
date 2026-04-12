# Validation Summary: MySQL Index Types Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (InnoDB and MyISAM storage engines)
- MySQL indexes: PRIMARY KEY, UNIQUE, INDEX/KEY, FULLTEXT, SPATIAL
- Composite indexes, covering indexes, prefix indexes, functional/expression indexes (MySQL 8.0+)
- EXPLAIN query analysis
- information_schema.statistics

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — UNIQUE Indexes: https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-unique
- MySQL 8.0 Reference Manual — Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — Multiple-Column Indexes: https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Full-Text Search Functions: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — Functional Key Parts: https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts
- MySQL 5.7 Release Notes (RENAME INDEX introduced in 5.7): https://dev.mysql.com/doc/refman/5.7/en/alter-table.html

## Issues Found

1. **UNIQUE index NULL behavior (line 15):** The post stated UNIQUE indexes "allow one NULL." This is incorrect — MySQL UNIQUE indexes allow **multiple NULL values** for nullable columns, because NULL is not considered equal to NULL for uniqueness checks. Fixed "allows one NULL" to "allows multiple NULLs."

2. **RENAME INDEX version (line 119):** The post marked `ALTER TABLE ... RENAME INDEX` as "MySQL 8.0+" but this feature was introduced in **MySQL 5.7**. Fixed to "MySQL 5.7+."

3. **DISABLE KEYS / ENABLE KEYS scope (line 122):** The post showed `ALTER TABLE ... DISABLE KEYS` / `ENABLE KEYS` without noting that this only affects **MyISAM** tables and is a no-op on InnoDB. Since the rest of the post is InnoDB-focused, this was misleading. Added clarifying comment "(MyISAM only, no effect on InnoDB)."

## Review Notes
- All SQL syntax is correct and would execute without errors on the stated MySQL versions.
- The functional/expression index double-parentheses syntax `((LOWER(email)))` is correctly shown — this is a common stumbling point for users.
- The covering index explanation and example are accurate and clear.
- The prefix index trade-off note about uniqueness enforcement is correct. An additional caveat is that prefix indexes also cannot be used as covering indexes, but this is a minor omission that doesn't constitute an error.
- The EXPLAIN example is correct but minimal — the post could mention `EXPLAIN FORMAT=JSON` or `EXPLAIN ANALYZE` (MySQL 8.0.18+) in future updates for more detailed analysis.
