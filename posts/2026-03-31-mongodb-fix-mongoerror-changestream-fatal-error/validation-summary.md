# Validation Summary: How to Fix MongoError: ChangeStream Fatal Error in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (Change Streams, Oplog, Replica Sets)
- Node.js MongoDB Driver (event-based and async iterator APIs)
- MongoDB 6.0+ Change Stream Pre/Post Images

## Sources Consulted
- [MongoDB Change Streams Documentation](https://www.mongodb.com/docs/manual/changestreams/)
- [db.collection.watch() Reference](https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/)
- [MongoDB Change Streams Specification (GitHub)](https://github.com/mongodb/specifications/blob/master/source/change-streams/change-streams.md)
- [MongoDB Error Codes (error_codes.yml)](https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml)
- [cursor.allowPartialResults() Documentation](https://www.mongodb.com/docs/manual/reference/method/cursor.allowpartialresults/)
- [MongoDB Change Events - update Event](https://www.mongodb.com/docs/manual/reference/change-events/update/)
- [MongoDB Community Forum: null fullDocument with updateLookup](https://www.mongodb.com/community/forums/t/how-can-change-stream-update-operations-come-with-null-fulldocument-when-changestreamfulldocumentoption-updatelookup-was-used/2537)

## Issues Found

1. **Incorrect mention of `allowPartialResults` for change streams (Section 3)**
   - **What was wrong:** The text said "Use `startAfter` with `allowPartialResults` or implement reconnect" for handling replica set elections. `allowPartialResults` is a `find()` cursor option for sharded collections and is not a valid change stream option.
   - **What was changed:** Replaced with "Implement a reconnect loop to handle this" which accurately describes the code example that follows.
   - **Why:** `allowPartialResults` has no effect on change streams and would mislead readers.

2. **Incorrect claim that `updateLookup` throws on deleted documents (Section 4)**
   - **What was wrong:** The text stated `fullDocument: 'updateLookup'` "may throw if the document no longer exists." Per the MongoDB specification and driver behavior, `updateLookup` returns `null` for the `fullDocument` field when the document has been deleted — it does not throw an error.
   - **What was changed:** Corrected the explanation to state that `updateLookup` returns `null`, and that `whenAvailable` uses stored post-images instead of a separate lookup for more reliable results.
   - **Why:** The original claim could cause readers to add unnecessary error handling for a condition that doesn't throw.

3. **Missing prerequisite for `whenAvailable` option (Section 4)**
   - **What was wrong:** The code suggested using `fullDocument: 'whenAvailable'` without mentioning that it requires `changeStreamPreAndPostImages` to be enabled on the collection.
   - **What was changed:** Added explanation that pre/post images must be enabled, and included the `collMod` command as a comment in the code example.
   - **Why:** Without enabling this collection-level setting, `whenAvailable` silently returns `null` for post-images, which would confuse readers.

## Review Notes
- The code examples use fixed delays (1000ms, 2000ms) for reconnection, but the summary mentions "exponential backoff." This is a minor inconsistency but not a technical error — the code is still functional.
- The `startAfter` option is mentioned in passing but never used in code. `startAfter` is specifically needed to resume after `invalidate` events (e.g., collection drops), while `resumeAfter` cannot. This distinction could be valuable for readers but is not strictly an error in the current text.
- Error code 280 (`ChangeStreamFatalError`) is confirmed correct. Code 286 (`ChangeStreamHistoryLost`) is another related non-resumable error that could also be checked in the catch block for completeness.
