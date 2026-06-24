# How to Build a Headless CMS with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CMS, API, Node.js, Content

Description: Learn how to build a headless CMS API with MongoDB, covering content types, flexible schemas, media management, and a content delivery API.

---

## What Is a Headless CMS

A headless CMS decouples content management from content presentation. It provides a backend API for storing and managing content but has no built-in frontend - your React, Next.js, mobile app, or any other client fetches content via the API. MongoDB is well-suited as the storage layer because its flexible document model naturally accommodates varied content types and nested structures.

## Core Data Models

```javascript
// models/ContentType.js - defines structure for a content model
const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'richtext', 'number', 'boolean', 'date', 'media', 'reference', 'array'], required: true },
  required: { type: Boolean, default: false },
  defaultValue: mongoose.Schema.Types.Mixed,
  validations: mongoose.Schema.Types.Mixed
}, { _id: false });

const ContentTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },  // e.g., "Blog Post"
  apiId: { type: String, required: true, unique: true }, // e.g., "blog-post"
  fields: [FieldSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContentType', ContentTypeSchema);
```

```javascript
// models/Entry.js - a content item of any type
const EntrySchema = new mongoose.Schema({
  contentType: { type: String, required: true, index: true },  // apiId
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  publishedAt: Date,
  locale: { type: String, default: 'en' },
  data: { type: mongoose.Schema.Types.Mixed, required: true }, // flexible content fields
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EntrySchema.index({ contentType: 1, status: 1, publishedAt: -1 });
EntrySchema.index({ contentType: 1, locale: 1 });
EntrySchema.index({ '$**': 'text' }); // wildcard text index

module.exports = mongoose.model('Entry', EntrySchema);
```

## Content Management API

```javascript
// routes/management.js
const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const ContentType = require('../models/ContentType');

// Create a content entry
router.post('/content/:contentType', async (req, res) => {
  const { contentType } = req.params;
  const type = await ContentType.findOne({ apiId: contentType });
  if (!type) return res.status(404).json({ error: 'Content type not found' });

  const entry = await Entry.create({
    contentType,
    data: req.body.data,
    locale: req.body.locale || 'en',
    status: 'draft',
    createdBy: req.user._id
  });
  res.status(201).json(entry);
});

// Publish an entry
router.post('/content/:contentType/:id/publish', async (req, res) => {
  const entry = await Entry.findOneAndUpdate(
    { _id: req.params.id, contentType: req.params.contentType },
    { status: 'published', publishedAt: new Date(), updatedBy: req.user._id },
    { new: true }
  );
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

// List entries with filtering
router.get('/content/:contentType', async (req, res) => {
  const { status, locale, page = 1, limit = 20, q } = req.query;
  const filter = { contentType: req.params.contentType };
  if (status) filter.status = status;
  if (locale) filter.locale = locale;
  if (q) filter.$text = { $search: q };

  const [entries, total] = await Promise.all([
    Entry.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Entry.countDocuments(filter)
  ]);

  res.json({ entries, total, page: Number(page), limit: Number(limit) });
});
```

## Content Delivery API

The delivery API exposes only published content to frontend consumers:

```javascript
// routes/delivery.js
const router = express.Router();

// Get published entries by content type
router.get('/api/content/:contentType', async (req, res) => {
  const { locale = 'en', page = 1, limit = 20 } = req.query;

  const entries = await Entry.find({
    contentType: req.params.contentType,
    status: 'published',
    locale
  })
  .sort({ publishedAt: -1 })
  .skip((page - 1) * Number(limit))
  .limit(Number(limit))
  .select('data publishedAt locale');

  res.set('Cache-Control', 'public, max-age=60');
  res.json(entries);
});

// Get single entry by ID
router.get('/api/content/:contentType/:id', async (req, res) => {
  const entry = await Entry.findOne({
    _id: req.params.id,
    contentType: req.params.contentType,
    status: 'published'
  }).select('data publishedAt locale');

  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(entry);
});
```

## Resolving References Between Content Types

```javascript
async function resolveReferences(entry, depth = 1) {
  if (depth === 0) return entry;

  const data = { ...entry.data };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && value._type === 'reference') {
      const ref = await Entry.findById(value._ref)
        .select('data contentType publishedAt');
      if (ref) {
        data[key] = await resolveReferences(ref, depth - 1);
      }
    }
  }

  return { ...entry.toObject(), data };
}
```

## Summary

A MongoDB-backed headless CMS separates content types (schema definitions) from entries (content documents) using a flexible `data: Mixed` field. This allows a single Entry model to store any content shape without schema migrations. The management API handles CRUD and publishing workflows; the delivery API exposes only published, locale-filtered content to frontend consumers. Use wildcard text indexes for full-text search across all content fields and reference resolution for related content.
