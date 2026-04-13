# Validation Summary: How to Implement Idempotent Payment Processing with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (unique indexes, `findOneAndUpdate`, `$setOnInsert`, upsert, TTL indexes)
- Node.js (async/await, MongoDB Node.js driver)
- Stripe Node.js SDK (Charges API, idempotency keys)
- JavaScript (Promise.allSettled)

## Sources Consulted
- MongoDB documentation on `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB documentation on `$setOnInsert`: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB documentation on unique indexes: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB documentation on TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB duplicate key error code 11000: https://www.mongodb.com/docs/manual/reference/error-codes/
- Stripe Node.js SDK documentation on idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe Node.js SDK source/docs for request options pattern: https://github.com/stripe/stripe-node

## Issues Found

1. **Schema example status inconsistency**: The example document structure in the "Database Schema" section showed `status: "processing"`, but the `processPayment` function sets `status: "pending"` via `$setOnInsert` when creating a new transaction. Changed the schema example to `status: "pending"` for consistency.

2. **Stripe idempotency key passed incorrectly**: The `idempotency_key` was passed as a property inside the charge creation parameters object. In the Stripe Node.js SDK, the idempotency key must be passed as a request option in a second argument to `create()`, using camelCase (`idempotencyKey`). Changed from `stripe.charges.create({ ..., idempotency_key: key })` to `stripe.charges.create({ ... }, { idempotencyKey: key })`.

## Review Notes
- The Stripe Charges API (`stripe.charges.create`) is a legacy API. Stripe recommends using the PaymentIntents API (`stripe.paymentIntents.create`) for new integrations. The code is functional but uses a deprecated pathway. A future update could migrate the example to PaymentIntents.
- The TTL index on `createdAt` in the `transactions` collection will automatically delete transaction documents after 24 hours. In a production payment system, transaction records are typically retained for auditing, compliance, and dispute resolution. A more robust approach would be to store idempotency keys in a separate collection with a TTL index, keeping transaction records permanently. The MongoDB TTL syntax itself is correct.
- The code has a window where concurrent requests that both see `status: "pending"` could both call the Stripe API. The post correctly mitigates this by passing the idempotency key to Stripe as well (defense in depth), and the summary explicitly mentions this. This is an acceptable pattern.
