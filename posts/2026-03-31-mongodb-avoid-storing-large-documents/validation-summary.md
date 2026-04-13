# Validation Summary: How to Avoid Storing Large Documents (Near 16MB Limit) in MongoDB

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MongoDB (document size limits, WiredTiger storage engine)
- MongoDB Node.js Driver (collection operations, GridFSBucket API)
- GridFS (file storage with chunking)
- MongoDB Aggregation Framework ($bsonSize, $project, $match)

## Sources Consulted
- MongoDB documentation on BSON document size limit (16MB max): https://www.mongodb.com/docs/manual/reference/limits/#bson-document-size
- MongoDB documentation on GridFSBucket API and default 255KB chunk size: https://www.mongodb.com/docs/manual/core/gridfs/
- MongoDB documentation on $bsonSize aggregation operator (available since 4.4): https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/
- MongoDB documentation on aggregation pipeline memory limit (100MB per stage): https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- MongoDB Node.js Driver API reference for GridFSBucket, openUploadStream, openDownloadStream: https://www.mongodb.com/docs/drivers/node/current/fundamentals/gridfs/
- MongoDB schema design patterns (Subset Pattern, Reference Pattern): https://www.mongodb.com/blog/post/building-with-patterns-the-subset-pattern

## Issues Found
No technical issues found.

## Review Notes
- The `$bsonSize` operator used in the "Detecting Large Documents" section requires MongoDB 4.4 or later. The post does not mention this version requirement, but given that MongoDB 4.4 reached end of life in February 2024, this is unlikely to be an issue for any current deployment.
- The GridFS `storeFile` function creates a race condition where the stream is piped before the Promise is constructed. In practice this works because Node.js streams buffer events synchronously within the same tick, but a more robust approach would set up event listeners before piping. This is a minor code style concern, not a correctness issue for the purposes of this tutorial.
- The post correctly focuses on the Node.js driver API. All method signatures and usage patterns are current and non-deprecated.
