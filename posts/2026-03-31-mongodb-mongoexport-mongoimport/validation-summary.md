# Validation Summary: How to Use mongoexport and mongoimport for Data Migration

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Database Tools (mongoexport, mongoimport)
- MongoDB connection strings (URI format)
- mongodump / mongorestore (comparison)
- CSV/JSON/TSV data formats

## Sources Consulted
- MongoDB official documentation: mongoexport — https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB official documentation: mongoimport — https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB Extended JSON (v2) specification — https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Database Tools documentation — https://www.mongodb.com/docs/database-tools/

## Issues Found
- **Misleading comment in migration example**: The inline comment said "last 30 days of orders" but the `--query` used a hardcoded date filter of `2024-01-01T00:00:00Z`, which does not represent "last 30 days." Changed the comment to "orders since 2024-01-01" to accurately describe the query.

## Review Notes
- All CLI flags and options for both `mongoexport` and `mongoimport` are accurate and current for MongoDB Database Tools.
- The `--query` Extended JSON v2 relaxed date syntax (`{"$date": "..."}`) is correct for modern versions of the tools.
- The `--mode` options for `mongoimport` (`insert`, `upsert`, `merge`) are correctly documented; the `delete` mode (added in later versions) is omitted but this is acceptable as it's less commonly used.
- The comparison table between `mongodump` and `mongoexport` is accurate.
- The `--numInsertionWorkers` default of 1 is correct.
- The post correctly notes that `--fields` is required for CSV export, which is accurate.
