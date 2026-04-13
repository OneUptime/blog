# Validation Summary: How to Use $size to Query Arrays by Exact Length in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, aggregation framework)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- MongoDB official documentation: `$size` query operator (https://www.mongodb.com/docs/manual/reference/operator/query/size/)
- MongoDB official documentation: `$size` aggregation expression (https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/)
- MongoDB official documentation: `$exists` operator (https://www.mongodb.com/docs/manual/reference/operator/query/exists/)
- MongoDB official documentation: Update with aggregation pipeline (https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/)
- JavaScript language specification on duplicate object keys

## Issues Found
- **Duplicate key in query object (Combining $size with Other Operators section):** The original code used duplicate `tags` keys in a single JavaScript object literal: `{ tags: { $size: 2 }, tags: "mongodb" }`. In JavaScript, when an object has duplicate keys, the last value overwrites the first. This means the query would silently become `{ tags: "mongodb" }`, completely dropping the `$size` condition. Fixed by wrapping the two conditions in an explicit `$and` array: `{ $and: [{ tags: { $size: 2 } }, { tags: "mongodb" }] }`.

## Review Notes
- The aggregation `$size` expression (used in the `$project` and `updateMany` examples) will throw an error if the field is missing or not an array, unlike the query operator `$size` which simply doesn't match. The post's examples all operate on documents with a defined `tags` array, so this is not incorrect in context, but readers applying the aggregation pattern to collections with missing fields should be aware of this distinction.
- The `$exists` trick for querying arrays larger than N (`"tags.2": { $exists: true }`) is a well-known and correct workaround, properly explained.
- The indexing limitation note about `$size` not using indexes effectively is accurate and the recommended workaround of maintaining a dedicated count field is standard best practice.
