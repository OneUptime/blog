# Validation Summary: How to Build a Live Activity Feed with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (change streams, TTL indexes, compound indexes, aggregation pipeline)
- Mongoose ODM for Node.js
- Socket.io (for real-time WebSocket delivery)
- Node.js

## Sources Consulted
- Mongoose SchemaType options documentation: https://mongoosejs.com/docs/schematypes.html#schematype-options
- Mongoose schema index definitions: https://mongoosejs.com/docs/guide.html#indexes
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference (fullDocument option): https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Compound Indexes documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/

## Issues Found

1. **`index: -1` on `createdAt` field (line 37)**: The inline `index` option on a Mongoose SchemaType accepts `Boolean | String | Object`, not a number. Passing `-1` is non-standard and undocumented. Additionally, a standalone index on `createdAt` is redundant since the schema already defines a TTL index on `{ createdAt: 1 }` and a compound index on `{ recipientIds: 1, createdAt: -1 }`. Removed `index: -1` from the inline field definition.

2. **`fullDocument: 'updateLookup'` on insert-only change stream (line 109)**: The `fullDocument: 'updateLookup'` option tells MongoDB to look up and return the full document for update change events. For insert operations (the only `operationType` matched by this pipeline), the full document is always included in the change event by default. The option has no effect and is misleading to readers. Removed the unnecessary option.

## Review Notes
- The fan-out-on-write pattern stores all recipient IDs in a single document's `recipientIds` array. This works well for moderate follower counts but could hit the 16 MB BSON document size limit for users with very large follower lists (millions). The post could mention this limitation and suggest hybrid fan-out strategies for high-follower accounts in a future revision.
- The aggregation pipeline example (shell syntax with `db.activities.aggregate`) is in mongosh format while the rest of the post uses Mongoose. This is a stylistic inconsistency but not an error.
- Change streams require a MongoDB replica set or sharded cluster; they do not work with standalone `mongod` instances. This prerequisite is not mentioned but would be helpful for readers new to change streams.
