# Validation Summary: How to Use Pre-Image and Post-Image in MongoDB Change Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 6.0+ Change Streams
- MongoDB Pre-Image and Post-Image (`changeStreamPreAndPostImages`)
- MongoDB Node.js Driver (`watch()`, `collMod`, `createCollection`)
- JavaScript / Node.js (async iteration, event listeners)

## Sources Consulted
- MongoDB official documentation: Change Streams with Document Pre- and Post-Images (https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images)
- MongoDB official documentation: `collMod` command with `changeStreamPreAndPostImages` (https://www.mongodb.com/docs/manual/reference/command/collMod/#change-streams-with-document-pre--and-post-images)
- MongoDB official documentation: Change Events reference (https://www.mongodb.com/docs/manual/reference/change-events/)
- MongoDB Node.js Driver documentation: `Collection.watch()` options (https://mongodb.github.io/node-mongodb-native/)
- MongoDB official documentation: `config.system.preimages` collection (https://www.mongodb.com/docs/manual/reference/system-collections/#config.system.preimages)

## Issues Found
No technical issues found.

## Review Notes
- The Mermaid diagram labels the pre-image store participant as "Pre-image Store (oplog)" which is a slight simplification. Pre-images are stored in `config.system.preimages`, a separate system collection, not directly in the oplog. The body text correctly identifies the collection, so the diagram label is acceptable as a high-level illustration.
- The diagram also shows the change event returning as a response to the `updateOne` call, when in practice the change event is delivered through a separate change stream cursor. This is a reasonable simplification for a sequence diagram.
- The `computeDiff` function uses `JSON.stringify` for value comparison, which can produce incorrect results when nested objects have different key ordering. This is acceptable for a blog example but would need refinement for production use.
- The retention explanation is simplified to "tied to the oplog window." In practice, MongoDB also supports configuring `expireAfterSeconds` via the `changeStreamOptions` cluster parameter for more granular control. The default behavior described is correct.
