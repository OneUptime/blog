# Validation Summary: MongoDB vs PostgreSQL: When to Use Which

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, aggregation pipeline, transactions)
- PostgreSQL (relational database, SQL, joins, HAVING)
- MongoDB Node.js Driver (transaction API)
- Citus (PostgreSQL sharding extension)

## Sources Consulted
- PostgreSQL documentation on SELECT/HAVING: https://www.postgresql.org/docs/current/sql-select.html — confirms column aliases cannot be used in HAVING clauses; the aggregate expression must be repeated.
- MongoDB documentation on $lookup: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB documentation on multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/ — confirms transactions were introduced in version 4.0.
- MongoDB documentation on $group accumulator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- PostgreSQL documentation on SERIAL type: https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL

## Issues Found
1. **PostgreSQL HAVING clause used a column alias (line 48)**: The query had `HAVING total > 100`, but PostgreSQL does not allow referencing column aliases in the `HAVING` clause — this would produce the error `column "total" does not exist`. Fixed to `HAVING SUM(oi.price) > 100`, which repeats the aggregate expression as required by PostgreSQL's SQL grammar.

## Review Notes
- The MongoDB aggregation example uses `$sum: "$items.price"` in a `$group` stage. If `items` is an array (which is likely given the comparison with a separate `order_items` table in PostgreSQL), this would not correctly sum array element prices. An `$unwind: "$items"` stage before the `$group` would be needed. However, since the data model is not explicitly defined and the example is meant as a conceptual illustration of `$lookup`, this was not changed.
- The MongoDB transaction example omits `session.endSession()` in a `finally` block, which is a best practice for resource cleanup. Not changed as it is a simplified illustration and the session will be cleaned up eventually.
- The post correctly notes MongoDB 4.0 introduced multi-document transactions (for replica sets; 4.2 extended to sharded clusters). This distinction is not mentioned but is a minor omission.
- PostgreSQL's native table partitioning (since v10) is not the same as distributed sharding; the claim that sharding "requires tools like Citus" is accurate for true distributed sharding across servers.
