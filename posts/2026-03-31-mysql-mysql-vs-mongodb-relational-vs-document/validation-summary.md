# Validation Summary: MySQL vs MongoDB: When to Choose Relational vs Document

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MongoDB (aggregation framework, $lookup, multi-document transactions)
- pt-online-schema-change (Percona online schema change tool)
- gh-ost (GitHub online schema migration tool)
- Vitess (MySQL sharding middleware)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE, ALTER TABLE, transactions: https://dev.mysql.com/doc/refman/8.0/en/
- MySQL 8.0 GROUP BY handling and ONLY_FULL_GROUP_BY: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MongoDB Manual — Document model: https://www.mongodb.com/docs/manual/core/data-modeling-introduction/
- MongoDB Manual — $lookup aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual — Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB 4.0 release notes (multi-document transactions): https://www.mongodb.com/docs/manual/release-notes/4.0/
- Vitess documentation: https://vitess.io/docs/
- gh-ost documentation: https://github.com/github/gh-ost
- pt-online-schema-change documentation: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found
No technical issues found.

## Review Notes
- The term "schema-less" for MongoDB is a common simplification. Since MongoDB 3.2, schema validation rules can be applied to collections. The post's characterization is acceptable for a comparison overview but readers should know MongoDB supports optional schema enforcement.
- The MySQL GROUP BY query selects `u.email` while grouping by `u.id`. This works correctly even with `ONLY_FULL_GROUP_BY` enabled (default since MySQL 5.7.5) because `u.id` is a primary key that functionally determines all other columns in the `users` table.
- The "Needs Vitess" entry for MySQL horizontal sharding is a simplification — other options exist (ProxySQL, MySQL NDB Cluster, application-level sharding) — but Vitess is the most widely adopted solution and this is a reasonable shorthand for a comparison table.
- MongoDB 4.2 extended multi-document transactions to sharded clusters; the post only mentions 4.0 (replica set transactions). This is not incorrect but could be more complete.
