# How to Use MongoDB GridFS vs S3 for File Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, S3, Storage, Comparison

Description: Compare MongoDB GridFS and Amazon S3 for file storage, with code examples for both approaches and guidance on when to choose each solution.

---

## Introduction

When you need to store files alongside MongoDB data, two common options emerge: MongoDB's built-in GridFS and Amazon S3 (or S3-compatible storage). Each has clear strengths and trade-offs. This guide compares them with working code examples to help you make the right choice.

## GridFS: Storing Files in MongoDB

GridFS splits files into chunks and stores them across two collections: `fs.files` (metadata) and `fs.chunks` (binary data).

```javascript
const { MongoClient, GridFSBucket } = require("mongodb")
const fs = require("fs")

const mongo = new MongoClient(process.env.MONGODB_URI)
await mongo.connect()
const db = mongo.db("myapp")
const bucket = new GridFSBucket(db, { bucketName: "uploads" })

// Upload a file to GridFS
async function uploadToGridFS(localPath, filename, metadata = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata })
    const readStream = fs.createReadStream(localPath)

    readStream.pipe(uploadStream)
    uploadStream.on("finish", () => resolve(uploadStream.id))
    uploadStream.on("error", reject)
  })
}

// Download from GridFS
async function downloadFromGridFS(fileId, outputPath) {
  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId)
    const writeStream = fs.createWriteStream(outputPath)

    downloadStream.pipe(writeStream)
    writeStream.on("finish", resolve)
    downloadStream.on("error", reject)
  })
}
```

## S3: Storing Files in Object Storage

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")
const fs = require("fs")

const s3 = new S3Client({ region: "us-east-1" })
const BUCKET = process.env.S3_BUCKET

async function uploadToS3(localPath, key, contentType) {
  const fileBuffer = fs.readFileSync(localPath)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  }))
  return key
}

async function getS3DownloadUrl(key) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  )
}
```

## Feature Comparison

```text
Feature              | GridFS                   | S3
---------------------|--------------------------|---------------------------
Max file size        | Unlimited (chunked)      | 5TB per object
Cost                 | MongoDB storage costs    | ~$0.023/GB/month
Performance          | Limited by MongoDB I/O   | Dedicated, high throughput
CDN integration      | Manual (stream via API)  | Native CloudFront support
Backup               | Part of mongodump        | S3 versioning + replication
Access control       | MongoDB RBAC             | IAM policies + bucket ACLs
Query on metadata    | Rich MongoDB queries      | Tags + object metadata (limited)
Self-hosted option   | Yes (runs in MongoDB)    | MinIO or Ceph
Pre-signed URLs      | No                       | Yes (native)
```

## When to Choose GridFS

```text
- You want files and metadata in a single backup target
- Files are small to medium (under 100MB)
- You need to query file metadata with complex MongoDB filters
- You are self-hosted and want to avoid external dependencies
- The file count is modest (under 1 million files)
```

## When to Choose S3

```text
- Files are large (100MB+) or frequently accessed
- You need CDN delivery or pre-signed URL access
- Cost and storage scalability are critical
- You require versioning and cross-region replication
- File count exceeds millions
```

## Summary

GridFS is convenient when your files are tightly coupled to MongoDB data and you prefer a single system to manage. S3 is the better choice for production systems at scale due to lower storage cost, higher throughput, CDN integration, and pre-signed URL support. For most production applications beyond a prototype, S3 with MongoDB metadata references offers better performance and lower operational overhead than GridFS.
