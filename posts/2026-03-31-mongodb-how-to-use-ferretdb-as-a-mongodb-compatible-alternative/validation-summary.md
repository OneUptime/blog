# Validation Summary: How to Use FerretDB as a MongoDB-Compatible Alternative

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- FerretDB (MongoDB-compatible proxy)
- PostgreSQL (storage backend)
- Docker / Docker Compose
- MongoDB wire protocol
- MongoDB Node.js driver
- PyMongo (Python MongoDB driver)
- mongosh (MongoDB shell)
- GitHub Actions (CI example)

## Sources Consulted
- FerretDB official documentation — https://docs.ferretdb.io/
- FerretDB configuration flags — https://docs.ferretdb.io/configuration/flags/
- FerretDB supported commands reference — https://docs.ferretdb.io/reference/supported-commands/
- FerretDB GitHub repository — https://github.com/FerretDB/FerretDB
- FerretDB v1.24 documentation on storage format — https://docs.ferretdb.io/v1.24/understanding-ferretdb/
- FerretDB blog on query pushdown and internal storage — https://blog.ferretdb.io/ferretdb-fetches-data-query-pushdown/

## Issues Found

### 1. Incorrect PostgreSQL schema and table naming (line ~171)
**What was wrong:** The post showed `SELECT * FROM ferretdb_mydb.orders LIMIT 5;` for querying FerretDB data in PostgreSQL. This is incorrect in two ways: (a) the schema name is the MongoDB database name directly (e.g., `mydb`), not prefixed with `ferretdb_`; (b) FerretDB table names include a hash suffix (e.g., `orders_a1b2c3d4`), not plain collection names. Also, the post said "JSON columns" when FerretDB uses JSONB.

**What was changed:** Updated the SQL example to show the correct schema naming convention (`mydb`, not `ferretdb_mydb`), explained the hash-suffix table naming, showed how to look up actual table names from `_ferretdb_database_metadata`, corrected "JSON" to "JSONB", and added a note that the internal storage format is an implementation detail that may change between versions.

### 2. GitHub Actions example missing PostgreSQL service (line ~195)
**What was wrong:** The GitHub Actions CI example only defined the FerretDB service but was missing the required PostgreSQL service that FerretDB connects to via `FERRETDB_POSTGRESQL_URL`. The example would fail because the `postgres` hostname referenced in the connection string would not resolve.

**What was changed:** Added the PostgreSQL service definition with matching credentials (`user`/`pass`/`testdb`) to the GitHub Actions example.

## Review Notes
- The `version: '3'` key in the Docker Compose file is deprecated in Docker Compose v2+ but still functional and does not cause errors. Many tutorials still include it. Not changed since it doesn't break anything.
- The wire protocol claim "Compatible with MongoDB 5.0 wire protocol" is confirmed by official docs which say "MongoDB 5.0+ wire protocol."
- The Node.js example uses top-level `await` which requires either ESM modules or wrapping in an async function. This is a common convention in tutorials and is not flagged as an error.
- FerretDB v2 has moved to a DocumentDB extension backend with a different storage format. The PostgreSQL inspection section was corrected for v1 conventions with a note about version-dependent changes. Users should consult current FerretDB docs for their specific version.
- The compatibility list (supported/unsupported features) is broadly accurate based on the official supported commands reference. Individual aggregation pipeline stage support (e.g., `$lookup`) is not granularly documented in the compatibility page, but the post's characterization as "partial/in-progress" is reasonable.
