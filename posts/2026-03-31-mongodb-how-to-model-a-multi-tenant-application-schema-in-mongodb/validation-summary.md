# Validation Summary: How to Model a Multi-Tenant Application Schema in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (shell commands, aggregation pipeline, views, indexing)
- Mongoose ODM for Node.js
- Express.js middleware pattern
- JavaScript / Node.js

## Sources Consulted
- MongoDB ObjectId specification: https://www.mongodb.com/docs/manual/reference/bson-types/#objectid
- MongoDB `createView` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createView/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- Mongoose `createConnection` API: https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.createConnection()
- MongoDB multi-tenancy patterns: https://www.mongodb.com/docs/manual/tutorial/model-data-for-multi-tenancy/

## Issues Found
1. **Invalid ObjectId values**: `ObjectId("ord001")`, `ObjectId("ord002")`, and `ObjectId("t001")` used short arbitrary strings instead of valid 24-character hex strings. MongoDB's `ObjectId()` constructor requires exactly a 24-character hexadecimal string (representing 12 bytes); passing shorter strings throws an error. Replaced with valid hex strings: `ObjectId("6607a1b2c3d4e5f6a7b8c901")`, `ObjectId("6607a1b2c3d4e5f6a7b8c902")`, and `ObjectId("6607a1b2c3d4e5f6a7b8c001")`.

## Review Notes
- The scale limits in the overview table (e.g., "< 500 tenants" for database-per-tenant) are reasonable rules of thumb but are not hard MongoDB limits. They depend heavily on hardware, connection pooling configuration, and workload characteristics.
- The section titled "Row-Level Security with MongoDB Views" uses the term loosely. MongoDB views are not a true row-level security mechanism (they don't enforce access control); they are a query abstraction layer. The body text correctly describes them as "an extra isolation layer," which is accurate.
- The Express middleware pattern for tenant isolation is a solid conceptual example. The `{ ...filter, tenantId }` spread ordering correctly ensures the server-side `tenantId` overrides any client-supplied value, which is the secure approach.
- The `mongoose.createConnection()` call with `await` works in Mongoose 6+ because Connection objects are thenable, though strictly speaking the connection opens asynchronously in the background. The pattern shown is idiomatic and commonly used.
