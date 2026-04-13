# Validation Summary: How to Build an Email Queue with MongoDB and Nodemailer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver v4+)
- Nodemailer
- Node.js

## Sources Consulted
- MongoDB Node.js Driver documentation for `findOneAndUpdate`: https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOneAndUpdate/
- MongoDB `findOneAndUpdate` options (`returnDocument`, `sort`): https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB TTL Indexes with `partialFilterExpression`: https://www.mongodb.com/docs/manual/core/index-ttl/
- Nodemailer `createTransport` and `sendMail` API: https://nodemailer.com/about/
- SMTP port 587 and STARTTLS behavior: https://nodemailer.com/smtp/

## Issues Found
1. **Bug in stale lock recovery (claimNextEmail function):** The status filter was `{ $in: ["pending"] }`, but the `$or` clause that checks for stale locks (`lockedAt: { $lt: lockExpiry }`) is only relevant when a job has `status: "processing"`. When a job is claimed, its status is set to `"processing"` and `lockedAt` is set to the current time. If a worker crashes, the job remains in `"processing"` status with a stale lock. However, because the filter only matched `"pending"`, no worker could ever reclaim a stale `"processing"` job — making the stale lock detection dead code. **Fix:** Changed the status filter to `{ $in: ["pending", "processing"] }` so that jobs with stale locks in `"processing"` status can be reclaimed by other workers.

## Review Notes
- The `attempts: { $lt: 3 }` check in the claim filter is hardcoded rather than referencing the document's `maxAttempts` field. This works correctly as long as `maxAttempts` is always 3 (as set in `enqueueEmail`), but using `$expr: { $lt: ["$attempts", "$maxAttempts"] }` would be more robust if `maxAttempts` were ever varied per email. This is a design consideration, not a bug.
- The `$in: ["pending", "processing"]` with only two values could equivalently be written as `{ $or: [...] }` on status, but `$in` is idiomatic and efficient.
- The retry backoff formula `60000 * job.attempts` produces linear backoff (1 min, 2 min, 3 min). Exponential backoff is more common in production systems but the linear approach shown is not incorrect.
- Port 587 with `secure: false` is correct — Nodemailer will upgrade to TLS via STARTTLS automatically on this port.
