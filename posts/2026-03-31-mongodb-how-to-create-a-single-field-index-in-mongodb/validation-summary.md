# Validation Summary: How to Create a Single Field Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (single field indexes, `createIndex()`, `getIndexes()`, `explain()`, `dropIndex()`)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB official documentation on Single Field Indexes: https://www.mongodb.com/docs/manual/core/index-single/
- MongoDB official documentation on `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on `explain()`: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation on Index Build Process (background option deprecation): https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found
1. **Incorrect claim about index direction for single-field indexes.** The post stated "Index direction matters for range queries and sorting. For single field equality queries, direction does not affect performance since MongoDB can traverse the index in either direction." This implies direction matters for range and sort on single-field indexes but not for equality. In reality, MongoDB can traverse a single-field index in either direction, so the sort order of the key does not matter at all for single-field indexes — not for equality, range, or sort queries. Direction only becomes important for compound indexes. Fixed to clarify this per the official MongoDB documentation.

2. **Tautological comment in explain() section.** The comment read `"totalDocsExamined" should be much lower than "totalDocsExamined" without index`, which compares the same field name to itself and is confusing. Reworded to: `"totalDocsExamined" should be close to the number of matched documents, not the total collection size`, which more clearly conveys the intended meaning.

## Review Notes
- The `background: true` option for index builds is correctly noted as applying to MongoDB 4.2 and earlier. Starting with MongoDB 4.2, this option is ignored since all index builds use an optimized process. The post handles this well.
- `db.collection.stats()` is used to check index sizes. While this still works, newer MongoDB versions (5.0+) recommend using the `$collStats` aggregation stage. This is not an error but worth noting for future updates.
- All code examples are syntactically correct for the MongoDB shell and use current APIs.
