# Validation Summary: Partitioning or a Composite Index for a 500-Million-Row Table?

## Status
validated

## Post Type
Technical guide / database design and performance guide

## Technologies Covered
- PostgreSQL 18
- MySQL 8.4 and InnoDB
- PostgreSQL declarative table partitioning and partition pruning
- MySQL table partitioning and partition pruning
- B-tree composite and covering indexes
- PostgreSQL partial and BRIN indexes
- PostgreSQL `EXPLAIN ANALYZE`
- MySQL `EXPLAIN` and `EXPLAIN ANALYZE`
- PostgreSQL MVCC, VACUUM, WAL, and database object size functions

## Sources Consulted
- PostgreSQL: Table Partitioning — https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL: Multicolumn Indexes — https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL: Indexes and `ORDER BY` — https://www.postgresql.org/docs/current/indexes-ordering.html
- PostgreSQL: Index-Only Scans and Covering Indexes — https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL: Partial Indexes — https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL: BRIN Indexes — https://www.postgresql.org/docs/current/brin.html
- PostgreSQL: `CREATE INDEX` — https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL: `EXPLAIN` — https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL: Using `EXPLAIN` — https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL: Routine Vacuuming — https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL: Database Object Size Functions — https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE
- MySQL 8.4: Overview of Partitioning — https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html
- MySQL 8.4: Partition Pruning — https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html
- MySQL 8.4: Partitioning Keys, Primary Keys, and Unique Keys — https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.4: Partitioning Limitations Relating to Storage Engines — https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-storage-engines.html
- MySQL 8.4: Multiple-Column Indexes — https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html
- MySQL 8.4: `EXPLAIN` Statement — https://dev.mysql.com/doc/refman/8.4/en/explain.html
- MySQL 8.4: `EXPLAIN` Output Format — https://dev.mysql.com/doc/refman/8.4/en/explain-output.html

## Issues Found
- The PostgreSQL constraint rule said that a primary or unique constraint must include all non-expression partition-key columns. This could imply that an expression-based partition key is allowed and its expression can simply be omitted. PostgreSQL instead requires the partition key itself to contain no expressions or function calls, and requires the constraint to include every partition-key column. Corrected the sentence to state both requirements.
- The MySQL `EXPLAIN` guidance referred generally to “examined rows.” Traditional `EXPLAIN` reports an estimate in its `rows` field, while `EXPLAIN ANALYZE` reports actual iterator rows, loops, and timing. Updated the comparison guidance to distinguish estimated and actual values.
- The statement about partitioning both data and indexes and lacking a global secondary index was phrased as applying to MySQL without qualification. Scoped it to MySQL 8.4 InnoDB tables so it does not overgeneralize to the separately implemented NDB storage engine.

## Review Notes
- The PostgreSQL `current` documentation links resolve to PostgreSQL 18 as of the validation date; the SQL examples and `EXPLAIN` options are valid for that version.
- `CREATE INDEX CONCURRENTLY` is valid for the ordinary `events` table shown. PostgreSQL does not support building an index concurrently directly on a partitioned parent; indexes can instead be built concurrently on individual partitions and attached to a parent partitioned index.
- `pg_relation_size('events')` reports the main relation fork. `pg_table_size` would additionally include auxiliary forks and TOAST data; the post's separate total-size measurement remains correct.
- PostgreSQL B-tree indexes can be scanned backward, so `DESC` is valid but not required for this equality-prefix query.
- MySQL 8.4 partitioned InnoDB tables cannot define foreign keys or be referenced by foreign keys, reinforcing the post's warning that partitioning complicates foreign-key design.
