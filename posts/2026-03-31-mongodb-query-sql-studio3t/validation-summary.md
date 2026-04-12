# Validation Summary: How to Query MongoDB with SQL Using Studio 3T

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Studio 3T (GUI client with SQL Query feature)
- SQL (SELECT, JOIN, GROUP BY, aggregation functions)
- MongoDB Aggregation Framework (MQL pipelines)

## Sources Consulted
- Studio 3T official documentation on SQL Query feature (https://studio3t.com/knowledge-base/articles/sql-query/)
- Studio 3T SQL support reference and release notes
- Studio 3T Knowledge Base articles on joins and array querying
- MongoDB official documentation on aggregation pipeline optimization (https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/)
- MongoDB documentation on array query operators

## Issues Found

1. **Step 7 — Invalid array query syntax (`items[*].sku`)**: The original query `WHERE 'WIDGET-1' IN items[*].sku` used JSONPath-style `[*]` wildcard syntax, which is not part of Studio 3T's SQL dialect. Fixed to use dot notation (`WHERE "items.sku" = 'WIDGET-1'`), which Studio 3T translates to MongoDB's implicit array element matching.

2. **Step 7 — Unsupported `CROSS JOIN UNNEST` syntax**: The original example used `CROSS JOIN UNNEST(tags) AS t(tag)`, which is a PostgreSQL/BigQuery/Presto construct not supported by Studio 3T's SQL engine. Studio 3T only supports INNER JOIN and LEFT OUTER JOIN. Replaced the example with a simpler array query and added a note that array unwinding requires MQL via the IntelliShell tab.

3. **Step 7 — Misleading introductory text**: The original text mentioned `UNWIND` and `ANY` as SQL constructs for array queries. `$unwind` is an MQL aggregation stage (not SQL), and `ANY` is not a documented keyword in Studio 3T's SQL dialect. Rewrote the introduction to accurately describe dot-notation-based array querying.

4. **Step 8 — Incorrect MQL pipeline stage order**: The example aggregation pipeline placed `$project` before `$sort`, removing the `createdAt` field before it was needed for sorting. This would cause the sort to fail or produce undefined results. Fixed by reordering to: `$match` → `$sort` → `$limit` → `$project`, which is the correct and optimal stage ordering.

## Review Notes
- Studio 3T is a commercial product and its SQL dialect is proprietary. Feature availability may vary across versions. The post does not specify a Studio 3T version, which is acceptable since the core SQL Query feature has been stable across recent releases.
- The Limitations section correctly notes that INSERT/UPDATE/DELETE are not supported through the SQL interface, which remains accurate.
- The SQL functions mapping table is accurate for the listed functions and their MongoDB aggregation equivalents.
- The connection and UI navigation steps (Steps 1-2) use reasonable menu/button names, though exact labels may vary slightly across Studio 3T versions and platforms.
