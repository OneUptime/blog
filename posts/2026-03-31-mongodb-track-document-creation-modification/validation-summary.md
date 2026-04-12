# Validation Summary: How to Track Document Creation and Modification History in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (6.0+)
- MongoDB Node.js Driver
- Change Streams with pre/post images
- JSON Schema validation (`$jsonSchema`)
- MongoDB update operators (`$set`, `$inc`)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB `fullDocumentBeforeChange` option: https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Change Stream Pre- and Post-Images: https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images
- MongoDB Node.js Driver `findOneAndUpdate` API: https://mongodb.github.io/node-mongodb-native/
- MongoDB `$jsonSchema` validator: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB `collMod` command for `changeStreamPreAndPostImages`: https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found

1. **`$inc` overwrite bug in `updateOne` method** — The `updateOne` wrapper spread the caller's `update` object but then overwrote `$inc` with `{ __v: 1 }`, silently discarding any `$inc` fields from the caller (e.g., `$inc: { viewCount: 1 }` would be lost). Fixed by merging: `$inc: { ...update.$inc, __v: 1 }`.

2. **Missing `changeStreamPreAndPostImages` enablement** — The change stream code used `fullDocumentBeforeChange: "whenAvailable"` but never showed the prerequisite step of enabling pre/post images on the collection. Without this, `fullDocumentBeforeChange` would always be `null`. Added a `collMod` command and explanatory note before the change stream code, along with a note that this requires MongoDB 6.0+.

## Review Notes
- The `diffVersions` function uses `JSON.stringify` for deep comparison, which is order-sensitive for object keys. This works for MongoDB documents since field order is preserved, but readers should be aware it won't detect semantically-equal objects with different key orderings.
- The `stream.on("change", async (event) => { ... })` pattern does not handle backpressure or errors. In a production system, error handling and a `for await...of` loop would be more robust, but this is acceptable for a tutorial.
- The `returnDocument: "before"` option in `updateOne` is the default for `findOneAndUpdate`, so it could be omitted, but being explicit is fine for clarity.
