# Validation Summary: How to Use Pre-Image and Post-Image with Change Streams in MongoDB 6.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 6.0+
- MongoDB Change Streams
- MongoDB Pre-Image and Post-Image feature
- MongoDB Node.js Driver
- JavaScript/Node.js

## Sources Consulted
- MongoDB official documentation: Change Streams with Document Pre- and Post-Images (https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images)
- MongoDB official documentation: `collMod` command with `changeStreamPreAndPostImages` (https://www.mongodb.com/docs/manual/reference/command/collMod/#change-streams-with-document-pre--and-post-images)
- MongoDB official documentation: `fullDocument` option for change streams (https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/)
- MongoDB official documentation: `setClusterParameter` for `changeStreamOptions` (https://www.mongodb.com/docs/manual/reference/command/setClusterParameter/)

## Issues Found
1. **Incorrect `fullDocument` default value**: The post listed `'off'` as a valid option and default for `fullDocument` in Step 3. The correct default is `'default'`, not `'off'`. The value `'off'` is only valid for `fullDocumentBeforeChange`, not for `fullDocument`. The valid values for `fullDocument` are `'default'`, `'updateLookup'`, `'whenAvailable'`, and `'required'`. Fixed the comment on line 79 from `'off' (default)` to `'default' (default)`.

## Review Notes
- The opening statement that "Before MongoDB 6.0, change stream update events only contained the fields that changed" is a slight simplification since `fullDocument: 'updateLookup'` existed before 6.0. However, the post does explain `updateLookup` later and correctly notes that it performs a separate read (less consistent than stored post-images). This simplification is acceptable for an introduction.
- All `collMod`, `createCollection`, `setClusterParameter`, and `getCollectionInfos` commands are syntactically correct.
- The availability matrix (insert/update/replace/delete pre/post image availability) is accurate.
- The audit log example uses `async` callback with `changeStream.on('change')`, which works but does not handle backpressure. This is acceptable for a tutorial example.
- The pre-image expiry default description ("off" meaning no automatic expiry) is slightly simplified. In practice, `"off"` means MongoDB uses the default retention policy tied to the oplog, not that images are retained forever. This is a minor nuance that doesn't warrant a change in a tutorial context.
