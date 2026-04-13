# How to Implement Content Versioning with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Versioning, CMS, Content, Audit

Description: Learn how to implement content versioning in MongoDB to maintain a full history of document changes and enable rollback to any previous version.

---

## Content Versioning Patterns in MongoDB

There are two main patterns for content versioning in MongoDB:

1. **Inline history**: Store all versions in the same document using a `versions` array
2. **Separate collection**: Store each version as its own document in a `versions` collection

The separate collection pattern is more scalable for large content with many revisions and supports efficient querying without loading all versions into memory.

## Schema: Separate Versions Collection

```javascript
// models/Content.js - current version (live document)
const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  body: String,
  excerpt: String,
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  currentVersion: { type: Number, default: 1 },
  publishedAt: Date,
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Content', ContentSchema);
```

```javascript
// models/ContentVersion.js - version history
const mongoose = require('mongoose');

const ContentVersionSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
  version: { type: Number, required: true },
  title: String,
  body: String,
  excerpt: String,
  status: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeNote: String,
  diff: mongoose.Schema.Types.Mixed  // optional: store only what changed
});

ContentVersionSchema.index({ contentId: 1, version: -1 });

module.exports = mongoose.model('ContentVersion', ContentVersionSchema);
```

## Creating and Updating Content with Versioning

```javascript
// services/contentService.js
const Content = require('../models/Content');
const ContentVersion = require('../models/ContentVersion');
const mongoose = require('mongoose');

async function createContent(data, userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const content = await Content.create([{
      ...data,
      currentVersion: 1,
      updatedBy: userId
    }], { session });

    // Create initial version snapshot
    await ContentVersion.create([{
      contentId: content[0]._id,
      version: 1,
      title: data.title,
      body: data.body,
      excerpt: data.excerpt,
      status: data.status,
      metadata: data.metadata,
      createdBy: userId,
      changeNote: 'Initial version'
    }], { session });

    await session.commitTransaction();
    return content[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function updateContent(contentId, updates, userId, changeNote = '') {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const content = await Content.findById(contentId).session(session);
    if (!content) throw new Error('Content not found');

    const newVersion = content.currentVersion + 1;

    await Content.findByIdAndUpdate(
      contentId,
      { ...updates, currentVersion: newVersion, updatedAt: new Date(), updatedBy: userId },
      { session }
    );

    // Snapshot the new state as a version
    await ContentVersion.create([{
      contentId,
      version: newVersion,
      title: updates.title ?? content.title,
      body: updates.body ?? content.body,
      excerpt: updates.excerpt ?? content.excerpt,
      status: updates.status ?? content.status,
      metadata: updates.metadata ?? content.metadata,
      createdBy: userId,
      changeNote
    }], { session });

    await session.commitTransaction();
    return { version: newVersion };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

## Retrieving Version History and Rollback

```javascript
// Get version history for a content item
async function getVersionHistory(contentId, limit = 20) {
  return await ContentVersion.find({ contentId })
    .sort({ version: -1 })
    .limit(limit)
    .populate('createdBy', 'name email')
    .select('-body -metadata');  // exclude large fields from list view
}

// Get a specific version
async function getVersion(contentId, version) {
  return await ContentVersion.findOne({ contentId, version });
}

// Rollback to a previous version
async function rollback(contentId, targetVersion, userId) {
  const snapshot = await ContentVersion.findOne({ contentId, version: targetVersion });
  if (!snapshot) throw new Error(`Version ${targetVersion} not found`);

  return await updateContent(
    contentId,
    {
      title: snapshot.title,
      body: snapshot.body,
      excerpt: snapshot.excerpt,
      status: snapshot.status,
      metadata: snapshot.metadata
    },
    userId,
    `Rolled back to version ${targetVersion}`
  );
}
```

## Comparing Versions

```javascript
const diff = require('diff');

async function compareVersions(contentId, versionA, versionB) {
  const [a, b] = await Promise.all([
    ContentVersion.findOne({ contentId, version: versionA }),
    ContentVersion.findOne({ contentId, version: versionB })
  ]);

  return {
    titleDiff: diff.diffWords(a.title || '', b.title || ''),
    bodyDiff: diff.diffWords(a.body || '', b.body || '')
  };
}
```

## Summary

MongoDB content versioning with a separate versions collection provides a scalable revision history. Each update creates a new version snapshot via a transaction, ensuring consistency between the live document and version history. Use version history for audit trails, enable rollback by re-applying a snapshot as a new version, and compare versions using a diff library for editorial review workflows.
