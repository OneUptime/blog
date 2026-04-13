# Validation Summary: How to Fix MongoError: Document Exceeds Maximum Size (16MB) in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (BSON document size limit)
- MongoDB GridFS
- MongoDB Node.js Driver (`mongodb` package, `GridFSBucket` API)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB documentation on BSON document size limit: https://www.mongodb.com/docs/manual/reference/limits/#bson-document-size
- MongoDB documentation on GridFS: https://www.mongodb.com/docs/manual/core/gridfs/
- MongoDB Node.js Driver GridFSBucket API: https://mongodb.github.io/node-mongodb-native/6.0/classes/GridFSBucket.html
- mongosh `Object.bsonsize()` reference: https://www.mongodb.com/docs/mongodb-shell/reference/methods/

## Issues Found
1. **Incorrect error message**: The post listed `MongoServerError: Document failed validation` as one of the error messages thrown when exceeding the 16MB limit. This is incorrect — that error is produced by MongoDB's JSON Schema validation feature (`$jsonSchema`), not by the BSON document size limit. The actual error for exceeding the size limit is `MongoError: document is larger than the maximum size 16777216` (which was already the second line). Removed the incorrect first error message.

## Review Notes
- The `Object.bsonsize()` function is correctly used for mongosh. It is also available in the legacy `mongo` shell.
- The GridFS default chunk size of 255KB is correct.
- The post mentions `fs.files` and `fs.chunks` as the default GridFS collection names, then uses `bucketName: 'uploads'` in the code example (which would create `uploads.files` and `uploads.chunks`). This is slightly inconsistent in naming but not technically wrong — the text describes the defaults and the code shows a custom bucket name.
- All Node.js driver API usage (`GridFSBucket`, `openUploadStream`, `openDownloadStreamByName`, `uploadStream.id`, `result.insertedId`) is correct and current.
- The schema redesign patterns (extracting unbounded arrays, splitting large documents with references) are sound and follow MongoDB best practices.
