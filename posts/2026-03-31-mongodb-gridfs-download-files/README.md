# How to Download Files from GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Node.js

Description: Learn how to download files from MongoDB GridFS by file ID or filename using mongofiles, the Node.js driver, and PyMongo with streaming and in-memory examples.

---

Once files are stored in GridFS, you retrieve them by opening a download stream from the bucket. MongoDB reassembles the chunks in order and streams the data back to your application. You can download by file ID, by filename, or by the most recently uploaded version of a file.

## Downloading with mongofiles (CLI)

```bash
# Download by filename to current directory
mongofiles -d mydb get report.pdf

# Download and save to a specific path
mongofiles -d mydb --local /tmp/downloaded.pdf get_id 'ObjectId("64abc123def456789abcdef0")'
```

## Downloading by File ID (Node.js)

```javascript
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");
const fs = require("fs");

async function downloadById(fileId, outputPath) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
  const writeStream = fs.createWriteStream(outputPath);

  downloadStream.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => {
      console.log(`Downloaded to ${outputPath}`);
      client.close();
      resolve();
    });
    downloadStream.on("error", reject);
  });
}

downloadById("64abc123def456789abcdef0", "./output.pdf");
```

## Downloading by Filename (Node.js)

```javascript
async function downloadByName(filename, outputPath) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  // Downloads the most recently uploaded file with this name
  const downloadStream = bucket.openDownloadStreamByName(filename);
  const writeStream = fs.createWriteStream(outputPath);

  downloadStream.pipe(writeStream);

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    downloadStream.on("error", reject);
  });

  client.close();
}

downloadByName("report.pdf", "./report-copy.pdf");
```

## Downloading a Specific Revision

When multiple files share the same filename, use the `revision` option:

```javascript
// revision: -1 = most recent (default), 0 = oldest, 1 = second oldest
const downloadStream = bucket.openDownloadStreamByName("report.pdf", {
  revision: -1
});
```

## Downloading to a Buffer (Node.js)

For serving files via HTTP without writing to disk:

```javascript
async function downloadToBuffer(fileId) {
  const bucket = new GridFSBucket(db);
  const chunks = [];

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

  return new Promise((resolve, reject) => {
    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
    downloadStream.on("error", reject);
  });
}

// Use in an Express handler
app.get("/files/:id", async (req, res) => {
  const buffer = await downloadToBuffer(req.params.id);
  res.set("Content-Type", "application/pdf");
  res.send(buffer);
});
```

## Downloading with Python (PyMongo)

```python
from pymongo import MongoClient
from bson import ObjectId
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]
fs = gridfs.GridFS(db)

# Download by ID
grid_out = fs.get(ObjectId("64abc123def456789abcdef0"))
with open("./output.pdf", "wb") as f:
    f.write(grid_out.read())

print(f"Downloaded: {grid_out.filename}, size: {grid_out.length} bytes")
client.close()
```

## Handling Errors

Common errors when downloading from GridFS:

```javascript
downloadStream.on("error", (err) => {
  if (err.code === "ENOENT") {
    console.error("File not found in GridFS");
  } else {
    console.error("Download error:", err.message);
  }
});
```

## Summary

GridFS downloads use `openDownloadStream` (by ID) or `openDownloadStreamByName` (by filename) to reassemble and stream file chunks back to your application. Pipe the stream to a file, buffer it for HTTP responses, or use the `mongofiles` CLI for quick one-off retrievals. Handle `FileNotFound` errors explicitly to give users clear feedback when a requested file is missing.
