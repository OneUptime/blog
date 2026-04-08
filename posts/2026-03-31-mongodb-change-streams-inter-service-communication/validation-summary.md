# Validation Summary: How to Use MongoDB Change Streams for Inter-Service Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver
- PyMongo (Python MongoDB Driver)
- Kafka (confluent-kafka-python producer API)
- JavaScript / Node.js
- Python

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver Change Streams API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- PyMongo Collection.watch() documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/

## Issues Found
- **Python `json.dumps` with BSON types**: The `fullDocument` field returned by PyMongo contains BSON types such as `ObjectId` and `datetime` that are not natively JSON-serializable. Calling `json.dumps(event)` without a fallback serializer would raise a `TypeError` at runtime. Fixed by adding `default=str` to the `json.dumps()` call, which converts non-serializable types to their string representation.

## Review Notes
- The JavaScript examples correctly use the MongoDB Node.js driver API (`collection.watch()`, `resumeAfter`, `fullDocument: 'updateLookup'`).
- The resume token pattern correctly uses `event._id` as the token, which is the documented resume token field.
- The `fullDocument: 'updateLookup'` option is specified on insert-only streams in some examples where it is technically unnecessary (inserts always include `fullDocument`), but this is not incorrect — it simply has no effect for inserts and ensures updates are handled if the pipeline is later broadened.
- The post correctly notes that change streams require a replica set (they are built on the oplog).
- The post appropriately caveats the shared-database pattern and recommends a message broker for strict service isolation.
