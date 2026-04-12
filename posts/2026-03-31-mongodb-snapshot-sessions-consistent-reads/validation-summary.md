# Validation Summary: How to Use Snapshot Sessions for Consistent Reads in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+ (snapshot read concern for sessions outside transactions)
- MongoDB Node.js Driver (`mongodb` npm package)
- WiredTiger storage engine (mentioned in limitations)

## Sources Consulted
- MongoDB documentation on read concern "snapshot": https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/
- MongoDB documentation on ClientSession: https://www.mongodb.com/docs/manual/reference/method/Session/
- MongoDB Node.js Driver API documentation for `startSession()`: https://mongodb.github.io/node-mongodb-native/
- MongoDB documentation on read concern levels (majority, linearizable, snapshot): https://www.mongodb.com/docs/manual/reference/read-concern/

## Issues Found

### Issue 1: Session not created with `snapshot: true`
- **What was wrong:** All code examples created sessions with `client.startSession()` without the `snapshot: true` option. For snapshot reads outside of multi-document transactions (the MongoDB 5.0+ feature this post is about), the session must be started with `client.startSession({ snapshot: true })`.
- **What was changed:** Updated all `startSession()` calls to `startSession({ snapshot: true })`.
- **Why:** Without `snapshot: true`, the session does not enable snapshot reads; operations would use the default read concern, not a shared snapshot.

### Issue 2: readConcern passed at operation level instead of session level
- **What was wrong:** Each read operation was passed `readConcern: { level: 'snapshot' }` in its options. When using session-level snapshot reads (MongoDB 5.0+), the snapshot is configured on the session itself via the `snapshot: true` flag, not on individual operations.
- **What was changed:** Removed `readConcern: { level: 'snapshot' }` from all individual operation options. Operations now only receive `{ session }`. Updated the section description and summary text accordingly.
- **Why:** Passing readConcern at the operation level is how snapshot reads work inside transactions, not for session-level snapshot reads. The session's `snapshot: true` flag handles read concern automatically.

### Issue 3: Concurrent operations on same session via Promise.all
- **What was wrong:** The report generation example used `Promise.all` to run three read operations concurrently on the same `ClientSession`. MongoDB `ClientSession` instances are not safe for concurrent use — running multiple operations simultaneously on the same session causes undefined behavior.
- **What was changed:** Replaced the `Promise.all` pattern with sequential `await` calls for each operation.
- **Why:** The MongoDB Node.js driver documentation explicitly states that a `ClientSession` is not safe for concurrent operations. Sequential execution is required to ensure correct behavior.

### Issue 4: Incorrect guidance in section text and summary
- **What was wrong:** The section text said "You can apply snapshot read concern at the operation level within a session" and the summary instructed readers to "Pass `{ session, readConcern: { level: 'snapshot' } }` to each read operation."
- **What was changed:** Updated the section text to explain that snapshot is configured at the session level. Updated the summary to instruct readers to start the session with `{ snapshot: true }` and pass only `{ session }` to operations.
- **Why:** The original text gave technically incorrect guidance about how to use the feature.

## Review Notes
- The overview, use cases, requirements/limitations, and read concern comparison sections were all accurate and did not need changes.
- The claim that MongoDB 5.0 introduced this feature is correct (release notes confirm snapshot reads outside transactions were added in 5.0).
- The WiredTiger storage pressure warning is a valid and useful caveat.
- The `linearizable` read concern description is slightly simplified ("waits for majority acknowledgment") but acceptable for a high-level comparison.
