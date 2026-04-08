# Validation Summary: How to Open Change Streams on Databases and Deployments in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- MongoDB Aggregation Pipeline (`$match` stage)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Node.js Driver `Db.watch()` API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- PyMongo `MongoClient.watch()` API: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found

1. **Misleading claim about `ns` field scope**: The post stated "The event document is the same as collection-level change events but includes the `ns` field with both `db` and `coll`", implying that the `ns` field is unique to database/deployment-level events. In fact, the `ns` field is present in change events at all levels, including collection-level. Changed to: "The event document has the same structure as collection-level change events, including the `ns` field with both `db` and `coll`."

2. **Incorrect claim about oplog traffic**: The post stated "Database and deployment-level streams generate higher oplog traffic." Change streams read from the oplog — they do not generate oplog writes. The actual concern is that broader-scoped streams match more events, increasing the volume the consumer must handle. Changed to: "Database and deployment-level streams produce a higher volume of events for the consumer. Apply `$match` stages early in the pipeline to filter out unwanted events."

## Review Notes
- The three-level scope table (collection, database, deployment) is accurate and available since MongoDB 4.0+.
- The `fullDocument: "updateLookup"` caveat about potentially returning a newer document is correctly stated.
- The resume token persistence pattern is a sound best practice.
- MongoDB 6.0+ introduced `fullDocument: "whenAvailable"` and `fullDocumentBeforeChange: "whenAvailable"` options which could be mentioned in a future update, but their omission is not an error.
