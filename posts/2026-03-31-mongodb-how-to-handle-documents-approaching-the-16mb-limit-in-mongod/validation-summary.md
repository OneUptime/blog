# Validation Summary: How to Handle Documents Approaching the 16MB Limit in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (BSON document size limit, schema design patterns)
- mongosh (MongoDB Shell)
- MongoDB Aggregation Framework (`$bsonSize`, `$group`, `$project`)
- MongoDB Update Operators (`$push`, `$each`, `$sort`, `$slice`)
- MongoDB GridFS (GridFSBucket via Node.js driver)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB documentation on BSON document size limit: https://www.mongodb.com/docs/manual/reference/limits/#mongodb-limit-BSON-Document-Size
- MongoDB documentation on `$bsonSize` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bsonSize/
- MongoDB documentation on `$push` with `$each`, `$sort`, `$slice` modifiers: https://www.mongodb.com/docs/manual/reference/operator/update/push/
- MongoDB documentation on GridFS: https://www.mongodb.com/docs/manual/core/gridfs/
- mongosh `bsonsize()` helper documentation: https://www.mongodb.com/docs/mongodb-shell/reference/methods/
- MongoDB schema design patterns (Bucket Pattern, Subset Pattern): https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern

## Issues Found
- **`Object.bsonsize()` replaced with `bsonsize()`**: The shell code used `Object.bsonsize(doc)`, which is the legacy `mongo` shell API. Since the same code block uses template literals in `print()` (a mongosh feature), the function was updated to `bsonsize(doc)`, which is the mongosh global helper. `Object.bsonsize()` still works in mongosh via a compatibility shim, but mixing legacy API with modern syntax is inconsistent.

## Review Notes
- The `$bsonSize` aggregation operator requires MongoDB 4.4+. The post does not mention version requirements. This is acceptable for a general guide but readers on older versions should be aware.
- The section titled "Strategy 3: Extended Reference Pattern" more closely matches what MongoDB's official pattern documentation calls the "Subset Pattern" (keeping only a subset of data embedded, archiving the rest). The "Extended Reference Pattern" in MongoDB's official docs refers to embedding a subset of *fields* from a referenced document to avoid joins. The code and explanation are correct; only the naming differs from official terminology.
- The GridFS example accesses `uploadStream.id` synchronously after piping data. This works because the `id` (an ObjectId) is generated when `openUploadStream()` is called, before any data is written. However, the `updateOne` call could execute before the file upload completes. In production code, you would typically wait for the upload stream's `finish` event before referencing the file. As a conceptual example this is acceptable.
