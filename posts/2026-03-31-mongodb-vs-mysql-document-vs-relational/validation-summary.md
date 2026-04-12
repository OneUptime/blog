# Validation Summary: MongoDB vs MySQL: Document Store vs Relational Database

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- MongoDB (document store, MQL, aggregation pipeline, multi-document transactions, sharding)
- MySQL (relational database, SQL, InnoDB transactions, schema migrations)
- ProxySQL and Vitess (mentioned as MySQL horizontal scaling tools)

## Sources Consulted
- MongoDB Query Language documentation: https://www.mongodb.com/docs/manual/tutorial/query-documents/
- MongoDB multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB BSON specification: https://bsonspec.org/
- MySQL CREATE TABLE / FOREIGN KEY syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL inline REFERENCES behavior: https://dev.mysql.com/doc/refman/8.0/en/create-table.html (section on "silent column specification changes" and foreign key notes)
- MySQL transaction syntax: https://dev.mysql.com/doc/refman/8.0/en/commit.html

## Issues Found

1. **"BSON query syntax" terminology (line 51):** The post described MongoDB's query language as "BSON query syntax." BSON (Binary JSON) is MongoDB's binary storage and wire protocol format, not the query language. MongoDB's query language is officially called the MongoDB Query Language (MQL), and queries are expressed as JSON/JavaScript documents. Changed to "its own query language (MQL)."

2. **Inline `REFERENCES` does not create a foreign key in MySQL (line 43):** The `addresses` table used `user_id INT REFERENCES users(id)`, which is valid SQL standard syntax but is silently ignored by MySQL — no foreign key constraint is actually created. Per MySQL documentation: "MySQL accepts REFERENCES clauses only when specified as part of a separate FOREIGN KEY specification." Fixed by using an explicit `FOREIGN KEY (user_id) REFERENCES users(id)` clause, which correctly creates an enforced constraint. This is especially important in the context of this post, which contrasts MySQL's relational integrity with MongoDB's flexible schema.

## Review Notes
- The MongoDB transaction example uses the manual `startSession()`/`startTransaction()`/`commitTransaction()` pattern. Modern MongoDB drivers also provide `session.withTransaction()` as a recommended convenience method with built-in retry logic, but the manual pattern shown is still valid and correct.
- The MongoDB transaction example omits `session.endSession()` in a `finally` block, which is acceptable for a simplified example but worth noting for production code.
- The horizontal scaling section mentions ProxySQL and Vitess for MySQL but omits MySQL's own clustering solutions (MySQL NDB Cluster, InnoDB Cluster/Group Replication). This is a reasonable simplification for a comparison post but could be expanded in the future.
- All SQL syntax is valid MySQL. All MongoDB/MQL syntax is valid for the mongo shell and Node.js driver.
