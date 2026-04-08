# How to Implement Data Deduplication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Deduplication, Index, Aggregation, Data Quality

Description: Learn how to detect and remove duplicate documents in MongoDB using unique indexes, aggregation pipelines, and hash-based fingerprinting.

---

Duplicate data corrupts analytics, wastes storage, and causes confusing behavior in applications. MongoDB provides several tools for deduplication: unique indexes to prevent future duplicates, aggregation pipelines to find existing ones, and atomic upserts to insert-or-update without duplicates.

## Preventing Duplicates with Unique Indexes

The simplest deduplication strategy is a unique index on the natural key:

```javascript
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: String,
  phone: String,
});

// Compound unique index for multi-field uniqueness
const eventSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  eventType: String,
  externalId: String,
});

eventSchema.index({ userId: 1, externalId: 1 }, { unique: true });
```

## Hash-Based Fingerprinting

For documents without a natural unique key, compute a content hash:

```javascript
const crypto = require('crypto');

function computeFingerprint(doc) {
  const normalized = JSON.stringify({
    title: doc.title?.trim().toLowerCase(),
    source: doc.source,
    publishedAt: doc.publishedAt?.toISOString().slice(0, 10),
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const articleSchema = new mongoose.Schema({
  title: String,
  source: String,
  content: String,
  publishedAt: Date,
  fingerprint: { type: String, unique: true, sparse: true },
});

// Before saving, compute the fingerprint
articleSchema.pre('save', function () {
  this.fingerprint = computeFingerprint(this);
});
```

## Upsert to Avoid Duplicates on Insert

Use `upsert: true` to insert only if no matching document exists:

```javascript
async function upsertArticle(data) {
  const fingerprint = computeFingerprint(data);

  return Article.findOneAndUpdate(
    { fingerprint },
    {
      $setOnInsert: { ...data, fingerprint, createdAt: new Date() },
      $set: { lastSeenAt: new Date() },
    },
    { upsert: true, new: true }
  );
}
```

## Finding Existing Duplicates with Aggregation

Identify duplicate groups in an existing collection:

```javascript
// Find duplicate emails in a contacts collection
const duplicates = await Contact.aggregate([
  {
    $group: {
      _id: { email: { $toLower: '$email' } },
      count: { $sum: 1 },
      ids: { $push: '$_id' },
      docs: { $push: '$$ROOT' },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);

console.log(`Found ${duplicates.length} duplicate email groups`);
```

## Bulk Deduplication

Remove duplicates by keeping the oldest document in each group:

```javascript
async function deduplicateContacts() {
  const duplicates = await Contact.aggregate([
    { $sort: { _id: 1 } },
    { $group: { _id: { email: { $toLower: '$email' } }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let totalRemoved = 0;

  for (const group of duplicates) {
    // Keep the first (oldest) document, delete the rest
    const [keep, ...remove] = group.ids;
    const result = await Contact.deleteMany({ _id: { $in: remove } });
    totalRemoved += result.deletedCount;
  }

  console.log(`Removed ${totalRemoved} duplicate documents`);
  return totalRemoved;
}
```

## Deduplicating During an Aggregation Pipeline

Use `$group` to deduplicate data within a pipeline without modifying the source collection:

```javascript
// Get deduplicated list of events per user
const dedupedEvents = await Event.aggregate([
  { $sort: { createdAt: 1 } },
  {
    $group: {
      _id: { userId: '$userId', externalId: '$externalId' },
      firstSeen: { $min: '$createdAt' },
      doc: { $first: '$$ROOT' },
    },
  },
  { $replaceRoot: { newRoot: '$doc' } },
]);
```

## Checking for Duplicates Before Bulk Insert

```javascript
async function bulkInsertDeduped(articles) {
  const fingerprints = articles.map(computeFingerprint);
  const existing = await Article.find({ fingerprint: { $in: fingerprints } })
    .select('fingerprint')
    .lean();

  const existingSet = new Set(existing.map((a) => a.fingerprint));
  const newArticles = articles.filter((a) => !existingSet.has(computeFingerprint(a)));

  if (newArticles.length > 0) {
    await Article.insertMany(newArticles.map((a) => ({ ...a, fingerprint: computeFingerprint(a) })));
  }

  return { inserted: newArticles.length, skipped: articles.length - newArticles.length };
}
```

## Summary

MongoDB deduplication combines unique indexes (to prevent future duplicates), content fingerprinting (to identify semantic duplicates without natural keys), and aggregation pipelines (to find and remove existing duplicates). Use upsert with `$setOnInsert` for concurrent-safe single-document deduplication, and bulk aggregation + `deleteMany` for periodic cleanup of existing data.
