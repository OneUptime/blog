# How to Delete Files from GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Node.js

Description: Learn how to delete files from MongoDB GridFS by file ID using mongofiles, the Node.js driver, and PyMongo, including how to clean up orphaned chunks.

---

Deleting a file from GridFS removes both the metadata document from `fs.files` and all associated chunks from `fs.chunks`. It is important to use the GridFS API for deletion rather than removing documents directly, as doing so risks leaving orphaned chunks behind.

## Deleting with mongofiles (CLI)

```bash
# Delete by filename
mongofiles -d mydb delete report.pdf

# Delete by ObjectId
mongofiles -d mydb delete_id <ObjectId>
```

Output:

```text
2026-03-31T10:00:00.000+0000    successfully deleted all instances of 'report.pdf' from GridFS
```

## Deleting by File ID (Node.js)

```javascript
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");

async function deleteFile(fileId) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  await bucket.delete(new ObjectId(fileId));
  console.log(`Deleted file: ${fileId}`);

  await client.close();
}

deleteFile("64abc123def456789abcdef0");
```

`bucket.delete()` removes the `fs.files` document and all matching `fs.chunks` documents in two separate operations (not atomically).

## Deleting All Files by Filename (Node.js)

GridFS allows multiple files to share the same filename (revisions). To delete all versions:

```javascript
async function deleteAllVersions(filename) {
  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  // Find all file IDs with the given filename
  const cursor = db.collection("fs.files").find({ filename });

  for await (const file of cursor) {
    await bucket.delete(file._id);
    console.log(`Deleted version: ${file._id}`);
  }
}

deleteAllVersions("report.pdf");
```

## Deleting with Python (PyMongo)

```python
from pymongo import MongoClient
from bson import ObjectId
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]
fs = gridfs.GridFS(db)

file_id = ObjectId("64abc123def456789abcdef0")
fs.delete(file_id)
print(f"Deleted file: {file_id}")

client.close()
```

## Cleaning Up Orphaned Chunks

If files were deleted directly from `fs.files` without using the GridFS API, orphaned chunks may remain. Find and remove them:

```javascript
// Find files_ids that still have chunks but no matching fs.files entry
const chunkFileIds = await db
  .collection("fs.chunks")
  .distinct("files_id");

const existingFileIds = (
  await db
    .collection("fs.files")
    .find({ _id: { $in: chunkFileIds } }, { projection: { _id: 1 } })
    .toArray()
).map((f) => f._id.toString());

const orphaned = chunkFileIds.filter(
  (id) => !existingFileIds.includes(id.toString())
);

for (const id of orphaned) {
  await db.collection("fs.chunks").deleteMany({ files_id: id });
  console.log(`Cleaned orphaned chunks for: ${id}`);
}
```

## Bulk Deletion by Metadata

Delete all files uploaded before a certain date:

```javascript
async function deleteOldFiles(olderThanDate) {
  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const cursor = db
    .collection("fs.files")
    .find({ uploadDate: { $lt: olderThanDate } });

  for await (const file of cursor) {
    await bucket.delete(file._id);
    console.log(`Deleted old file: ${file.filename}`);
  }
}

// Delete files older than 90 days
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
deleteOldFiles(cutoff);
```

## Dropping an Entire GridFS Bucket

To remove all files and chunks in a bucket:

```javascript
const bucket = new GridFSBucket(db, { bucketName: "uploads" });
await bucket.drop();
```

## Summary

Use `bucket.delete(fileId)` in Node.js or `fs.delete(file_id)` in PyMongo to cleanly remove both the file metadata and its chunks from GridFS. Never delete directly from `fs.files` or `fs.chunks` collections, as this leaves orphaned data. For bulk cleanup, query `fs.files` to get file IDs, then iterate and delete each one.
