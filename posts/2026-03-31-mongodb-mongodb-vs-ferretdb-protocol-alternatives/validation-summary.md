# Validation Summary: MongoDB vs FerretDB: MongoDB Protocol Alternatives

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB
- FerretDB
- PostgreSQL
- Node.js MongoDB driver
- Docker

## Sources Consulted
- FerretDB official documentation: https://docs.ferretdb.io/
- FerretDB v2.x configuration flags: https://docs.ferretdb.io/configuration/flags/
- FerretDB v2.x supported aggregation stages: https://docs.ferretdb.io/reference/supported-commands/
- FerretDB Docker installation guide: https://docs.ferretdb.io/installation/ferretdb/docker/
- FerretDB GitHub repository (LICENSE): https://github.com/FerretDB/FerretDB
- FerretDB authentication documentation: https://docs.ferretdb.io/security/authentication/

## Issues Found

1. **SQLite backend reference removed (line 13):** The post stated FerretDB stores data in "PostgreSQL or SQLite." FerretDB v2.x dropped the SQLite backend; only PostgreSQL (with the DocumentDB extension) is supported. Changed to "PostgreSQL" only.

2. **authMechanism=PLAIN updated to SCRAM-SHA-256 (line 37):** The connection string example used `authMechanism=PLAIN`, which was valid in FerretDB v1.x but is no longer supported in v2.x. FerretDB v2.x only supports `SCRAM-SHA-256`. Updated the connection string accordingly.

3. **$facet described as "partial" corrected to unsupported (line 57):** The post listed `$facet (partial)` in the compatibility limitations. FerretDB v2.x does not support `$facet` at all -- it is entirely absent from the supported aggregation stages list. Removed the "(partial)" qualifier.

## Review Notes
- The `_jsonb` column name in the PostgreSQL SQL example is an internal implementation detail from FerretDB v1.x. With FerretDB v2.x using the DocumentDB extension for PostgreSQL, the internal storage schema may differ. The example is kept as an illustrative approximation of how FerretDB maps documents to PostgreSQL, but readers should not rely on this specific column name.
- The performance comparison numbers are approximate and reasonable but not sourced from a specific benchmark. They are presented as rough estimates, which is appropriate.
- The Docker image `ghcr.io/ferretdb/ferretdb` and environment variable `FERRETDB_POSTGRESQL_URL` are confirmed correct per official documentation.
- MongoDB's license is correctly described as SSPL; FerretDB's license is correctly described as Apache 2.0.
