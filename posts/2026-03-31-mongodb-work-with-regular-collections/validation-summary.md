# Validation Summary: How to Work with Regular Collections in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (collections, schema validation, indexing, read/write concerns)
- mongosh (MongoDB Shell)
- JSON Schema ($jsonSchema validator)

## Sources Consulted
- MongoDB Manual: Collection Types — https://www.mongodb.com/docs/manual/core/databases-and-collections/
- MongoDB Manual: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: Index Types — https://www.mongodb.com/docs/manual/indexes/#index-types
- MongoDB Manual: Index Properties (sparse, unique, partial, TTL) — https://www.mongodb.com/docs/manual/indexes/#index-properties
- MongoDB Manual: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: compact command — https://www.mongodb.com/docs/manual/reference/command/compact/

## Issues Found

### 1. "sparse" incorrectly listed as an index type
- **What was wrong:** The post listed "sparse" as one of the MongoDB index types alongside single field, compound, multikey, text, and geospatial. In MongoDB's documentation, "sparse" is classified as an index *property* (like unique, partial, TTL, and hidden), not an index *type*.
- **What was changed:** Replaced "sparse" with "hashed" in the list of supported index types, which is an actual MongoDB index type.
- **Why:** Accurately representing the distinction between index types and index properties prevents reader confusion and aligns with MongoDB's official documentation.

### 2. Section title and description claimed "collection-level" read/write concerns
- **What was wrong:** The section was titled "Setting Collection-Level Read/Write Concerns" and stated "You can specify default read and write concerns at the collection level." MongoDB does not support setting persistent default read/write concerns on individual collections. Defaults can be set at the cluster level (via `setDefaultRWConcern`), database level, or client level — or specified per-operation. The code example actually showed per-operation write concern, contradicting the title.
- **What was changed:** Renamed the section to "Specifying Read/Write Concerns Per Operation" and updated the description to say "You can specify read and write concerns on individual operations." Also removed `await` from the `insertOne` call since it's unnecessary in `mongosh`.
- **Why:** The original framing was factually incorrect and could mislead readers into thinking MongoDB has a collection-level default concern feature that doesn't exist.

## Review Notes
- The `db.orders.stats()` method works but is a wrapper around the `collStats` command, which was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. This is not incorrect for current usage but may warrant a note in future updates.
- The post correctly uses `mongosh` syntax throughout. The code examples are syntactically correct and functional.
- The JSON Schema validation example is well-constructed with appropriate use of `bsonType`, `required`, `minimum`, and `pattern` fields.
