# Validation Summary: How to Drop Indexes in MongoDB with dropIndex() and dropIndexes()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell methods: `dropIndex()`, `dropIndexes()`, `getIndexes()`, `hideIndex()`, `$indexStats`)
- MongoDB Index Management

## Sources Consulted
- MongoDB official documentation for `db.collection.dropIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB official documentation for `db.collection.dropIndexes()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndexes/
- MongoDB official documentation for `db.collection.hideIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.hideIndex/
- MongoDB official documentation for `$indexStats` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation on compound index prefixes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/#prefixes

## Issues Found
- **`dropIndexes()` with array of key specification documents**: The post incorrectly showed `db.users.dropIndexes([{ email: 1 }, { username: 1 }])` as valid syntax. The `dropIndexes()` method does NOT accept an array of key specification documents — the array form only accepts string index names. A single key specification document (not wrapped in an array) is valid. Fixed by changing the example to `db.users.dropIndexes({ email: 1 })` which is the correct syntax for dropping by key specification.
- **Incorrect version annotation**: The comment on the array-of-key-patterns example said "MongoDB 4.4+" but the array-of-names feature for `dropIndexes()` was introduced in MongoDB 4.2+. Moved the version note to the correct example (array of string names) and corrected it to "MongoDB 4.2+".

## Review Notes
- `db.collection.dropIndex()` is still functional in current MongoDB versions, though `dropIndexes()` can now handle all the same use cases and more. The post correctly covers both methods.
- The `hideIndex()` recommendation for safe index removal is good practice and was introduced in MongoDB 4.4.
- The compound index prefix optimization explanation is accurate and useful.
- `db.collection.stats()` is a legacy helper; newer applications may prefer the `$collStats` aggregation stage, but `stats()` remains functional.
