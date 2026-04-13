# Validation Summary: How to Use $text for Full-Text Search Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, `$text` operator, `$meta: 'textScore'`)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB official documentation: `$text` operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation: Text Indexes — https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB official documentation: `$meta` expression — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- PyMongo documentation: `create_index` — https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html

## Issues Found
1. **Incorrect claim about automatic relevance sorting** (intro paragraph): The post stated that `$text` "returns results sorted by relevance." This is incorrect — MongoDB does not automatically sort `$text` results by relevance score. You must explicitly use `.sort({ score: { $meta: 'textScore' } })` to sort by relevance. Changed to "supports sorting results by relevance score" to accurately reflect the behavior. The post's own code examples correctly show explicit sorting, so this was an inconsistency between the intro description and the actual usage.

## Review Notes
- The "Creating a Text Index" code block shows four consecutive `createIndex` calls for text indexes on the same collection. Since only one text index is allowed per collection, the 2nd through 4th calls would throw an error at runtime. The comments make it clear these are alternative examples, and the constraint is stated immediately after the code block, but readers who copy-paste the entire block will encounter errors.
- All code examples (Node.js and PyMongo) use correct, current API syntax.
- The aggregation example correctly places `$match` with `$text` as the first pipeline stage, which is a MongoDB requirement.
- The limitations table is accurate and the recommendation to consider Atlas Search for advanced needs is appropriate.
