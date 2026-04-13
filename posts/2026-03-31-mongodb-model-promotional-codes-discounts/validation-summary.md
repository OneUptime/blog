# Validation Summary: How to Model Promotional Codes and Discounts in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document schema design, indexes, TTL indexes)
- MongoDB Node.js Driver (findOne, updateOne, insertOne with sessions)
- MongoDB Transactions (multi-document operations via session parameter)

## Sources Consulted
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Unique Indexes documentation: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Node.js Driver API (Collection methods: findOne, updateOne, insertOne): https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/

## Issues Found

1. **TTL index description said "auto-archive" instead of "auto-remove"**: TTL indexes in MongoDB delete documents once the indexed date field has passed; they do not archive them. Changed "auto-archive expired codes if you set the documents to expire" to "auto-remove expired codes by having MongoDB delete documents once the date has passed."

2. **Missing `promoRedemptions` insert in `applyPromoCode`**: The function checked per-customer usage by querying the `promoRedemptions` collection and relied on a unique compound index on `(promoCode, customerId)`, but it never actually inserted a redemption record. Without this insert, the per-customer check would always pass and the unique index would never enforce limits. Added an `insertOne` call to `promoRedemptions` within the session to record each redemption.

## Review Notes
- The `usesPerCustomer` field in the schema supports values greater than 1, but the unique compound index on `(promoCode, customerId)` and the simple existence check in the code only enforce a limit of exactly 1 use per customer. If multi-use per customer is needed, the index should not be unique and the check should use `countDocuments` instead. This is acceptable for the common case demonstrated but worth noting for readers who need multi-use support.
- The `items` parameter in `applyPromoCode` is accepted but unused. In a complete implementation it would be needed to filter applicable items against `applicableTo.categories` and `applicableTo.productIds`, but this is acceptable for a simplified tutorial.
- The `calculateDiscount` function is called twice in the fixed code (once for the redemption record, once for the return value). In production code this should be computed once and stored in a variable, but this is a minor efficiency concern and acceptable for tutorial purposes.
