# How to Store and Query Binary Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Binary Data, BinData, GridFS, BSON

Description: Learn how to store, retrieve, and query binary data in MongoDB using BinData BSON type and GridFS for large files.

---

## Binary Data in MongoDB

MongoDB supports binary data through the BSON `BinData` type. It can store any raw bytes: images, files, cryptographic keys, hashes, or serialized objects.

Two approaches depending on size:
- **BinData** in a document field - for small binaries (up to 16MB document limit)
- **GridFS** - for files larger than 16MB

## BinData Subtypes

BinData has subtypes to indicate the binary content type:

```text
0x00 (0) - Generic binary
0x01 (1) - Function
0x02 (2) - Binary (old, deprecated)
0x03 (3) - UUID (old, deprecated)
0x04 (4) - UUID
0x05 (5) - MD5 hash
0x06 (6) - Encrypted BSON value
0x80 (128) - User-defined
```

## Storing Binary Data in Node.js

```javascript
const { MongoClient, Binary } = require("mongodb")
const fs = require("fs")
const crypto = require("crypto")

const client = new MongoClient("mongodb://localhost:27017")
await client.connect()
const db = client.db("myapp")

// Store a file as BinData
const imageBuffer = fs.readFileSync("./avatar.jpg")
await db.collection("users").updateOne(
  { _id: userId },
  {
    $set: {
      avatar: new Binary(imageBuffer),            // generic binary
      avatarHash: new Binary(
        crypto.createHash("md5").update(imageBuffer).digest(),
        Binary.SUBTYPE_MD5                         // subtype 5 = MD5
      ),
      encryptionKey: new Binary(
        crypto.randomBytes(32),
        Binary.SUBTYPE_USER_DEFINED               // subtype 128
      )
    }
  }
)
```

## Retrieving Binary Data

```javascript
// Retrieve and use the binary data
const user = await db.collection("users").findOne({ _id: userId })

if (user.avatar) {
  const buffer = user.avatar.buffer  // Buffer object
  fs.writeFileSync("./retrieved-avatar.jpg", buffer)
  console.log("Image size:", buffer.length, "bytes")
}

// Convert BinData to base64 for API responses
const base64Image = user.avatar.buffer.toString("base64")
const dataUrl = `data:image/jpeg;base64,${base64Image}`
```

## Storing Binary Data in Python

```python
from pymongo import MongoClient
from bson.binary import Binary
from datetime import datetime
import hashlib

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]

# Store binary data
with open("document.pdf", "rb") as f:
    pdf_bytes = f.read()

doc_hash = hashlib.sha256(pdf_bytes).digest()

db.documents.insert_one({
    "filename": "report.pdf",
    "content": Binary(pdf_bytes),           # generic BinData
    "sha256": Binary(doc_hash, 0),          # subtype 0 = generic binary
    "uploadedAt": datetime.utcnow()
})
```

## Querying by Binary Values

You can query on binary fields for exact matches (useful for hash lookups):

```javascript
const crypto = require("crypto")

// Find a document by its hash (exact binary match)
const fileHash = crypto.createHash("md5").update(fileBuffer).digest()

const existing = await db.collection("uploads").findOne({
  contentHash: new Binary(fileHash, Binary.SUBTYPE_MD5)
})

if (existing) {
  console.log("File already uploaded:", existing._id)
} else {
  // Upload new file
  await db.collection("uploads").insertOne({
    filename: "report.pdf",
    content: new Binary(fileBuffer),
    contentHash: new Binary(fileHash, Binary.SUBTYPE_MD5),
    uploadedAt: new Date()
  })
}
```

## Checking BinData Type in Queries

```javascript
// Find documents that have a binary avatar field
db.users.find({ avatar: { $type: "binData" } })

// Equivalent using BSON type number
db.users.find({ avatar: { $type: 5 } })  // 5 = binData type number

// Find documents where avatar is missing
db.users.find({ avatar: { $exists: false } })
```

## Storing Binary in mongosh

```javascript
// In mongosh, use BinData() constructor
db.keys.insertOne({
  keyId: "key-001",
  keyValue: BinData(0, "SGVsbG8gV29ybGQ=")  // base64 string
})

// Retrieve and inspect
const doc = db.keys.findOne({ keyId: "key-001" })
doc.keyValue  // BinData(0, "SGVsbG8gV29ybGQ=")
```

## GridFS for Large Files

For files larger than 16MB, use GridFS which splits files into 255KB chunks:

```javascript
const { GridFSBucket } = require("mongodb")
const fs = require("fs")

const bucket = new GridFSBucket(db, { bucketName: "uploads" })

// Upload a file to GridFS
async function uploadFile(filePath, filename) {
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { uploadedBy: "user123", contentType: "application/pdf" }
  })

  fs.createReadStream(filePath).pipe(uploadStream)

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => resolve(uploadStream.id))
    uploadStream.on("error", reject)
  })
}

// Download a file from GridFS
async function downloadFile(fileId, outputPath) {
  const downloadStream = bucket.openDownloadStream(fileId)
  const writeStream = fs.createWriteStream(outputPath)
  downloadStream.pipe(writeStream)

  return new Promise((resolve, reject) => {
    writeStream.on("finish", resolve)
    writeStream.on("error", reject)
  })
}

// Usage
const fileId = await uploadFile("./large-report.pdf", "annual-report-2024.pdf")
console.log("Uploaded with GridFS ID:", fileId)
```

## GridFS File Lookup

```javascript
// Find files by name
const files = await bucket.find({ filename: "annual-report-2024.pdf" }).toArray()
console.log("Files found:", files.length)
console.log("File size:", files[0].length, "bytes")
console.log("Chunks:", Math.ceil(files[0].length / files[0].chunkSize))

// Delete a file from GridFS
await bucket.delete(fileId)
```

## Summary

Store small binary data (images, hashes, keys under 16MB) using the BSON `BinData` type with appropriate subtypes. Use exact binary matches in queries for hash-based deduplication. For files larger than 16MB, use GridFS which chunks files and stores metadata separately. Choose BinData for field-level binary storage and GridFS for full file management with streaming upload/download support.
