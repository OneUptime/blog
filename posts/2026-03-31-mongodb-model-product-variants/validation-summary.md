# Validation Summary: How to Model Product Variants in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document schema design, queries, indexes, updates)
- MongoDB Shell (`mongosh`) query syntax
- MongoDB Node.js Driver (async `updateOne` usage)
- MongoDB Aggregation Framework (`$match`, `$unwind`, `$group`)

## Sources Consulted
- MongoDB Manual: $elemMatch (query) — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB Manual: Positional $ Update Operator — https://www.mongodb.com/docs/manual/reference/operator/update/positional/
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Manual: $inc Update Operator — https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB Manual: Unique Indexes (sparse option) — https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual: Aggregation Pipeline Stages — https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/

## Issues Found
1. **Missing `$elemMatch` in `decrementInventory` filter** — The original code used separate top-level conditions on `"variants.sku"` and `"variants.inventory"` in the update filter. Without `$elemMatch`, MongoDB can satisfy `variants.sku` from one array element and `variants.inventory: { $gte: quantity }` from a different element. This means the update could proceed even when the targeted SKU variant has insufficient inventory (because a different variant satisfies the `$gte` check). Additionally, the positional `$` operator's binding becomes ambiguous when array conditions match different elements. Fixed by wrapping both conditions in a single `$elemMatch` block, ensuring both `sku` and `inventory` checks apply to the same array element, and the `$` operator correctly identifies that element for the `$inc` update.

## Review Notes
- The `sparse: true` option on the `variants.sku` unique index is not strictly necessary since all product documents are expected to have a `variants` array with `sku` fields. It is harmless but could be removed for clarity. Left as-is since it is not incorrect and could be useful if some documents lack variants.
- The embedded approach's guidance ("up to a few dozen variants") is sound, given MongoDB's 16 MB document size limit. Each variant subdocument in this schema is relatively small, so the practical limit is well within bounds.
- All aggregation pipeline stages, index definitions, and query patterns are correct and follow current MongoDB best practices.
