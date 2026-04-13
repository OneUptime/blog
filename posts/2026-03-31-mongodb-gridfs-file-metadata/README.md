# How to Store File Metadata Alongside GridFS References in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Schema Design, Metadata

Description: Learn how to store rich file metadata alongside GridFS references in MongoDB, enabling efficient queries without loading binary file data from the grid.

---

GridFS stores files split across two collections: `fs.files` (metadata) and `fs.chunks` (binary data). While GridFS supports basic metadata through its built-in `metadata` field, a common and powerful pattern is to maintain a separate application-level document that references the GridFS file ID and stores rich, queryable metadata. This keeps binary data isolated and metadata fast to query.

## Understanding GridFS Storage

When you upload a file with GridFS, MongoDB creates a document in `fs.files`:

```javascript
{
  _id: ObjectId("6601a2b3..."),
  length: 2048576,
  chunkSize: 261120,
  uploadDate: ISODate("2026-03-31T09:00:00Z"),
  filename: "report-q1-2026.pdf",
  metadata: { contentType: "application/pdf", uploadedBy: "user123" }
}
```

The `metadata` field is flexible, but embedding all application context here conflates file storage with application logic.

## The Separate Metadata Document Pattern

Create a dedicated collection that holds all application metadata and a reference to the GridFS file:

```javascript
// files collection
{
  _id: ObjectId("app001"),
  gridfsId: ObjectId("6601a2b3..."),  // references fs.files._id
  filename: "report-q1-2026.pdf",
  displayName: "Q1 2026 Financial Report",
  contentType: "application/pdf",
  sizeBytes: 2048576,
  uploadedBy: ObjectId("user123"),
  organizationId: ObjectId("org456"),
  tags: ["finance", "quarterly", "2026"],
  status: "active",
  version: 1,
  createdAt: ISODate("2026-03-31T09:00:00Z"),
  updatedAt: ISODate("2026-03-31T09:00:00Z")
}
```

## Uploading and Linking Files

Use the Node.js MongoDB driver to upload to GridFS and then create the metadata document:

```javascript
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb')

async function uploadFile(db, fileBuffer, fileInfo) {
  const bucket = new GridFSBucket(db, { bucketName: 'fs' })

  const gridfsId = new ObjectId()
  const uploadStream = bucket.openUploadStreamWithId(
    gridfsId,
    fileInfo.filename,
    { metadata: { contentType: fileInfo.contentType } }
  )

  await new Promise((resolve, reject) => {
    uploadStream.end(fileBuffer)
    uploadStream.on('finish', resolve)
    uploadStream.on('error', reject)
  })

  // Create application metadata document
  const result = await db.collection('files').insertOne({
    gridfsId: gridfsId,
    filename: fileInfo.filename,
    displayName: fileInfo.displayName,
    contentType: fileInfo.contentType,
    sizeBytes: fileBuffer.length,
    uploadedBy: fileInfo.userId,
    organizationId: fileInfo.orgId,
    tags: fileInfo.tags || [],
    status: 'active',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return result.insertedId
}
```

## Querying Metadata Without Loading Binary Data

The key advantage is fast metadata queries that never touch `fs.chunks`:

```javascript
// Find all PDF files for an organization
db.files.find({
  organizationId: ObjectId("org456"),
  contentType: "application/pdf",
  status: "active"
}).sort({ createdAt: -1 })

// Filter by multiple tags
db.files.find({
  tags: { $all: ["finance", "2026"] }
})
```

Add indexes to support these queries:

```javascript
db.files.createIndex({ organizationId: 1, status: 1, createdAt: -1 })
db.files.createIndex({ tags: 1 })
db.files.createIndex({ uploadedBy: 1 })
```

## Downloading Files Using the Reference

When a user requests a file, look up the `gridfsId` and stream from GridFS:

```javascript
async function downloadFile(db, res, fileId) {
  const fileDoc = await db.collection('files').findOne({
    _id: new ObjectId(fileId),
    status: 'active'
  })

  if (!fileDoc) {
    return res.status(404).send('File not found')
  }

  const bucket = new GridFSBucket(db, { bucketName: 'fs' })
  res.setHeader('Content-Type', fileDoc.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.filename}"`)

  bucket.openDownloadStream(fileDoc.gridfsId).pipe(res)
}
```

## Handling Soft Deletes and Versioning

Mark files as deleted in the metadata document without immediately removing GridFS data:

```javascript
// Soft delete
db.files.updateOne(
  { _id: fileId },
  { $set: { status: 'deleted', deletedAt: new Date() } }
)

// Later, a cleanup job removes orphaned GridFS files
db.files.aggregate([
  { $match: { status: 'deleted', deletedAt: { $lt: cutoffDate } } },
  { $project: { gridfsId: 1 } }
])
```

## Summary

Storing file metadata in a separate application collection linked to GridFS by `gridfsId` enables rich, indexed queries on file attributes without loading binary chunks. This pattern keeps binary storage concerns separate from application logic, supports soft deletes and versioning cleanly, and allows you to add complex metadata schemas without modifying GridFS internals.
