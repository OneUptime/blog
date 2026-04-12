# Validation Summary: How to Build a Webhook Delivery System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands and Node.js driver)
- Node.js (async/await, fetch API)
- Webhook delivery patterns (job queue, retry, exponential backoff)
- MongoDB TTL indexes

## Sources Consulted
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/
- MongoDB `$inc` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `insertOne` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- Node.js `fetch` API documentation: https://nodejs.org/docs/latest/api/globals.html#fetch

## Issues Found
1. **Missing `targetUrl` in delivery job schema**: The `deliver` function referenced `job.targetUrl` to make the HTTP request, but the `webhook_deliveries` document schema did not include a `targetUrl` field — only `subscriptionId`. This meant the claimed job object would have `targetUrl` as `undefined`, causing the `fetch` call to fail. **Fix**: Added `targetUrl` to the delivery job document to denormalize the subscription URL into the delivery record, which is the standard pattern for job queue designs where you want each job to be self-contained.

## Review Notes
- The TTL index on `createdAt` will expire all documents after 30 days, not just "delivered and failed" ones as the text implies. In practice this is fine since all 5 retry attempts complete well within 30 days (max backoff is ~16 minutes), but it is a minor imprecision in the explanation.
- The `returnDocument: "after"` option is correctly used for the Node.js driver (as opposed to `returnNewDocument: true` in the MongoDB shell).
- The exponential backoff calculation and comment are correct: 60s, 120s, 240s, 480s, 960s for attempts 1-5.
- The `$inc` for attempts in `scheduleRetry` correctly works alongside the local `attempts` variable used for backoff calculation.
