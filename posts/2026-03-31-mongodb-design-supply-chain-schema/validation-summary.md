# Validation Summary: How to Design a Supply Chain Schema in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document model, schema design, indexing, aggregation framework)

## Sources Consulted
- MongoDB Manual: Document Structure and `_id` field — https://www.mongodb.com/docs/manual/core/document/
- MongoDB Manual: `createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: `$lookup` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: `$expr` query operator — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB Manual: Compound `_id` fields — https://www.mongodb.com/docs/manual/core/document/#the-_id-field

## Issues Found
No technical issues found.

## Review Notes
- The compound `_id: { productId, warehouseId }` pattern in the inventory collection is a well-established MongoDB design for multi-location inventory. The post also duplicates `productId` and `warehouseId` as top-level fields, which is a practical choice for cleaner aggregation pipeline queries.
- All arithmetic in the purchase order (line item totals, subtotal, shipping, grand total) is correct.
- The inventory math (quantityOnHand 320 minus quantityReserved 45 equals quantityAvailable 275) is consistent.
- The `$lookup` in the low-inventory aggregation correctly references the top-level `productId` field (not `_id.productId`), matching against the products collection's `_id`. This works because inventory documents store `productId` both inside the compound `_id` and as a top-level field.
- The `$expr` with `$lte` for cross-document field comparison requires MongoDB 3.6+. This is not noted in the post but is unlikely to be an issue for modern deployments.
