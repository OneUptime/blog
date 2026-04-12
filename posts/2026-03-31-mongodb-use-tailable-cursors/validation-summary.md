# Validation Summary: How to Use Tailable Cursors in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver
- PyMongo (Python MongoDB Driver)

## Sources Consulted
- MongoDB official documentation on tailable cursors: https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB official documentation on capped collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Node.js Driver API documentation for `FindOptions` (`tailable`, `awaitData`, `maxAwaitTimeMS`): https://mongodb.github.io/node-mongodb-native/
- PyMongo documentation for `CursorType`: https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html

## Issues Found
1. **Node.js example had `awaitData: false`**: The `find()` call explicitly set `awaitData: false`, which causes the server to return empty batches immediately when no new documents are available. Combined with the `for await...of` loop, this creates a busy-waiting pattern that wastes CPU. This also directly contradicts the post's own summary, which recommends using the `awaitData` option to avoid busy-waiting. **Fix**: Changed `awaitData: false` to `awaitData: true` so the server waits briefly before returning an empty response, allowing efficient long-polling behavior.

## Review Notes
- The Python example uses `CursorType.TAILABLE` rather than `CursorType.TAILABLE_AWAIT`. This is technically correct and the `time.sleep(0.1)` compensates for the lack of server-side awaiting. For production use, `CursorType.TAILABLE_AWAIT` would be more efficient, but the current code works and the summary already mentions the `awaitData` recommendation, so no change was made.
- The cursor invalidation section correctly identifies the two main causes. The re-creation pattern using `$gt` on `_id` is a standard approach for resuming after invalidation.
- The shell example uses `sleep(100)` (milliseconds) which is appropriate for mongosh's `sleep()` function.
