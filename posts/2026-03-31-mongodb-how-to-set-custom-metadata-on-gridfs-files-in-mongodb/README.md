# How to Set Custom Metadata on GridFS Files in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, Metadata, File Storage, Querying

Description: Store and query custom metadata on GridFS files to enable rich file management features like tagging, access control, and content organization.

---

## GridFS File Metadata

Each file stored in GridFS has a corresponding document in `fs.files` (or `{bucketName}.files`) containing:

```json
{
  "_id": ObjectId("..."),
  "filename": "report.pdf",
  "length": 2097152,
  "chunkSize": 261120,
  "uploadDate": ISODate("2024-01-15"),
  "contentType": "application/pdf",
  "metadata": {}
}
```

The `metadata` field is a flexible object where you store any custom data.

## Step 1: Upload with Custom Metadata

```javascript
const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');

async function uploadWithMetadata(localPath, filename) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const bucket = new GridFSBucket(client.db('myapp'), { bucketName: 'documents' });

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: 'application/pdf',
    metadata: {
      uploadedBy: 'user-123',
      organizationId: 'org-456',
      tags: ['financial', 'quarterly', '2024'],
      year: 2024,
      quarter: 'Q1',
      status: 'pending_review',
      accessLevel: 'internal',
      expiresAt: new Date('2025-01-15')
    }
  });

  const readStream = fs.createReadStream(localPath);

  await new Promise((resolve, reject) => {
    readStream.pipe(uploadStream)
      .on('finish', resolve)
      .on('error', reject);
  });

  console.log(`Uploaded: ${uploadStream.id}`);
  await client.close();
  return uploadStream.id;
}
```

## Step 2: Create Indexes on Metadata Fields

Index the metadata fields you frequently query:

```javascript
// In mongosh - create indexes on the files collection
db.documents.files.createIndex({ "metadata.uploadedBy": 1, uploadDate: -1 })
db.documents.files.createIndex({ "metadata.organizationId": 1, "metadata.status": 1 })
db.documents.files.createIndex({ "metadata.tags": 1 })
db.documents.files.createIndex({ "metadata.expiresAt": 1 }, { expireAfterSeconds: 0 })
```

The TTL index on `metadata.expiresAt` automatically deletes expired files from `files` but does NOT delete the corresponding chunks. Handle chunk cleanup separately (covered below).

## Step 3: Query Files by Metadata

```javascript
async function findFilesByMetadata() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const bucket = new GridFSBucket(client.db('myapp'), { bucketName: 'documents' });

  // Find all Q1 2024 financial reports
  const files = await bucket.find({
    "metadata.tags": "financial",
    "metadata.year": 2024,
    "metadata.quarter": "Q1"
  }).sort({ uploadDate: -1 }).toArray();

  files.forEach(f => {
    console.log(`${f.filename} (${f.metadata.status}) - ${f.uploadDate}`);
  });

  await client.close();
  return files;
}

// Find pending review documents for a specific org
async function getPendingReview(organizationId) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const bucket = new GridFSBucket(client.db('myapp'), { bucketName: 'documents' });

  return bucket.find({
    "metadata.organizationId": organizationId,
    "metadata.status": "pending_review"
  }).sort({ uploadDate: 1 }).toArray();
}
```

## Step 4: Update Metadata on Existing Files

GridFS files' metadata can be updated directly on the `files` collection:

```javascript
const { MongoClient, ObjectId } = require('mongodb');

async function updateFileStatus(fileId, newStatus) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');

  // Update metadata directly on the files collection
  await db.collection('documents.files').updateOne(
    { _id: new ObjectId(fileId) },
    {
      $set: {
        "metadata.status": newStatus,
        "metadata.reviewedAt": new Date(),
        "metadata.reviewedBy": "admin-user"
      }
    }
  );

  await client.close();
}

// Add a tag to a file
async function addTag(fileId, tag) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  await client.db('myapp').collection('documents.files').updateOne(
    { _id: new ObjectId(fileId) },
    { $addToSet: { "metadata.tags": tag } }
  );

  await client.close();
}
```

## Step 5: Aggregate Over File Metadata

Use aggregation to analyze file distributions:

```javascript
// Count files by status per organization
db['documents.files'].aggregate([
  {
    $group: {
      _id: {
        org: "$metadata.organizationId",
        status: "$metadata.status"
      },
      count: { $sum: 1 },
      totalSize: { $sum: "$length" }
    }
  },
  {
    $group: {
      _id: "$_id.org",
      statuses: {
        $push: {
          status: "$_id.status",
          count: "$count",
          sizeGB: { $divide: ["$totalSize", 1073741824] }
        }
      }
    }
  }
])
```

## Step 6: Expire and Clean Up Files

When using TTL indexes on metadata, delete the corresponding chunks too:

```javascript
async function deleteExpiredFiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db, { bucketName: 'documents' });

  const now = new Date();
  const expiredFiles = await db.collection('documents.files').find({
    "metadata.expiresAt": { $lte: now }
  }).toArray();

  for (const file of expiredFiles) {
    await bucket.delete(file._id);
    console.log(`Deleted expired file: ${file.filename}`);
  }

  await client.close();
}
```

## Step 7: Build a File Manager with Metadata Search

```javascript
// Full text search on filename + tag filter
async function searchFiles({ query, tags, uploadedBy, status, limit = 20, skip = 0 }) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const filter = {};

  if (query) filter.filename = { $regex: query, $options: 'i' };
  if (tags?.length) filter["metadata.tags"] = { $all: tags };
  if (uploadedBy) filter["metadata.uploadedBy"] = uploadedBy;
  if (status) filter["metadata.status"] = status;

  const files = await db.collection('documents.files')
    .find(filter)
    .sort({ uploadDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await db.collection('documents.files').countDocuments(filter);

  await client.close();
  return { files, total };
}
```

## Summary

GridFS files store custom metadata in the `metadata` field of each file document in the `{bucket}.files` collection. Set metadata at upload time via `openUploadStream` options, create MongoDB indexes on frequently queried metadata fields for performance, update metadata with standard `updateOne` operations on the files collection, and query files using `bucket.find()` with any MongoDB filter expression. Use aggregation pipelines for analytics over the file collection just as you would any MongoDB collection.
