# Validation Summary: How to Model Shopping Cart with Inventory Reservation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, TTL indexes, `findOneAndUpdate`, `$inc`, `$push`, `$pull`)
- Node.js MongoDB Driver (v4+ API with `returnDocument` option)
- E-commerce inventory reservation pattern

## Sources Consulted
- MongoDB documentation on multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Node.js Driver documentation on `findOneAndUpdate` return type (v6.x returns document directly, not wrapped): https://www.mongodb.com/docs/drivers/node/current/
- MongoDB documentation on Change Streams (to verify no pre-delete hook exists for TTL): https://www.mongodb.com/docs/manual/changeStreams/

## Issues Found
- **Incorrect claim about "pre-delete hook" for TTL**: The original text stated "a pre-delete hook or background job must release inventory." MongoDB has no pre-delete hooks for TTL index deletions. TTL is a background process managed by the MongoDB server with no interception mechanism. Changed the text to clarify that MongoDB TTL deletions have no pre-delete hooks and a background job is the correct approach.

## Review Notes
- **Expiration cleanup lacks transactions**: The background job that releases inventory for expired carts performs multiple `updateOne` calls and a `deleteOne` without a transaction. If the process crashes mid-iteration, some inventory may be double-released on retry. A more robust approach would atomically set the cart status to "expired" first (filtering on `status: "active"` to prevent re-processing), then release inventory, then delete the cart. This is a design robustness concern rather than a correctness error in the happy path.
- **`removeFromCart` quantity mismatch potential**: The function uses `$pull` (which removes the entire array element) but takes a separate `quantity` parameter for the inventory `$inc`. If the caller passes a quantity different from the item's actual quantity in the cart, inventory counts will drift. Reading the item's quantity from the cart before releasing would be safer. Acceptable as a simplified example.
- **`addToCart` does not handle duplicate items**: Calling `addToCart` for the same SKU twice pushes two separate entries into the `items` array rather than incrementing the existing entry's quantity. This is a common simplification for blog posts but worth noting.
- **`subtotal` not maintained by code**: The schema includes a `subtotal` field but none of the code examples update it. Minor inconsistency between schema and implementation.
- All MongoDB Node.js Driver API usage is correct for v4+ (e.g., `returnDocument: "after"/"before"`, `findOneAndUpdate` returning the document directly, `session.withTransaction()`).
- The `expireAfterSeconds: 0` TTL index configuration is correct — documents expire at the exact date in the indexed field.
- The inventory math is sound: `available + reserved = total` invariant holds through add, remove, and checkout flows.
