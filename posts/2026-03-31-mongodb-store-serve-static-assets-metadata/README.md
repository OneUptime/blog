# How to Store and Serve Static Assets Metadata with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Static Asset, CDN, Storage, Node.js

Description: Learn how to use MongoDB to store and query static asset metadata including URLs, dimensions, MIME types, and tags while serving files from S3 or a CDN.

---

## Architecture: MongoDB for Metadata, S3 for Files

Storing binary files directly in MongoDB (via GridFS) works for small-scale needs but is inefficient for large files and high traffic. The preferred pattern is to store files in S3 or similar object storage and use MongoDB to store rich metadata about each asset - this gives you fast, indexed queries over asset properties while serving files from a performant CDN.

```text
Upload Flow:  Client --> API --> S3 (store file) --> MongoDB (store metadata)
Serve Flow:   Client --> MongoDB (query metadata) --> S3/CDN URL (redirect or serve)
```

## Asset Metadata Schema

```javascript
// models/Asset.js
const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  // Storage
  key: { type: String, required: true, unique: true },     // S3 object key
  bucket: { type: String, required: true },
  cdnUrl: { type: String, required: true },                // public CDN URL
  storageProvider: { type: String, enum: ['s3', 'gcs', 'azure'], default: 's3' },

  // File Properties
  originalName: String,
  mimeType: { type: String, required: true, index: true },
  size: { type: Number, required: true },                  // bytes
  checksum: String,                                        // MD5 or SHA-256

  // Image-Specific
  width: Number,
  height: Number,
  format: String,                                          // jpeg, png, webp
  variants: [{
    size: String,                                          // thumb, medium, large
    width: Number,
    height: Number,
    cdnUrl: String,
    key: String
  }],

  // Organization
  folder: { type: String, default: '/', index: true },
  tags: { type: [String], index: true },
  alt: String,
  caption: String,

  // Ownership
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerId: mongoose.Schema.Types.ObjectId,

  // Usage Tracking
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,

  // Timestamps
  uploadedAt: { type: Date, default: Date.now, index: true }
});

// Full-text search on name, tags, alt
AssetSchema.index({ originalName: 'text', tags: 'text', alt: 'text' });

module.exports = mongoose.model('Asset', AssetSchema);
```

## Upload Handler: Store to S3 then MongoDB

```javascript
// routes/upload.js
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const Asset = require('../models/Asset');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET = process.env.S3_BUCKET;
const CDN_BASE = process.env.CDN_BASE_URL;

async function uploadAsset(req, res) {
  const file = req.file;
  const key = `uploads/${uuidv4()}-${file.originalname}`;

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000'
  }));

  let metadata = {
    key,
    bucket: BUCKET,
    cdnUrl: `${CDN_BASE}/${key}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: req.user._id,
    tags: req.body.tags?.split(',').map(t => t.trim()) || []
  };

  // Extract image dimensions
  if (file.mimetype.startsWith('image/')) {
    const info = await sharp(file.buffer).metadata();
    metadata = { ...metadata, width: info.width, height: info.height, format: info.format };
  }

  const asset = await Asset.create(metadata);
  res.status(201).json(asset);
}
```

## Querying Assets

```javascript
// Search assets by type, folder, or tags
async function searchAssets({ mimeType, folder, tags, q, page = 1, limit = 20 }) {
  const filter = {};
  if (mimeType) filter.mimeType = new RegExp(`^${mimeType}`);
  if (folder) filter.folder = folder;
  if (tags?.length) filter.tags = { $all: tags };
  if (q) filter.$text = { $search: q };

  const assets = await Asset.find(filter)
    .sort(q ? { score: { $meta: 'textScore' } } : { uploadedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-__v');

  const total = await Asset.countDocuments(filter);
  return { assets, total };
}

// Get all images in a folder with dimensions
const images = await Asset.find({
  folder: '/hero-images',
  mimeType: /^image\//,
  width: { $gte: 1200 }
}).select('cdnUrl width height alt');
```

## Tracking Asset Usage

When an asset is referenced in content, increment its usage counter:

```javascript
async function recordAssetUsage(assetId) {
  await Asset.findByIdAndUpdate(assetId, {
    $inc: { usageCount: 1 },
    $set: { lastUsedAt: new Date() }
  });
}

// Find orphaned assets (uploaded but never used)
const orphans = await Asset.find({
  usageCount: 0,
  uploadedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).select('key cdnUrl size');
```

## Summary

MongoDB is ideal for storing static asset metadata - it supports rich indexing on MIME type, tags, and full-text search while leaving actual file storage to purpose-built object stores like S3. Design your schema to capture file properties, image dimensions, CDN URLs, and usage tracking. Use MongoDB queries to power media library search, find orphaned assets for cleanup, and generate usage reports across your content.
