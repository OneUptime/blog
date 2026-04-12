# Validation Summary: How to Use the readPreference Options in MongoDB Connection Strings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB replica sets and read preference
- MongoDB Node.js driver
- PyMongo (Python MongoDB driver)
- MongoDB Java driver
- MongoDB connection string URI options
- Causal consistency sessions

## Sources Consulted
- MongoDB official documentation: Read Preference (https://www.mongodb.com/docs/manual/core/read-preference/)
- MongoDB official documentation: Connection String URI Format (https://www.mongodb.com/docs/manual/reference/connection-string/)
- MongoDB Node.js driver API: MongoClient, Collection, FindCursor (https://www.mongodb.com/docs/drivers/node/current/)
- PyMongo documentation: MongoClient, ReadPreference (https://pymongo.readthedocs.io/en/stable/)
- MongoDB Java driver documentation: MongoClientSettings, ReadPreference (https://www.mongodb.com/docs/drivers/java/sync/current/)
- MongoDB official documentation: Causal Consistency and Read/Write Concerns (https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/)

## Issues Found
1. **Node.js per-operation read preference override used invalid cursor method**: The original code chained `.readPreference('secondary')` on the `FindCursor` returned by `.find()`. The `FindCursor` class in the MongoDB Node.js driver does not have a `.readPreference()` method in any version (v3.x had `.setReadPreference()` on cursors, and v4+ removed cursor-level read preference methods entirely). Fixed by passing `readPreference` as an option to `db.collection()`, which accepts it via `CollectionOptions`. Changed from `.find(...).readPreference('secondary').toArray()` to `.collection('events', { readPreference: 'secondary' }).find(...).toArray()`.

## Review Notes
- The "When to Use Each Mode" section lists "financial writes" under the `primary` mode. Since `readPreference` only affects read operations (writes always go to the primary regardless), this phrasing could be misleading. It would be clearer to say "financial transactions requiring read-your-writes consistency" instead of "financial writes." This is a clarity issue, not a technical error, so it was left unchanged.
- The PyMongo example uses `readPreference="secondaryPreferred"` as a camelCase keyword argument to `MongoClient`. This works because PyMongo accepts MongoDB URI option names as keyword arguments, but the more Pythonic style would be `read_preference=ReadPreference.SECONDARY_PREFERRED`. Both forms are valid.
- All five read preference modes are correctly listed and described.
- The causal consistency session example is correct and demonstrates the proper pattern for read-your-writes guarantees.
- The read preference tags syntax in both the connection string and Node.js driver code is correct.
