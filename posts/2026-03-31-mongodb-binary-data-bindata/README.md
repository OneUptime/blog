# How to Work with Binary Data (BinData) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BinData, Binary, BSON

Description: Learn how to store and retrieve binary data in MongoDB using the BinData BSON type for images, files, hashes, and UUIDs with practical driver examples.

---

## What Is BinData

MongoDB's `BinData` BSON type stores arbitrary binary data as a sequence of bytes along with a subtype byte that indicates the purpose of the data. Common subtypes include generic binary (subtype 0), UUID (subtype 4), and MD5 hashes (subtype 5).

## Storing BinData in mongosh

```javascript
// Store a generic binary blob (subtype 0)
const buf = new BinData(0, "aGVsbG8gd29ybGQ="); // base64-encoded "hello world"
db.files.insertOne({ name: "hello.txt", data: buf });

// Retrieve and inspect
const doc = db.files.findOne({ name: "hello.txt" });
print(doc.data);            // Binary(Buffer.from("aGVsbG8gd29ybGQ=", "base64"), 0)
print(doc.data.base64());  // "aGVsbG8gd29ybGQ="
```

## Storing Binary Data in Node.js

```javascript
const { Binary } = require("mongodb");

// From a Buffer
const imageBuffer = require("fs").readFileSync("./logo.png");
await collection.insertOne({
  filename: "logo.png",
  contentType: "image/png",
  data: new Binary(imageBuffer)
});

// Retrieve and write back to disk
const doc = await collection.findOne({ filename: "logo.png" });
require("fs").writeFileSync("./output.png", doc.data.buffer);
```

## Storing Binary Data in Python

```python
from bson.binary import Binary

# Direct BinData for small files (< 16 MB BSON limit)
with open("logo.png", "rb") as f:
    image_bytes = f.read()

collection.insert_one({
    "filename": "logo.png",
    "contentType": "image/png",
    "data": Binary(image_bytes)
})

# Retrieve
doc = collection.find_one({"filename": "logo.png"})
with open("output.png", "wb") as f:
    f.write(doc["data"])
```

## BinData Subtypes

| Subtype | Constant | Use Case |
|---------|----------|----------|
| 0 | Generic | Arbitrary binary data |
| 3 | UUID (old) | Legacy UUID format |
| 4 | UUID | RFC 4122 UUID |
| 5 | MD5 | MD5 hash digest |
| 6 | Encrypted | CSFLE encrypted values |

```javascript
// Storing an MD5 hash
const { createHash } = require("crypto");
const { Binary } = require("mongodb");

const hash = createHash("md5").update("file content").digest();
await collection.updateOne(
  { filename: "doc.pdf" },
  { $set: { md5: new Binary(hash, 5) } }
);
```

## Querying Binary Fields

Binary fields support equality matching but not partial matching. Use them for exact lookups:

```javascript
const hashValue = new BinData(5, "rL0Y20zC+Fzt72VPzMSk2A==");
db.files.find({ md5: hashValue });
```

## Large Files and GridFS

For files larger than 16 MB (the BSON document limit), use GridFS which splits files into 255 KB chunks:

```javascript
const { GridFSBucket } = require("mongodb");
const bucket = new GridFSBucket(db);

const uploadStream = bucket.openUploadStream("large-video.mp4");
fs.createReadStream("large-video.mp4").pipe(uploadStream);
```

## Summary

MongoDB's `BinData` type stores arbitrary bytes alongside a subtype marker for semantic clarity. Use it for small binary payloads such as thumbnails, hashes, and UUIDs. For files exceeding the 16 MB document limit, switch to GridFS. Always use the appropriate subtype to communicate intent and enable correct UUID handling across drivers.
