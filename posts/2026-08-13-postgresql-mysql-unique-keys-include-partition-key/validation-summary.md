# Validation Summary: Why PostgreSQL and MySQL Unique Keys Must Include the Partition Key

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- PostgreSQL 18
- PostgreSQL declarative table partitioning
- PostgreSQL unique constraints, primary keys, and partitioned indexes
- MySQL 8.4
- MySQL table partitioning, unique keys, and primary keys
- SQL schema design and migration validation

## Sources Consulted
- PostgreSQL 18: Table Partitioning — https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL 18: CREATE TABLE — https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18: Constraints — https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL 18: CREATE INDEX — https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18: ALTER INDEX — https://www.postgresql.org/docs/current/sql-alterindex.html
- PostgreSQL 18: `pg_indexes` — https://www.postgresql.org/docs/current/view-pg-indexes.html
- PostgreSQL 18: `pg_constraint` — https://www.postgresql.org/docs/current/catalog-pg-constraint.html
- PostgreSQL 18: Transactions — https://www.postgresql.org/docs/current/tutorial-transactions.html
- MySQL 8.4: Partitioning Keys, Primary Keys, and Unique Keys — https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.4: Overview of Partitioning — https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html
- MySQL 8.4: RANGE Partitioning — https://dev.mysql.com/doc/refman/8.4/en/partitioning-range.html
- MySQL 8.4: Partitioning Limitations Relating to Functions — https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-functions.html
- MySQL 8.4: Partitioning Limitations Relating to Storage Engines — https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-storage-engines.html
- MySQL 8.4: CREATE TABLE — https://dev.mysql.com/doc/refman/8.4/en/create-table.html
- MySQL 8.4: FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- MySQL 8.4: SHOW CREATE TABLE — https://dev.mysql.com/doc/refman/8.4/en/show-create-table.html
- MySQL 8.4: `INFORMATION_SCHEMA.STATISTICS` — https://dev.mysql.com/doc/refman/8.4/en/information-schema-statistics-table.html
- MySQL 8.4: START TRANSACTION, COMMIT, and ROLLBACK — https://dev.mysql.com/doc/refman/8.4/en/commit.html
- RFC 9562: Universally Unique IDentifiers (UUIDs) — https://www.rfc-editor.org/rfc/rfc9562.html

## Issues Found
- The PostgreSQL rule covered only the target table's partition key. Updated it to state that, in a multi-level partition hierarchy, a parent unique or primary-key constraint must also include the partition-key columns of descendant partitioned tables, and none of those partition keys may use expressions or function calls.
- The staged concurrent index-build procedure was presented without limiting its direct parent-to-leaf attachment sequence to a one-level partition tree. Scoped the sequence accordingly; multi-level trees require equivalent indexes to be attached through each level of the hierarchy.

## Review Notes
- The intentionally invalid PostgreSQL and MySQL DDL examples were reproduced against PostgreSQL 18 and MySQL 8.0 respectively, and both failed for the documented missing-partition-column reason. The corrected PostgreSQL composite primary key and analogous MySQL composite primary key were accepted.
- PostgreSQL's `/docs/current/` links resolve to PostgreSQL 18 as of the validation date. MySQL claims are explicitly scoped to MySQL 8.4 and match that manual.
- The MySQL `RANGE (YEAR(...))` example assumes MySQL's default InnoDB storage engine. NDB supports only `KEY` and `LINEAR KEY` user-defined partitioning and has additional requirements.
- MySQL 8.4 user-partitioned InnoDB tables cannot participate in foreign keys. The registry discussion correctly requires an atomic application workflow and does not claim that a foreign key to the partitioned detail table is available.
