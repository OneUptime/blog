# How to Query GridFS Files by Metadata in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, Metadata, Query

Description: Learn how to query MongoDB GridFS files by custom metadata fields using the Node.js driver and PyMongo, with index strategies for efficient metadata searches.

---

GridFS stores file metadata in the `fs.files` collection. Beyond the built-in fields like `filename`, `length`, and `uploadDate`, you can attach arbitrary key-value pairs in the `metadata` subdocument. Querying by these custom metadata fields follows standard MongoDB query syntax.

## Setting Metadata on Upload (Node.js)

```javascript
const { MongoClient, GridFSBucket } = require("mongodb");

const bucket = new GridFSBucket(db, { bucketName: "uploads" });

const uploadStream = bucket.openUploadStream("contract_2026.pdf", {
  metadata: {
    owner: "user_42",
    department: "legal",
    projectId: "proj_8891",
    tags: ["contract", "2026", "signed"],
    expiresAt: new Date("2027-03-31")
  }
});

fs.createReadStream("./contract_2026.pdf").pipe(uploadStream);
```

## Querying by Single Metadata Field

```javascript
async function findByOwner(owner) {
  const cursor = bucket.find({ "metadata.owner": owner });
  return cursor.sort({ uploadDate: -1 }).toArray();
}

const userFiles = await findByOwner("user_42");
```

## Querying by Multiple Metadata Fields

```javascript
async function findByDepartmentAndYear(department, year) {
  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year + 1}-01-01`);

  const cursor = bucket.find({
    "metadata.department": department,
    uploadDate: { $gte: startOfYear, $lt: endOfYear }
  });

  return cursor.toArray();
}

const legalDocs2026 = await findByDepartmentAndYear("legal", 2026);
```

## Querying by Tags in Metadata Array

```javascript
async function findByTag(tag) {
  const cursor = bucket.find({
    "metadata.tags": tag  // matches if array contains this tag
  });
  return cursor.toArray();
}

const contractFiles = await findByTag("contract");
```

## Querying by Expiry Date

```javascript
async function findExpiringFiles(withinDays) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  const cursor = bucket.find({
    "metadata.expiresAt": {
      $lte: futureDate,
      $gte: new Date()
    }
  });

  return cursor.toArray();
}

const soonExpiring = await findExpiringFiles(30);
```

## Querying with Python (PyMongo)

```python
from pymongo import MongoClient
import gridfs

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]
fs = gridfs.GridFS(db, collection="uploads")

# Find by owner
owner_files = list(fs.find({"metadata.owner": "user_42"}))

# Find by department and date range
from datetime import datetime
legal_docs = list(fs.find({
    "metadata.department": "legal",
    "uploadDate": {
        "$gte": datetime(2026, 1, 1),
        "$lt": datetime(2027, 1, 1)
    }
}))

for f in legal_docs:
    print(f.filename, f.upload_date)
```

## Creating Indexes for Metadata Queries

Without indexes, metadata queries perform full collection scans on `fs.files`. Create indexes for frequently queried fields:

```javascript
// Index on a single metadata field
await db.collection("uploads.files").createIndex({ "metadata.owner": 1 });

// Compound index for department + upload date queries
await db.collection("uploads.files").createIndex({
  "metadata.department": 1,
  uploadDate: -1
});

// Index for tag array queries
await db.collection("uploads.files").createIndex({ "metadata.tags": 1 });
```

## Aggregating File Statistics by Metadata

```javascript
// Total storage used per department
db.collection("uploads.files").aggregate([
  {
    $group: {
      _id: "$metadata.department",
      totalBytes: { $sum: "$length" },
      fileCount: { $sum: 1 }
    }
  },
  { $sort: { totalBytes: -1 } }
]);
```

## Summary

GridFS metadata queries use the `metadata.*` dot notation on the `fs.files` collection via `bucket.find()` or `fs.find()` in PyMongo. Store structured data like owner, department, tags, and expiry dates in the `metadata` field at upload time. Always index the metadata fields you query most often to keep lookups efficient, especially as your file count grows.
