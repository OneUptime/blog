# Validation Summary: How to Use Atlas Online Archive for Automatic Data Tiering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Atlas Online Archive
- Atlas Data Federation
- Atlas Administration API (v1.0)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB Atlas Online Archive documentation: https://www.mongodb.com/docs/atlas/online-archive/
- MongoDB Atlas Online Archive API reference: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Online-Archive
- MongoDB Extended JSON (v2) specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Atlas Data Federation documentation: https://www.mongodb.com/docs/atlas/data-federation/

## Issues Found
1. **Misleading connection string claim (line 13):** The post stated archived data "remains queryable using the same MongoDB connection string." This is incorrect — archived data is queried via the federated database instance endpoint, which is a separate connection string from the primary cluster. Changed to "via the federated database instance endpoint."

2. **Unverified storage format claim (line 18):** The post stated Atlas moves documents to "object storage (Parquet format)." The internal storage format of Online Archive is not publicly documented as Parquet by MongoDB. Changed to "cloud object storage" without specifying an unverified format.

3. **Invalid custom criteria query syntax (line 101):** The custom criteria query used `$subtract` and `$$NOW`, which are aggregation pipeline operators not valid in standard MongoDB query filters. The `$date` extended JSON wrapper also does not accept aggregation expressions as values. Replaced with a valid query using proper MongoDB Extended JSON v2 date format: `{ "$date": "2025-01-01T00:00:00Z" }`.

## Review Notes
- The Atlas Administration API endpoint uses v1.0 (`/api/atlas/v1.0/`). MongoDB has released API v2 (`/api/atlas/v2/`), which is the recommended version. The v1.0 endpoints still function but may be deprecated in the future. A future update could migrate the examples to v2.
- The custom criteria example now uses a static date rather than a dynamic time-relative expression. This means the archive rule would need manual updates over time. The post could note this limitation in a future revision.
- The partition fields example in the standalone section shows 3 fields (region, createdAt, customerId). While this is valid, readers should be aware that more partition fields increase storage partitioning granularity but may also increase metadata overhead.
