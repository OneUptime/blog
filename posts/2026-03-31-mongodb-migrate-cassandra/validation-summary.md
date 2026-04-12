# Validation Summary: How to Migrate from Cassandra to MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Cassandra (cqlsh, COPY TO/FROM, CQL)
- MongoDB (mongoimport, mongosh, BSON types, indexes, TTL indexes)
- Python (csv, json, datetime, ast modules)

## Sources Consulted
- Apache Cassandra documentation for COPY TO/FROM options: https://cassandra.apache.org/doc/latest/cassandra/tools/cqlsh.html
- MongoDB mongoimport documentation: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB BSON types reference: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB index documentation: https://www.mongodb.com/docs/manual/indexes/
- JavaScript temporal dead zone (TDZ) specification behavior for `const` declarations

## Issues Found

1. **COPY TO option `MAXBATCHSIZE` incorrect (line 74)**: The `MAXBATCHSIZE` option is valid for `COPY FROM` (importing into Cassandra) but not for `COPY TO` (exporting from Cassandra). Changed to `PAGESIZE`, which controls the number of rows fetched per page during export and is the correct option for tuning `COPY TO` performance.

2. **`const db = db.getSiblingDB()` causes ReferenceError (line 205)**: Using `const db = db.getSiblingDB("myapp")` in mongosh throws a `ReferenceError` due to JavaScript's temporal dead zone. The `const` declaration creates a new `db` binding in the current scope, and the right-hand side attempts to read `db` before that binding is initialized. Changed to `db = db.getSiblingDB("myapp")` (reassignment of the global `db` variable), which is the standard mongosh pattern.

## Review Notes
- The `parse_cassandra_timestamp` function hardcodes the `+0000` timezone offset as a literal string in the format pattern. This works when Cassandra exports in UTC (common default) but would silently fail for other timezone offsets. A more robust approach would use `%z` or a library like `dateutil.parser`, but this is acceptable for a tutorial.
- The `parse_cassandra_map` function uses `ast.literal_eval`, which requires Python-style quoted strings in the map. Cassandra's COPY TO may export map keys/values without quotes for non-string types, which could cause `literal_eval` to fail. The `try/except` fallback handles this gracefully.
- The `SELECT COUNT(*)` validation query can be slow on large Cassandra tables since it performs a full table scan. For large datasets, comparing row counts per partition or using estimates may be more practical.
