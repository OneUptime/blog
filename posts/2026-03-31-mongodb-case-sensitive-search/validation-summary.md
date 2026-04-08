# Validation Summary: How to Perform a Case-Sensitive Search in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query engine, collation, indexing)
- MongoDB `$regex` operator
- MongoDB `$text` full-text search
- MongoDB Collation (ICU strength levels)

## Sources Consulted
- MongoDB Manual — Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Manual — `$regex`: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Manual — `$text`: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual — `cursor.collation()`: https://www.mongodb.com/docs/manual/reference/method/cursor.collation/
- MongoDB Manual — `db.collection.find()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/

## Issues Found

1. **Incorrect `find()` syntax with collation**: The post passed collation as a third argument to `db.users.find()` (`db.users.find(filter, projection, { collation: ... })`). In the mongo shell, `find()` accepts only `(filter, projection)`. Collation must be specified via the `.collation()` cursor method. Fixed to: `db.users.find({ name: "Alice" }).collation({ locale: "en", strength: 3 })`.

2. **Incorrect claim that `$text` is "always" case-insensitive**: The post stated MongoDB's `$text` search is "always case-insensitive." Since MongoDB 3.2, `$text` supports the `$caseSensitive: true` option to enable case-sensitive full-text search. Updated the section to reflect this capability with a code example.

## Review Notes
- The collation strength table is accurate and well-presented.
- The comparison table of approaches is reasonable. The claim that `$regex` with a prefix anchor gets "partial index" use is correct — MongoDB can use an index for the prefix portion of an anchored regex.
- The advice about normalizing data at write time is sound practical guidance.
