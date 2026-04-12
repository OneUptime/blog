# How to Store Images in MongoDB vs Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Image, Storage, S3, GridFS

Description: Compare storing images directly in MongoDB (as Binary or GridFS) versus object storage like S3, with code examples and performance considerations.

---

## Introduction

Image storage is a common decision point for web applications. MongoDB can store images directly using Binary BSON fields (for small images) or GridFS (for larger files), but object storage like S3 is usually more performant and cost-effective at scale. This guide shows both approaches with working code.

## Approach 1: Binary BSON in MongoDB (Small Images Only)

For thumbnails or small icons under 1MB, you can store images directly as Binary data:

```javascript
const { MongoClient, Binary } = require("mongodb")
const fs = require("fs")

const client = new MongoClient("mongodb://localhost:27017")

async function storeImageInDocument(imagePath, userId) {
  const imageBuffer = fs.readFileSync(imagePath)
  const db = client.db("myapp")

  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        avatar: new Binary(imageBuffer),
        avatarContentType: "image/jpeg",
        avatarUpdatedAt: new Date()
      }
    }
  )
}

async function getAvatarBuffer(userId) {
  const user = await db.collection("users").findOne(
    { _id: userId },
    { projection: { avatar: 1, avatarContentType: 1 } }
  )
  return user ? user.avatar.buffer : null
}
```

## Approach 2: GridFS for Larger Images

```javascript
const { GridFSBucket } = require("mongodb")

const bucket = new GridFSBucket(db, { bucketName: "images" })

async function uploadImage(fileBuffer, filename, metadata) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      metadata: { contentType: "image/jpeg", ...metadata }
    })
    stream.end(fileBuffer)
    stream.on("finish", () => resolve(stream.id))
    stream.on("error", reject)
  })
}

// Serve the image via Express
app.get("/images/:id", async (req, res) => {
  const { ObjectId } = require("mongodb")
  res.set("Content-Type", "image/jpeg")
  bucket.openDownloadStream(new ObjectId(req.params.id)).pipe(res)
})
```

## Approach 3: S3 with MongoDB Metadata (Recommended)

```javascript
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const { ObjectId } = require("mongodb")
const sharp = require("sharp")

const s3 = new S3Client({ region: process.env.AWS_REGION })

async function uploadImage(fileBuffer, filename, userId) {
  // Process and resize image before upload
  const processed = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const thumbnail = await sharp(fileBuffer)
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 70 })
    .toBuffer()

  const key = `images/${userId}/${Date.now()}-${filename}`
  const thumbKey = `thumbnails/${userId}/${Date.now()}-${filename}`

  await Promise.all([
    s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: processed,
      ContentType: "image/jpeg",
      CacheControl: "max-age=31536000"
    })),
    s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: thumbKey,
      Body: thumbnail,
      ContentType: "image/jpeg",
      CacheControl: "max-age=31536000"
    }))
  ])

  // Store references in MongoDB
  await db.collection("images").insertOne({
    userId: new ObjectId(userId),
    s3Key: key,
    thumbnailKey: thumbKey,
    url: `https://${process.env.CDN_DOMAIN}/${key}`,
    thumbnailUrl: `https://${process.env.CDN_DOMAIN}/${thumbKey}`,
    filename,
    createdAt: new Date()
  })

  return { url: `https://${process.env.CDN_DOMAIN}/${key}` }
}
```

## Comparison Summary

```text
Method              | Max Size | Cost    | CDN | Query Metadata
--------------------|----------|---------|-----|----------------
BSON Binary         | 16MB     | High    | No  | Yes
GridFS              | Unlimited| High    | No  | Yes (files)
S3 + MongoDB refs   | 5TB      | Low     | Yes | Yes (rich)
```

For user-generated images in production, the S3 with MongoDB metadata pattern is recommended. Images are served directly from S3 via CDN (no API server bandwidth), MongoDB stores rich queryable metadata, and storage costs are minimal. Use BSON Binary only for system-generated icons or thumbnails under 50KB where simplicity outweighs performance.

## Summary

Direct MongoDB storage works for tiny images where convenience matters more than scale. GridFS is viable for moderate image volumes in self-hosted environments. For production applications serving user images, S3 with MongoDB metadata is the clear winner - it offloads bandwidth to CDN, reduces MongoDB storage costs, and enables efficient image processing pipelines before upload.
