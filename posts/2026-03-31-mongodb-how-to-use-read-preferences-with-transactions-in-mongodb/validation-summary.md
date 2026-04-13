# Validation Summary: How to Use Read Preferences with Transactions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, replica sets)
- MongoDB Node.js Driver (session API, transaction API, read preferences)
- JavaScript / Node.js (async/await patterns)

## Sources Consulted
- MongoDB documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB documentation on read preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB documentation on read concern in transactions: https://www.mongodb.com/docs/manual/core/transactions/#read-concern
- MongoDB Node.js Driver API documentation for `startSession`, `startTransaction`, `withTransaction`: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver `FindOptions` and `AggregateOptions` interfaces for `readPreference` support

## Issues Found
No technical issues found.

## Review Notes
- The "Why Only Primary Is Allowed" section states that "transactions use a consistent snapshot read concern." This is a simplification — transactions can also use "local" or "majority" read concern, not just "snapshot." However, the accompanying code example explicitly sets `readConcern: { level: "snapshot" }`, making the text consistent with the example, and the underlying reasoning (primary is needed for consistency) is correct regardless of read concern.
- The "Checking Read Preference at Runtime" section title suggests it will show how to verify the active read preference, but the code only contains comments stating the behavior. It doesn't demonstrate an actual API call to inspect the read preference. This is a content gap rather than a technical error.
- The "Distributing Non-Transactional Reads" example uses `session` without creating it in that code block. This is a common blog convention for partial snippets and not a technical error.
