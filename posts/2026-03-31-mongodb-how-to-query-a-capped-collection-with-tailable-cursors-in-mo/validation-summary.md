# Validation Summary: How to Query a Capped Collection with Tailable Cursors in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors)
- MongoDB Shell (mongo/mongosh)
- MongoDB Node.js Driver
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB Manual: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: Tailable Cursors — https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB Manual: cursor.addOption() — https://www.mongodb.com/docs/manual/reference/method/cursor.addOption/
- MongoDB Manual: DBQuery.Option — https://www.mongodb.com/docs/manual/reference/method/cursor.addOption/#flags
- MongoDB Node.js Driver: Find Options — https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read/cursor/
- PyMongo Documentation: CursorType — https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html

## Issues Found
1. **Shell example used non-existent `cursor.isAlive()` method**: The original mongo shell example called `cursor.isAlive()` in the while-loop condition. This method does not exist on the mongo shell or mongosh cursor object — `alive` is a PyMongo driver property, not a shell method. The loop logic `while (cursor.hasNext() || cursor.isAlive())` would throw a runtime error. Fixed by replacing with `while (cursor.hasNext())`, which is the correct pattern for tailable cursors with `awaitData` — `hasNext()` blocks briefly waiting for new data rather than returning false immediately.

2. **Shell example only used `tailable` without `awaitData`**: The original shell example only added the `tailable` flag, but the post itself recommends using both `tailable` and `awaitData` together for low-latency, low-CPU operation. Without `awaitData`, a tailable cursor returns immediately when there is no new data, leading to busy-wait loops. Fixed by adding `.addOption(DBQuery.Option.awaitData)` to the cursor.

## Review Notes
- The `addOption(DBQuery.Option.tailable)` syntax is legacy mongo shell syntax. It still works in mongosh for backward compatibility, but newer documentation may use different patterns. This is acceptable for a general tutorial.
- The claim that `awaitData` makes the server "wait up to 1 second" is an approximation. The actual server wait time is implementation-defined and can be configured via `maxAwaitTimeMS`. This is not incorrect enough to warrant a fix but readers should be aware the exact timeout is configurable.
- The Node.js and PyMongo examples are correct and use current, non-deprecated APIs.
- The seed document pattern in the "Real-Time Log Consumer" example is a valid and recommended approach — tailable cursors require at least one document in the collection to function properly.
