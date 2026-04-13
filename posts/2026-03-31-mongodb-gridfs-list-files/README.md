# How to List Files in GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Query

Description: Learn how to list, search, and paginate files stored in MongoDB GridFS using mongofiles, the Node.js driver, PyMongo, and direct collection queries.

---

GridFS stores file metadata in the `fs.files` collection. Listing files means querying this collection, which supports all standard MongoDB query operators, sorting, and pagination. You can filter by filename, upload date, metadata fields, and more.

## Listing Files with mongofiles (CLI)

```bash
# List all files in the default bucket
mongofiles -d mydb list

# Search for files containing a string in the filename
mongofiles -d mydb search report
```

Output:

```text
2026-03-31T10:00:00.000+0000    connected to: mongodb://localhost/
report.pdf      204800
invoice_2026.pdf        102400
```

## Listing All Files (Node.js)

```javascript
const { MongoClient, GridFSBucket } = require("mongodb");

async function listAllFiles() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const cursor = bucket.find({});
  const files = await cursor.toArray();

  for (const file of files) {
    console.log(`${file.filename} - ${file.length} bytes - ${file.uploadDate}`);
  }

  client.close();
}

listAllFiles();
```

## Filtering Files by Name Pattern

```javascript
async function findFilesByPattern(pattern) {
  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const cursor = bucket.find({
    filename: { $regex: pattern, $options: "i" }
  });

  return cursor.toArray();
}

const invoices = await findFilesByPattern("invoice");
```

## Filtering by Upload Date and Size

```javascript
async function findRecentLargeFiles() {
  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const cursor = bucket.find({
    uploadDate: { $gte: oneWeekAgo },
    length: { $gt: 1024 * 1024 }  // larger than 1 MB
  });

  return cursor.sort({ uploadDate: -1 }).toArray();
}
```

## Paginating Results

```javascript
async function listFilesPaginated(page = 1, pageSize = 20) {
  const db = client.db("mydb");
  const bucket = new GridFSBucket(db);

  const skip = (page - 1) * pageSize;

  const [files, total] = await Promise.all([
    bucket
      .find({})
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    db.collection("fs.files").countDocuments()
  ]);

  return {
    files,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}
```

## Listing Files with Python (PyMongo)

```python
from pymongo import MongoClient
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]
fs = gridfs.GridFS(db)

# List all files
for grid_out in fs.find():
    print(f"{grid_out.filename} - {grid_out.length} bytes")

# Filter by filename
for grid_out in fs.find({"filename": {"$regex": "invoice"}}):
    print(grid_out.filename)

client.close()
```

## Querying fs.files Directly

Since `fs.files` is a regular MongoDB collection, you can query it directly for advanced use cases:

```javascript
// Get total storage used per content type
db.fs.files.aggregate([
  {
    $group: {
      _id: "$metadata.contentType",
      totalSize: { $sum: "$length" },
      count: { $sum: 1 }
    }
  },
  { $sort: { totalSize: -1 } }
]);
```

## Listing Files in a Custom Bucket

```javascript
const imageBucket = new GridFSBucket(db, { bucketName: "images" });
const cursor = imageBucket.find({ "metadata.contentType": "image/jpeg" });
const jpegImages = await cursor.toArray();
```

## Summary

Listing GridFS files is a query on the `fs.files` collection. Use `bucket.find()` to search, filter, sort, and paginate file metadata using standard MongoDB query syntax. For simple listings, `mongofiles list` works from the command line. For production applications, query by metadata fields like upload date, content type, or custom properties to efficiently locate stored files.
