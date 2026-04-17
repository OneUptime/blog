# Validation Summary: How to Build Collaborative Filtering Features in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions, CTEs, parameterized queries)
- SQL (JOINs, subqueries, aggregation)
- Collaborative filtering (user-based and item-based CF)
- Cosine similarity

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions (sum, sqrt): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sum and https://clickhouse.com/docs/en/sql-reference/functions/math-functions
- ClickHouse query parameters `{name:Type}` syntax: https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters
- ClickHouse CTE / WITH clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse IN / NOT IN operator: https://clickhouse.com/docs/en/sql-reference/operators/in
- Standard cosine similarity definition (Sarwar et al., 2001, "Item-Based Collaborative Filtering Recommendation Algorithms")

## Issues Found
No technical issues found.

All SQL is syntactically valid ClickHouse:
- `CREATE TABLE ... ENGINE = MergeTree() ORDER BY (...)` is the correct engine definition syntax.
- `sum()` and `sqrt()` are valid ClickHouse aggregate/math functions.
- Parameterized query syntax `{target_user:UInt32}` matches ClickHouse's named parameter format.
- CTE `WITH similar_users AS (...), seen AS (...)` is supported.
- The self-join with `a.user_id < b.user_id` correctly avoids duplicate/self pairs.
- The cosine similarity formula (dot product divided by product of L2 norms) is mathematically correct.

## Review Notes
- The norms in the cosine similarity query are computed over the intersection of items rated by both users (because the JOIN restricts rows to `a.item_id = b.item_id`). This is a common CF approximation sometimes called "cosine on overlap" and is appropriate for sparse rating matrices, but differs from strict full-vector cosine similarity where norms would span each user's complete rating vector. The post does not claim otherwise, so this is not an error — just a nuance worth noting.
- The "Finding Top-N Similar Users" and "Generating Item Recommendations" sections reference a `user_similarity` table that is not explicitly created in the post. Readers are expected to materialize the output of the first query (e.g., into a table or materialized view) before running the later queries. A brief note to that effect could improve clarity in a future revision.
- The user-based recommendation query will work but could be slow at scale without pre-materialized similarity; a production deployment would typically use a MaterializedView or periodic batch job.
- All ClickHouse features used are stable and not deprecated as of the current ClickHouse version.
