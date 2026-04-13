# How to Fix MongoError: Document Exceeds Maximum Size (16MB) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document Size, GridFS, Schema Design, Error

Description: Learn why MongoDB documents are limited to 16MB, how to detect oversized documents, and how to fix the error using GridFS or schema redesign.

---

## Understanding the Limit

MongoDB enforces a hard 16MB BSON document size limit. This covers the entire document including nested subdocuments and arrays. Attempting to insert or update a document that exceeds this limit throws:

```text
MongoError: document is larger than the maximum size 16777216
```

## Why the Limit Exists

The 16MB cap prevents individual documents from consuming excessive memory during cursor traversal and network transfer. It also encourages proper data modelling - if a document grows to 16MB, the schema usually needs to be redesigned.

## Detecting Document Sizes

Before hitting the limit, measure document sizes in `mongosh`:

```javascript
// Check the size of a specific document
const doc = db.myCollection.findOne({ _id: ObjectId("...") });
Object.bsonsize(doc); // returns bytes

// Find documents larger than 10MB
db.myCollection.find().forEach(doc => {
  const size = Object.bsonsize(doc);
  if (size > 10 * 1024 * 1024) {
    print(`${doc._id}: ${(size / 1024 / 1024).toFixed(2)} MB`);
  }
});
```

## Fix 1: Store Large Binary Data in GridFS

GridFS splits large files into 255KB chunks stored in `fs.files` and `fs.chunks` collections. Use it for images, videos, PDFs, and any binary content.

In Node.js:

```javascript
import { MongoClient, GridFSBucket } from 'mongodb';
import fs from 'fs';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('mydb');
const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

// Upload a file
const uploadStream = bucket.openUploadStream('large-report.pdf', {
  metadata: { userId: '123', contentType: 'application/pdf' }
});
fs.createReadStream('./large-report.pdf').pipe(uploadStream);

uploadStream.on('finish', () => {
  console.log('Uploaded with id:', uploadStream.id);
});

// Download a file
const downloadStream = bucket.openDownloadStreamByName('large-report.pdf');
downloadStream.pipe(fs.createWriteStream('./downloaded.pdf'));
```

Store only the GridFS file ID in your document:

```javascript
await db.collection('reports').insertOne({
  title: 'Annual Report 2025',
  fileId: uploadStream.id,
  createdAt: new Date()
});
```

## Fix 2: Redesign the Schema - Extract Embedded Arrays

Arrays that grow unboundedly (e.g., appending log lines or events to a document) will eventually exceed 16MB. Extract them into a separate collection:

```javascript
// BAD - appending events to a document
await db.collection('sessions').updateOne(
  { _id: sessionId },
  { $push: { events: newEvent } } // array grows forever
);

// GOOD - events in their own collection
await db.collection('session_events').insertOne({
  sessionId: sessionId,
  ...newEvent,
  timestamp: new Date()
});
```

## Fix 3: Split Large Documents

If a document holds large text blobs or base64-encoded content, store the content separately:

```javascript
// Store the large content chunk
const result = await db.collection('content_chunks').insertOne({
  content: largeTextContent
});

// Reference it from the main document
await db.collection('articles').insertOne({
  title: 'Long Article',
  contentRef: result.insertedId
});
```

## Summary

The MongoDB 16MB document limit encourages good schema design. For binary or file content, use GridFS. For growing arrays, move items to a separate collection and reference by ID. For oversized embedded documents, normalize the schema. Measuring document sizes proactively prevents hitting this limit in production.
