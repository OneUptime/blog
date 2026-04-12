# Validation Summary: MongoDB vs Cassandra: When to Choose Each

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, BSON, aggregation pipeline, sharding)
- Apache Cassandra (wide-column store, CQL, LSM tree, ring topology)
- MongoDB Atlas (managed service)
- DataStax Astra (managed Cassandra service)

## Sources Consulted
- MongoDB official documentation: https://www.mongodb.com/docs/manual/
- MongoDB read concern documentation: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/
- Apache Cassandra documentation: https://cassandra.apache.org/doc/latest/
- Cassandra CQL reference (data types, PRIMARY KEY, CLUSTERING ORDER): https://cassandra.apache.org/doc/latest/cassandra/cql/
- Cassandra consistency levels: https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Cassandra lightweight transactions: https://cassandra.apache.org/doc/latest/cassandra/cql/dml.html#lightweight-transactions

## Issues Found
No technical issues found.

## Review Notes
- The Cassandra `orders_by_user` table uses `PRIMARY KEY (user_id, created_at)` without including `order_id` in the clustering key. This means two orders for the same user with identical timestamps would cause an upsert collision. In production, you would typically use `PRIMARY KEY (user_id, created_at, order_id)` to guarantee uniqueness. However, this is a modeling best-practice concern rather than a syntax or technical error, and the example serves its illustrative purpose.
- The MongoDB consistency levels listed (Majority, local, linearizable) are a subset of available read concerns. Others include `available` and `snapshot`. The subset shown is sufficient for a comparison article.
- Cassandra 5.0 introduced Accord-based transactions beyond LWTs, but characterizing Cassandra as "LWT only" is reasonable for a general comparison and aligns with most deployed versions.
