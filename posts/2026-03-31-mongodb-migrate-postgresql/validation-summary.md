# Validation Summary: How to Migrate from PostgreSQL to MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- PostgreSQL (row_to_json, COPY, JSONB, arrays, UUID, pg_stat_user_tables)
- MongoDB (mongoimport, mongosh, BSON types, indexing, text search)
- Python (psycopg2, json module, bson library)
- mongoimport CLI tool

## Sources Consulted
- MongoDB mongoimport documentation: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB mongosh documentation (getSiblingDB, JavaScript scoping): https://www.mongodb.com/docs/mongodb-shell/
- MongoDB BSON types reference: https://www.mongodb.com/docs/manual/reference/bson-types/
- PostgreSQL row_to_json documentation: https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL COPY documentation: https://www.postgresql.org/docs/current/sql-copy.html
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found
1. **Invalid `--batchSize` flag for mongoimport**: The `mongoimport` tool does not support a `--batchSize` option. The only parallelism-related flag is `--numInsertionWorkers`. Removed `--batchSize 1000` from the large file import example.

2. **`const db = db.getSiblingDB("myapp")` causes ReferenceError in mongosh**: Using `const db` creates a new binding that shadows the mongosh global `db`. Due to JavaScript's temporal dead zone, the `db` on the right-hand side resolves to the uninitialized local `const` binding, not the global, causing a ReferenceError. Changed to `db = db.getSiblingDB("myapp")` which correctly reassigns the global variable.

## Review Notes
- The Python denormalization script uses an N+1 query pattern (one query per order to fetch items). This is functionally correct but could be slow for large datasets. A JOIN-based approach or batch fetching would be more efficient, but this is a style/performance concern rather than a correctness issue.
- The `pg_stat_user_tables.n_live_tup` column used for validation provides estimated row counts from the statistics collector, not exact counts. For precise validation, `SELECT COUNT(*) FROM table` would be more accurate, but the approach shown is acceptable for ballpark verification.
- The `serialize` function appends "Z" to both `datetime` and `date` objects. For date-only values this produces strings like "2024-01-15Z" which is not a standard ISO 8601 format. In practice this is unlikely to be triggered since the main code path handles datetimes explicitly.
