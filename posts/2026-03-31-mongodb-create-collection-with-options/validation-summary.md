# Validation Summary: How to Create a Collection with Options in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell / `mongosh`)
- `db.createCollection()` API
- JSON Schema validation (`$jsonSchema`)
- Capped collections
- Collation settings
- Time series collections (MongoDB 5.0+)
- Clustered collections (MongoDB 5.3+)

## Sources Consulted
- MongoDB official documentation: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB official documentation: Collation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB official documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB official documentation: Clustered Collections — https://www.mongodb.com/docs/manual/core/clustered-collections/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct `mongosh` syntax and valid option fields.
- The `validationAction` default is correctly stated as `"error"` and `validationLevel` default as `"strict"`.
- The capped collection explanation that `size` takes precedence over `max` is accurate — `size` is the required constraint and documents are removed when either limit is reached.
- Collation `strength: 2` is correctly described as case-insensitive (ICU comparison level 2 ignores case differences).
- The clustered collection section correctly notes the 5.3+ version requirement and shows the valid `clusteredIndex` specification with `key`, `unique`, and optional `name` fields.
- The `expireAfterSeconds: 7776000` on the time series collection equals 90 days, which is a reasonable TTL example.
