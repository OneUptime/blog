# How to Use GridFS in MongoDB for Large File Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Large File, Operation

Description: Learn how to store, retrieve, and manage large files in MongoDB using GridFS, including streaming uploads, downloads, metadata, and when to use GridFS vs object storage.

---

## What is GridFS

GridFS is a MongoDB specification for storing and retrieving files larger than the 16MB BSON document size limit. It divides files into chunks (default 255KB each) and stores them in two collections:

- `fs.files` - one document per file, containing metadata (filename, size, upload date, content type, custom metadata)
- `fs.chunks` - binary chunks of the file data, each up to 255KB

```mermaid
flowchart TD
    File[Large File: video.mp4, 150MB] --> GridFS
    GridFS --> FD[fs.files - one document with metadata]
    GridFS --> C1[fs.chunks - chunk 0: bytes 0-261119]
    GridFS --> C2[fs.chunks - chunk 1: bytes 261120-522239]
    GridFS --> CN[fs.chunks - chunk N: last bytes]
    FD --> FC[files_id links chunks to file]
    C1 --> FC
    C2 --> FC
```

## When to Use GridFS

Use GridFS when:
- Files exceed 16MB (the BSON document size limit).
- You want to serve portions of a file (range requests/streaming) without loading the entire file.
- You need file metadata stored alongside the binary data.
- You want file storage integrated into your existing MongoDB infrastructure.

Consider object storage (S3, GCS, Azure Blob) instead when:
- You need CDN integration.
- You are storing many large files (>1GB each).
- You need very high throughput for parallel file downloads.

## Setting Up GridFS

GridFS uses existing MongoDB infrastructure. No special setup is needed - the collections are created automatically on first upload.

### Using mongofiles CLI

`mongofiles` is part of the MongoDB Database Tools package.

Upload a file:

```bash
mongofiles \
  --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp \
  --local /path/to/report.pdf \
  put report.pdf
```

Download a file:

```bash
mongofiles \
  --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp \
  get report.pdf
```

List all files:

```bash
mongofiles \
  --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp \
  list
```

Delete a file:

```bash
mongofiles \
  --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp \
  delete report.pdf
```

## Using GridFS in Node.js

```javascript
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");
const path = require("path");

const client = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin");

async function uploadFile(localPath, remoteFilename, metadata = {}) {
  await client.connect();
  const db = client.db("myapp");
  const bucket = new GridFSBucket(db, {
    bucketName: "uploads",    // uses uploads.files and uploads.chunks collections
    chunkSizeBytes: 261120    // 255KB chunks (default)
  });

  const uploadStream = bucket.openUploadStream(remoteFilename, {
    metadata: {
      contentType: "application/pdf",
      uploadedBy: "user-123",
      ...metadata
    }
  });

  return new Promise((resolve, reject) => {
    fs.createReadStream(localPath)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        console.log(`Uploaded: ${remoteFilename}, ID: ${uploadStream.id}`);
        resolve(uploadStream.id);
      });
  });
}

async function downloadFile(fileId, outputPath) {
  const { ObjectId } = require("mongodb");
  const db = client.db("myapp");
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
  const writeStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    downloadStream
      .pipe(writeStream)
      .on("error", reject)
      .on("finish", () => {
        console.log(`Downloaded to: ${outputPath}`);
        resolve();
      });
  });
}

async function downloadByFilename(filename, outputPath) {
  const db = client.db("myapp");
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });

  const downloadStream = bucket.openDownloadStreamByName(filename);
  const writeStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    downloadStream.pipe(writeStream).on("finish", resolve).on("error", reject);
  });
}

async function deleteFile(fileId) {
  const { ObjectId } = require("mongodb");
  const db = client.db("myapp");
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  await bucket.delete(new ObjectId(fileId));
  console.log(`Deleted file: ${fileId}`);
}

async function listFiles(filter = {}) {
  const db = client.db("myapp");
  const bucket = new GridFSBucket(db, { bucketName: "uploads" });
  const files = await bucket.find(filter).toArray();
  return files;
}
```

## Serving Files from an Express API

```javascript
const express = require("express");
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");

const app = express();
const client = new MongoClient(process.env.MONGODB_URI);

app.get("/files/:fileId", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("myapp");
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const fileId = new ObjectId(req.params.fileId);

    // Get file metadata
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = files[0];
    res.setHeader("Content-Type", file.metadata?.contentType || "application/octet-stream");
    res.setHeader("Content-Length", file.length);
    res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on("error", () => res.status(404).end());
    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

## Using GridFS in Python

```python
import gridfs
from pymongo import MongoClient

client = MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin")
db = client["myapp"]
fs = gridfs.GridFS(db, collection="uploads")

# Upload a file
with open("/path/to/report.pdf", "rb") as f:
    file_id = fs.put(f, filename="report.pdf", content_type="application/pdf", uploaded_by="user-123")
    print(f"Uploaded with ID: {file_id}")

# Download a file
grid_out = fs.get(file_id)
with open("/tmp/downloaded_report.pdf", "wb") as f:
    f.write(grid_out.read())

# List files
for grid_file in fs.find():
    print(f"{grid_file.filename} - {grid_file.length} bytes - {grid_file.upload_date}")

# Delete a file
fs.delete(file_id)

# Find by filename
grid_out = fs.find_one({"filename": "report.pdf"})
if grid_out:
    print(grid_out.filename)
```

## Querying File Metadata

The `fs.files` collection can be queried directly:

```javascript
// Find all files uploaded by a specific user
db["uploads.files"].find({ "metadata.uploadedBy": "user-123" })

// Find large files
db["uploads.files"].find({ length: { $gt: 10485760 } })  // > 10MB

// Find files by content type
db["uploads.files"].find({ "metadata.contentType": "application/pdf" })
```

## Creating Indexes

GridFS automatically creates indexes on `fs.files` and `fs.chunks`, but you can add additional indexes for your metadata fields:

```javascript
// Index on custom metadata
db["uploads.files"].createIndex({ "metadata.uploadedBy": 1 })
db["uploads.files"].createIndex({ "metadata.contentType": 1, uploadDate: -1 })
```

## Best Practices

- Use a named bucket (e.g., `{ bucketName: "uploads" }`) instead of the default `fs` to avoid conflicts if you use multiple buckets.
- Always store metadata (content type, uploader, expiry date) in the `metadata` field for easy filtering.
- For large files in a busy application, stream uploads and downloads rather than loading entire files into memory.
- To expire temporary uploads, use a scheduled cleanup job that calls `bucket.delete()` (or `fs.delete()` in Python) for each expired file. Do not use a TTL index on `fs.files`, as it only removes the file document and leaves orphaned chunks in `fs.chunks`.
- For files over 1GB or for CDN delivery, consider object storage (S3, GCS) and store only the URL in MongoDB.

## Summary

GridFS stores large files in MongoDB by splitting them into 255KB chunks across `fs.files` and `fs.chunks` collections. Use the `GridFSBucket` class in Node.js or `gridfs.GridFS` in Python for streaming uploads and downloads. Always stream rather than buffer files in memory. Store rich metadata in the `metadata` field and query `fs.files` directly for file management. For files that need CDN delivery or very high throughput, object storage is a better fit.
