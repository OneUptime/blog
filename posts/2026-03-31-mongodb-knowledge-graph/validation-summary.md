# Validation Summary: How to Build a Knowledge Graph with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework, `$graphLookup`, `$lookup`, indexing)
- PyMongo (Python MongoDB driver)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB `$graphLookup` official documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphlookup/
- MongoDB `$lookup` official documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB aggregation pipeline reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- PyMongo `insert_many` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.insert_many
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
1. **`$graphLookup` query produced duplicate results**: The original query ran `$graphLookup` on `db.edges` without a preceding `$match` stage, using a literal `startWith: "entity:mongodb"`. This meant every document in the edges collection received an identical `paths` array, producing N duplicate output documents. Fixed by changing the pipeline to start from `db.nodes` with `{ $match: { _id: "entity:mongodb" } }` and using `startWith: "$_id"` to seed the traversal. This produces a single, clean result document.

2. **`maxDepth` did not match the "within 3 hops" comment**: MongoDB's `$graphLookup` uses 0-indexed depth, so `maxDepth: 3` allows traversal at depths 0, 1, 2, and 3 — which is 4 hops, not 3. Changed `maxDepth` from 3 to 2 to correctly match the "within 3 hops" comment.

3. **Added `name: 1` to `$project`**: Since the pipeline now starts from the nodes collection, included the node's `name` field in the projection for more useful output.

## Review Notes
- The node-edge data model and index strategy are well-designed and follow MongoDB best practices for graph-style data.
- The PyMongo insertion code is correct and uses current API conventions.
- The direct relationship query using `$lookup` is correct and idiomatic.
- The co-occurrence query is correct and demonstrates a useful analytical pattern.
- The best practices section accurately describes real-world trade-offs, including the recommendation to consider dedicated graph databases for large-scale use cases.
- The advice to keep `$graphLookup` maxDepth below 5 is reasonable general guidance, though the exact threshold depends on data density and index coverage.
