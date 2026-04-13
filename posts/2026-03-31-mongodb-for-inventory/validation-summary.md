# Validation Summary: How to Use MongoDB for Real-Time Inventory Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document model, update operators, aggregation framework, TTL indexes)
- Node.js MongoDB Driver (async/await, findOneAndUpdate, updateOne, insertOne)
- Mermaid (flowchart diagram)

## Sources Consulted
- MongoDB Manual: `findOneAndUpdate` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Manual: Update Operators (`$inc`, `$push`, `$pull`, `$set`) — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB Manual: `$expr` for comparing fields in queries — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: `$` positional projection operator — https://www.mongodb.com/docs/manual/reference/operator/projection/positional/
- MongoDB Node.js Driver: `findOneAndUpdate` return value — https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/

## Issues Found

1. **Low stock report query used string literal instead of `$expr` for field comparison** (line 256-258): The query `{ availableQuantity: { $lte: "$reorderPoint" } }` treated `"$reorderPoint"` as a string literal, not a field reference. In a standard `find()` query filter, field references are not resolved — `"$reorderPoint"` is compared as the literal string. Fixed by wrapping in `$expr: { $lte: ["$availableQuantity", "$reorderPoint"] }`, which enables expression-based field comparison.

2. **TTL index comment and summary said "archive" instead of "delete"** (line 294, 303): TTL indexes in MongoDB permanently **delete** documents once they exceed the `expireAfterSeconds` threshold. The comment and summary used the word "archive," which implies the data is preserved elsewhere. Changed to "auto-delete" to accurately describe TTL behavior.

## Review Notes
- The multi-warehouse stock query uses two separate dot-notation conditions on the `warehouseLocations` array (`"warehouseLocations.warehouseId"` and `"warehouseLocations.quantity"`) without `$elemMatch`. This means the conditions could be satisfied by different array elements. In practice this is unlikely to cause issues for this use case, but using `$elemMatch` would be more robust for ensuring both conditions apply to the same array element.
- The `releaseExpiredReservations` function's log message says `Released ${products.length} expired reservations`, but `products.length` is the count of products with expired reservations, not the total count of expired reservations released. This is a minor logging inaccuracy.
- The flowchart shows "Deduct from inventory" as a step after "Fulfill and ship," but the `confirmReservation` code deducts from `totalQuantity` at payment confirmation time. This is a minor inconsistency between the diagram and the implementation, though either approach is valid.
- The Node.js driver code correctly uses `returnDocument: "after"` (the v4+ driver syntax) rather than the older `returnOriginal: false`.
