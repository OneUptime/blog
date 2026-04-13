# How to Build a File Upload Service with MongoDB Metadata and S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, S3, Upload, API, File Management

Description: Build a complete file upload service using Express, Multer, S3, and MongoDB to handle uploads, downloads, access control, and metadata management.

---

## Introduction

A file upload service needs to handle multipart uploads, store binary data durably, track metadata for querying, and control access. This guide builds a full-featured service using Express, Multer, AWS S3 for storage, and MongoDB for metadata.

## Project Setup

```bash
npm install express multer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  mongodb uuid dotenv
```

## MongoDB Schema

```javascript
// models/file.js
const fileSchema = {
  // Stored in MongoDB
  _id: "ObjectId",
  filename: "string",      // Original filename
  displayName: "string",   // User-provided name
  s3Key: "string",         // S3 object key
  s3Bucket: "string",
  contentType: "string",
  size: "number",          // bytes
  uploadedBy: "ObjectId",  // user reference
  projectId: "ObjectId",   // optional grouping
  tags: "string[]",
  isPublic: "boolean",
  downloadCount: "number",
  createdAt: "Date",
  expiresAt: "Date"        // optional TTL
}
```

## Upload Endpoint

```javascript
const express = require("express")
const multer = require("multer")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const { MongoClient, ObjectId } = require("mongodb")
const { v4: uuidv4 } = require("uuid")
const path = require("path")

async function main() {
  const app = express()
  const s3 = new S3Client({ region: process.env.AWS_REGION })
  const mongo = new MongoClient(process.env.MONGODB_URI)
  await mongo.connect()
  const db = mongo.db("fileservice")

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "application/pdf", "text/csv"]
      cb(null, allowed.includes(file.mimetype))
    }
  })

  app.post("/upload", upload.single("file"), async (req, res) => {
    try {
      const fileId = uuidv4()
      const ext = path.extname(req.file.originalname)
      const s3Key = `files/${req.user.id}/${fileId}${ext}`

      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      }))

      const result = await db.collection("files").insertOne({
        filename: req.file.originalname,
        displayName: req.body.displayName || req.file.originalname,
        s3Key,
        s3Bucket: process.env.S3_BUCKET,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: new ObjectId(req.user.id),
        tags: req.body.tags ? req.body.tags.split(",").map(t => t.trim()) : [],
        isPublic: req.body.isPublic === "true",
        downloadCount: 0,
        createdAt: new Date()
      })

      res.status(201).json({ fileId: result.insertedId })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ... additional routes (see sections below) ...

  app.listen(3000)
}
main()
```

## Download with Pre-Signed URLs

```javascript
const { GetObjectCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")

app.get("/files/:id/download", async (req, res) => {
  const file = await db.collection("files").findOne({
    _id: new ObjectId(req.params.id)
  })

  if (!file) return res.status(404).json({ error: "Not found" })

  if (!file.isPublic && file.uploadedBy.toString() !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  await db.collection("files").updateOne(
    { _id: file._id },
    { $inc: { downloadCount: 1 } }
  )

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: file.s3Bucket,
      Key: file.s3Key,
      ResponseContentDisposition: `attachment; filename="${file.filename}"`
    }),
    { expiresIn: 300 }
  )

  res.json({ url, expiresIn: 300 })
})
```

## File Listing and Search

```javascript
app.get("/files", async (req, res) => {
  const { tag, page = 1, limit = 20 } = req.query

  const query = { uploadedBy: new ObjectId(req.user.id) }
  if (tag) query.tags = tag

  const files = await db.collection("files")
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .project({ s3Key: 0, s3Bucket: 0 })
    .toArray()

  res.json({ files, page: parseInt(page) })
})
```

## Summary

A production file upload service combines S3 for binary storage with MongoDB for metadata, access control, and query capabilities. Keep the S3 key out of public API responses and generate time-limited pre-signed URLs for downloads. Track download counts in MongoDB for analytics, use Multer's `fileFilter` to validate content types before accepting uploads, and consider adding an `expiresAt` field for temporary file scenarios.
