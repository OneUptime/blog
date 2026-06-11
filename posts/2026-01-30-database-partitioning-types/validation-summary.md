# Validation Summary: How to Build Database Partitioning Types

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- PostgreSQL declarative table partitioning
- MySQL table partitioning
- SQL DDL
- Range partitioning
- List partitioning
- Hash partitioning
- Composite / subpartitioning
- Partition pruning and partition maintenance

## Sources Consulted
- PostgreSQL documentation: Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: CREATE TABLE partition examples - https://www.postgresql.org/docs/current/sql-createtable.html
- MySQL 8.4 Reference Manual: RANGE Partitioning - https://dev.mysql.com/doc/refman/8.4/en/partitioning-range.html
- MySQL 8.4 Reference Manual: Partitioning Types - https://dev.mysql.com/doc/refman/8.4/en/partitioning-types.html
- MySQL 8.4 Reference Manual: Partitioning Keys, Primary Keys, and Unique Keys - https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.4 Reference Manual: Partitioning Limitations Relating to Functions - https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-functions.html

## Issues Found
- The PostgreSQL composite partitioning example created two hash subpartitions with `MODULUS 4` and remainders 0 and 1 only. With PostgreSQL hash partitioning, each partition covers rows where the hash value divided by the modulus produces the specified remainder; rows producing remainders 2 or 3 would have no matching subpartition. Changed both subpartition definitions to `MODULUS 2` so the two shown partitions cover all possible remainders.

## Review Notes
- The PostgreSQL range, list, hash, partition management, and pruning examples match current declarative partitioning syntax.
- The MySQL range partitioning example uses `YEAR(order_date)`, which is supported for time-based range partitioning and partition pruning. Its composite primary key includes `order_date`, satisfying MySQL's requirement that columns used in a partitioning expression appear in every unique key.
