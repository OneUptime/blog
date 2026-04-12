# What Is GridFS in MongoDB and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Binary Data, Large File

Description: GridFS is a MongoDB specification for storing and retrieving large files by splitting them into chunks and storing each chunk as a separate document.

---

## Overview

MongoDB documents are limited to 16 MB. GridFS is the solution for storing files larger than this limit. It works by dividing a file into smaller pieces (chunks, default 255 KB each) and storing each chunk as a document in a `fs.chunks` collection, with file metadata in a separate `fs.files` collection. Drivers handle the chunking and reassembly transparently.

## When to Use GridFS

GridFS is appropriate when:
- Files exceed 16 MB
- You want to store file metadata alongside the binary data in MongoDB
- You need to access portions of large files without loading the entire file into memory
- You are already using MongoDB and want to avoid adding a separate file storage system

GridFS is less appropriate when:
- Files are small (under 16 MB) - storing them as binary fields in a regular document is simpler
- You need the highest throughput for serving files (a dedicated object store like S3 is faster)
- You need atomic updates to file contents

## GridFS Collections

GridFS uses two collections under a configurable bucket name (default: `fs`):

- `fs.files` - One document per file, containing metadata: filename, length, uploadDate, chunkSize, and any custom metadata you add in the `metadata` field
- `fs.chunks` - One document per chunk, containing the file's `_id`, the chunk sequence number (`n`), and the binary data (`data`)

## Uploading a File

```javascript
// Node.js - upload a file to GridFS
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("myapp");
const bucket = new GridFSBucket(db, { bucketName: "uploads" });

const uploadStream = bucket.openUploadStream("photo.jpg", {
  metadata: { userId: "user_123", tags: ["profile"] }
});
fs.createReadStream("/path/to/photo.jpg").pipe(uploadStream);

uploadStream.on("finish", () => {
  console.log("Uploaded with id:", uploadStream.id);
});
```

```python
# PyMongo - upload a file
import gridfs
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]
fs_bucket = gridfs.GridIn(
    db["fs"],
    filename="photo.jpg",
    content_type="image/jpeg"
)
with open("/path/to/photo.jpg", "rb") as f:
    fs_bucket.write(f.read())
fs_bucket.close()
```

## Downloading a File

```javascript
// Node.js - download by filename
const downloadStream = bucket.openDownloadStreamByName("photo.jpg");
downloadStream.pipe(fs.createWriteStream("/tmp/downloaded.jpg"));
```

## Querying File Metadata

```javascript
// List files in the bucket
const files = await bucket.find({ "metadata.userId": "user_123" }).toArray();
files.forEach(f => console.log(f.filename, f.length, f.uploadDate));
```

## Deleting a File

```javascript
// Delete by ObjectId
await bucket.delete(fileId);
```

## GridFS vs. S3

| Feature | GridFS | S3 |
|---|---|---|
| Query file metadata | Yes (MongoDB queries) | Limited (tags, metadata) |
| Atomic transactions | Via MongoDB transactions | No |
| CDN integration | Requires proxy | Native |
| Throughput | Moderate | High |
| Cost | MongoDB storage cost | Low per-GB cost |

## Summary

GridFS is MongoDB's built-in solution for storing files larger than 16 MB by splitting them into chunks. It is best suited for applications already using MongoDB that need to store user-uploaded content with queryable metadata. For pure file serving at scale, dedicated object stores are typically more efficient.
