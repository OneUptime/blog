# How to Upload Files to GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Node.js

Description: Learn how to upload files to MongoDB GridFS using mongosh, the Node.js driver, and Python PyMongo, with practical examples for common use cases.

---

GridFS is MongoDB's specification for storing and retrieving files larger than the 16 MB BSON document size limit. Files are split into chunks and stored across two collections: `fs.files` (metadata) and `fs.chunks` (binary data). Uploading a file to GridFS is straightforward with any MongoDB driver.

## Uploading with mongofiles (CLI)

The quickest way to upload a file is with the `mongofiles` command-line tool:

```bash
mongofiles -d mydb put report.pdf
```

Output:

```text
2026-03-31T10:00:00.000+0000    connected to: mongodb://localhost/
2026-03-31T10:00:00.000+0000    added file: report.pdf
```

List uploaded files:

```bash
mongofiles -d mydb list
```

## Uploading with the Node.js Driver

```javascript
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");

async function uploadFile(filePath, fileName) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const uploadStream = bucket.openUploadStream(fileName, {
    chunkSizeBytes: 255 * 1024, // 255 KB chunks
    metadata: { uploadedBy: "admin", contentType: "application/pdf" }
  });

  fs.createReadStream(filePath).pipe(uploadStream);

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      console.log(`Uploaded with ID: ${uploadStream.id}`);
      resolve(uploadStream.id);
      client.close();
    });
    uploadStream.on("error", reject);
  });
}

uploadFile("./report.pdf", "report.pdf");
```

## Uploading with Python (PyMongo)

```python
from pymongo import MongoClient
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]
fs = gridfs.GridFS(db)

with open("./report.pdf", "rb") as f:
    file_id = fs.put(
        f,
        filename="report.pdf",
        contentType="application/pdf",
        uploadedBy="admin"
    )

print(f"Uploaded with ID: {file_id}")
client.close()
```

## Uploading from a Buffer (Node.js)

When you have file data already in memory (e.g., from an HTTP request):

```javascript
async function uploadBuffer(buffer, fileName, contentType) {
  const bucket = new GridFSBucket(db);
  const uploadStream = bucket.openUploadStream(fileName, {
    metadata: { contentType }
  });

  uploadStream.end(buffer);

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
  });
}
```

## Verifying the Upload

After uploading, verify the file metadata in `fs.files`:

```javascript
db.fs.files.findOne({ filename: "report.pdf" });
```

```text
{
  _id: ObjectId("..."),
  filename: "report.pdf",
  length: 204800,
  chunkSize: 261120,
  uploadDate: ISODate("2026-03-31T10:00:00Z"),
  metadata: { uploadedBy: "admin", contentType: "application/pdf" }
}
```

Count the chunks stored in `fs.chunks`:

```javascript
db.fs.chunks.countDocuments({ files_id: ObjectId("...") });
```

## Customizing the Bucket Name

By default, GridFS uses `fs` as the bucket name. Use a custom name to separate different file types:

```javascript
const imageBucket = new GridFSBucket(db, { bucketName: "images" });
const videoBucket = new GridFSBucket(db, { bucketName: "videos" });
```

This creates `images.files`, `images.chunks`, `videos.files`, and `videos.chunks` collections.

## Summary

Uploading files to GridFS requires creating a `GridFSBucket`, opening an upload stream with a filename and optional metadata, and piping or writing your file data to that stream. The `mongofiles` CLI tool offers the fastest path for one-off uploads, while the Node.js and Python drivers enable programmatic integration with custom metadata and chunk size control.
