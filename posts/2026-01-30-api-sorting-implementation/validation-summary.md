# Validation Summary: How to Build API Sorting Implementation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- REST API sorting
- TypeScript
- Express
- PostgreSQL
- MySQL
- SQLite
- MongoDB
- Zod
- Cursor-based pagination
- Database indexes

## Sources Consulted
- PostgreSQL documentation: Sorting Rows / ORDER BY - https://www.postgresql.org/docs/current/queries-order.html
- PostgreSQL documentation: Indexes and ORDER BY - https://www.postgresql.org/docs/current/indexes-ordering.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL documentation: Collation Support - https://www.postgresql.org/docs/current/collation.html
- MySQL 8.4 Reference Manual: Working with NULL Values - https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html
- MySQL 8.4 Reference Manual: NULL Values - https://dev.mysql.com/doc/refman/8.4/en/null-values.html
- SQLite documentation: SELECT / ORDER BY processing - https://sqlite.org/lang_select.html
- MongoDB manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB manual: db.collection.createIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/
- MongoDB Node.js Driver documentation: Access Data From a Cursor - https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/
- Node.js documentation: Buffer encodings - https://nodejs.org/api/buffer.html
- Zod documentation: Error customization / ZodError issues - https://zod.dev/error-customization

## Issues Found
- The PostgreSQL collation helper accepted a raw collation name inside quoted SQL and implied case/accent sensitivity handling that it did not implement. Escaped the identifier and clarified that the collation should come from a trusted database collation name.
- The SQL cursor pagination predicate mishandled `NULLS LAST`, especially for descending sorts with a NULL cursor value, and could add a contradictory duplicate primary-key tie-breaker. Reworked the predicate builder to use an effective sort list with the primary key included once and to include NULL rows after non-NULL cursor values when using `NULLS LAST`.
- The Express limit parser could produce `NaN` for invalid `limit` input. Added an explicit finite-number check and default fallback.
- The MongoDB section said it used the aggregation framework, but the code used `find().sort().limit()`. Corrected the description.
- The MongoDB cursor filter duplicated the `_id` tie-breaker and compared decoded `_id` cursor strings directly against `_id` fields. Reworked the effective sort fields and converted valid `_id` strings back to `ObjectId`.
- The Zod validation snippet built a regular expression from field names without escaping regex metacharacters and used `result.error.errors`, which is not the current documented Zod 4 property. Escaped field names and switched to `result.error.issues`.

## Review Notes
- The examples remain illustrative and still assume a trusted whitelist for sortable SQL identifiers. In production, keep sort fields mapped to known column expressions rather than accepting arbitrary client-provided names.
- The SQL cursor helper now matches the article's `NULLS LAST` configuration. Supporting arbitrary `NULLS FIRST` and mixed per-field NULL policies would require extending the cursor predicate builder further.
