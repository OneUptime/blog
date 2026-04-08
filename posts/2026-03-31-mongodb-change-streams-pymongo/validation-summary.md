# Validation Summary: How to Use Change Streams with PyMongo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams)
- Python
- PyMongo (`watch()` API)

## Sources Consulted
- PyMongo `watch()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/

## Issues Found
1. **Filtering example missing `full_document="updateLookup"`**: The pipeline filters for both `"insert"` and `"update"` operations while also matching on `fullDocument.status`. However, update change events do not include `fullDocument` by default — it is `None` unless `full_document="updateLookup"` is specified. This means the filter on `fullDocument.status` would silently skip all update events. Fixed by adding `full_document="updateLookup"` to the `watch()` call in the filtering example.

## Review Notes
- The overview states change streams require "MongoDB 3.6+ with a replica set." Collection-level change streams were introduced in 3.6, but database-level and deployment-level change streams require MongoDB 4.0+. The post demonstrates database-level watching without noting this distinction. This is minor and does not affect correctness of the code examples.
- The resume token serialization example uses `json.dump` with `default=str`. This works for simple resume tokens (which are typically `{"_data": "<hex string>"}`), but for robustness in production, `bson.json_util` would be more appropriate. This is a best-practice consideration, not an error.
