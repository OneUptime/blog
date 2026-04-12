# Validation Summary: How to Use mongoimport for JSON Data Loading

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Database Tools (`mongoimport`)
- JSON / NDJSON (JSON Lines)
- Extended JSON (BSON types)
- MongoDB Atlas (SRV connection strings)
- MongoDB Shell (`mongosh`) for validation queries

## Sources Consulted
- MongoDB Database Tools documentation for mongoimport: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB connection string format documentation: https://www.mongodb.com/docs/manual/reference/connection-string-formats/
- MongoDB TLS/SSL client configuration: https://www.mongodb.com/docs/manual/tutorial/configure-ssl-clients/
- mongo-tools source code (mongoimport/options.go): https://github.com/mongodb/mongo-tools/blob/master/mongoimport/options.go

## Issues Found

1. **`--ssl` flag deprecated and redundant with `mongodb+srv://`** (Atlas section)
   - **What was wrong:** The Atlas import example used the `--ssl` flag. This flag has been deprecated since MongoDB 4.2 in favor of `--tls`. Additionally, `mongodb+srv://` connection strings enable TLS by default, making the flag entirely redundant.
   - **What was changed:** Removed the `--ssl` flag from the Atlas example and added a comment explaining that `mongodb+srv://` enables TLS by default.
   - **Why:** Teaches readers current best practices and avoids confusion about deprecated flags.

2. **`--batchSize` is an undocumented/hidden flag** (Parallel Import section)
   - **What was wrong:** The parallel import example used `--batchSize 1000`. This flag exists in the mongoimport source code but is marked as `hidden:"true"` — it does not appear in `--help` output or official documentation. The value 1000 is also the default, making it a no-op.
   - **What was changed:** Removed `--batchSize 1000` from the command.
   - **Why:** Blog posts should only teach documented, supported flags. Readers would not find `--batchSize` in the official docs or `--help`, leading to confusion.

## Review Notes
- The post is well-structured and covers the most important mongoimport use cases comprehensively.
- The Extended JSON v2 example is correct and uses proper canonical format.
- The `--mode upsert` and `--mode merge` explanations with `--upsertFields` are accurate.
- The workaround for partial file imports using `head`/`sed` piping is a practical approach correctly described.
- The comparison table between mongoimport and driver insertMany is reasonable, though throughput characteristics will vary by environment.
