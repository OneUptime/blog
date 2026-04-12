# Validation Summary: How to Implement Payment Retry Logic with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, `findOneAndUpdate`, `$expr`, `$push`, `$set`)
- Node.js (MongoDB Node.js driver)
- Stripe Node.js SDK (Charges API, idempotency keys)
- JavaScript (async/await, exponential backoff logic)

## Sources Consulted
- MongoDB documentation on `$expr` for comparing two fields in a query filter: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB documentation on `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- Stripe Node.js SDK documentation on idempotency keys: https://docs.stripe.com/api/idempotent_requests
- Stripe Node.js SDK documentation on Charges API: https://docs.stripe.com/api/charges/create

## Issues Found

1. **Incorrect field-to-field comparison in query filter (line 89)**
   - **What was wrong:** The query `attemptCount: { $lt: "$maxAttempts" }` used `"$maxAttempts"` as if it were a field reference, but in a standard MongoDB query filter, the `$lt` operator treats `"$maxAttempts"` as a string literal. This means the comparison would not actually check whether `attemptCount` is less than the document's `maxAttempts` field value.
   - **What was changed:** Replaced with `$expr: { $lt: ["$attemptCount", "$maxAttempts"] }`, which correctly uses the `$expr` operator to compare two document fields within a query filter.
   - **Why:** MongoDB requires `$expr` with aggregation expression syntax to reference and compare two fields from the same document in a query filter. Without `$expr`, `"$maxAttempts"` is just a string.

2. **Stripe idempotency key passed incorrectly (lines 115-119)**
   - **What was wrong:** The `idempotency_key` was passed inside the charge creation parameters (first argument to `stripe.charges.create()`). In the Stripe Node.js SDK, idempotency keys are not charge parameters.
   - **What was changed:** Moved the idempotency key to the request options (second argument) and renamed it from `idempotency_key` to `idempotencyKey` to match the SDK's camelCase convention.
   - **Why:** The Stripe Node.js SDK passes request-level options like idempotency keys as the second argument to API methods, using camelCase property names (e.g., `{ idempotencyKey: '...' }`). Passing it in the first argument would cause Stripe to ignore the idempotency key or return an "invalid parameter" error.

## Review Notes
- The section titled "Exponential Backoff Schedule" uses fixed delays of 1, 3, and 7 days, which is not strictly exponential backoff (that would be powers of 2: 1, 2, 4, 8). The schedule is better described as a progressive/increasing backoff. This is a common and practical pattern for payment retries, so it is not incorrect per se, just slightly imprecise terminology.
- The Stripe Charges API (`stripe.charges.create`) is considered legacy. Stripe recommends using the Payment Intents API (`stripe.paymentIntents.create`) for new integrations. The Charges API still functions, so the code is not broken, but a future update could modernize this.
- The `findOneAndUpdate` return value behavior differs across MongoDB Node.js driver versions. In driver v5+, it returns the document directly; in v4, it returns `{ value: document }`. The code assumes the direct-return behavior (v5+), which is correct for current driver versions.
