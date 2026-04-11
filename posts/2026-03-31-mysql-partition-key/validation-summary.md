# Validation Summary: How to Partition Tables in MySQL by KEY

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (KEY partitioning, LINEAR KEY partitioning)
- InnoDB storage engine
- SQL DDL (CREATE TABLE, ALTER TABLE)
- information_schema.PARTITIONS

## Sources Consulted
- MySQL 8.0 Reference Manual: KEY Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-key.html
- MySQL 8.0 Reference Manual: HASH Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-hash.html
- MySQL 8.0 Reference Manual: LINEAR HASH Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-linear-hash.html
- MySQL 8.0 Reference Manual: Management of HASH and KEY Partitions — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management-hash-key.html
- MySQL 8.0 Reference Manual: Partition Pruning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual: Partitioning Limitations — https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations.html
- MySQL 5.7 Reference Manual: KEY Partitioning — https://dev.mysql.com/doc/refman/5.7/en/partitioning-key.html

## Issues Found

1. **Incorrect hash function description**: The post stated KEY partitioning uses an "MD5-based hash function." This is only true for NDB Cluster. For InnoDB and other standard storage engines, MySQL uses its own internal hashing function (historically based on the PASSWORD() algorithm, not MD5). Changed to "MySQL's internal hashing function" throughout the post, including the mermaid diagram.

2. **Overstated column type support**: The post claimed KEY partitioning "works with all MySQL-supported column types." TEXT and BLOB columns are explicitly not supported for KEY partitioning per the MySQL documentation. Updated to say "most" column types and added the TEXT/BLOB exclusion.

3. **Incomplete pruning description**: The post stated pruning works "only on exact equality." MySQL's optimizer also supports pruning for IN() lists and short BETWEEN ranges (where the range has fewer values than the number of partitions). Updated the section text and added an IN() example.

4. **Contradictory best practice about cardinality**: The post said "Avoid very high cardinality column expressions" but then followed with "KEY works best when the partition key has diverse values." High cardinality means diverse values, so these statements contradict each other. High cardinality is actually desirable for even distribution. Rewrote to recommend choosing a partition key with high cardinality.

## Review Notes
- The SQL examples are syntactically correct and the partition column inclusion in primary keys follows MySQL's requirement that partition columns must be part of every unique key.
- The ADD PARTITION and COALESCE PARTITION syntax is correct per the MySQL documentation.
- The post correctly notes that PARTITION BY KEY() with empty parentheses defaults to using the primary key. The docs also mention fallback to a NOT NULL unique key if no primary key exists, but this omission is minor.
- The LINEAR KEY description as using a "power-of-two algorithm" is accurate per the MySQL docs on linear hashing.
