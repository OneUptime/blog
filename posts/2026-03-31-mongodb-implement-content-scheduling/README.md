# How to Implement Content Scheduling with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scheduling, CMS, Content, Automation

Description: Learn how to implement content scheduling in MongoDB to automatically publish, unpublish, and expire content at specified times using a scheduler pattern.

---

## What Is Content Scheduling

Content scheduling allows editors to set future publish dates and automatic unpublish times for content pieces. A CMS with scheduling enables marketing campaigns to go live at midnight, blog posts to publish on a specific date, and time-limited promotions to expire automatically - without manual intervention.

MongoDB supports this through a combination of date fields, TTL indexes for automatic expiry, and a scheduler loop that processes pending state transitions.

## Content Schema with Scheduling Fields

```javascript
// models/Content.js
const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  body: String,

  // Scheduling
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'unpublished', 'expired'],
    default: 'draft',
    index: true
  },
  publishAt: { type: Date, index: true },    // when to auto-publish
  unpublishAt: { type: Date, index: true },  // when to auto-unpublish
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },  // TTL for temporary content

  publishedAt: Date,    // actual time published
  unpublishedAt: Date,  // actual time unpublished

  // Who scheduled it
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for the scheduler query
ContentSchema.index({ status: 1, publishAt: 1 });
ContentSchema.index({ status: 1, unpublishAt: 1 });

module.exports = mongoose.model('Content', ContentSchema);
```

## Scheduling Content via API

```javascript
// Schedule a post to publish at a specific time
async function scheduleContent(contentId, publishAt, unpublishAt, userId) {
  if (publishAt < new Date()) {
    throw new Error('Publish date must be in the future');
  }
  if (unpublishAt && unpublishAt <= publishAt) {
    throw new Error('Unpublish date must be after publish date');
  }

  return await Content.findByIdAndUpdate(
    contentId,
    {
      status: 'scheduled',
      publishAt,
      unpublishAt: unpublishAt || null,
      scheduledBy: userId,
      updatedAt: new Date()
    },
    { new: true }
  );
}

// Cancel a scheduled post (move back to draft)
async function cancelSchedule(contentId) {
  return await Content.findByIdAndUpdate(
    contentId,
    {
      $set: { status: 'draft', updatedAt: new Date() },
      $unset: { publishAt: 1, unpublishAt: 1, scheduledBy: 1 }
    },
    { new: true }
  );
}
```

## The Content Scheduler

Run a scheduler loop that polls MongoDB for due state transitions:

```javascript
// scheduler/contentScheduler.js
const Content = require('../models/Content');

async function processScheduledPublishes() {
  const now = new Date();

  // Publish all content whose publishAt has passed
  const result = await Content.updateMany(
    {
      status: 'scheduled',
      publishAt: { $lte: now }
    },
    {
      $set: {
        status: 'published',
        publishedAt: now,
        updatedAt: now
      },
      $unset: { publishAt: 1 }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Published ${result.modifiedCount} scheduled content items`);
    // Optionally fetch and reindex/invalidate cache for each item
  }
  return result.modifiedCount;
}

async function processScheduledUnpublishes() {
  const now = new Date();

  const result = await Content.updateMany(
    {
      status: 'published',
      unpublishAt: { $lte: now }
    },
    {
      $set: {
        status: 'unpublished',
        unpublishedAt: now,
        updatedAt: now
      },
      $unset: { unpublishAt: 1 }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Unpublished ${result.modifiedCount} content items`);
  }
  return result.modifiedCount;
}

// Run every minute
async function runContentScheduler() {
  try {
    await processScheduledPublishes();
    await processScheduledUnpublishes();
  } catch (err) {
    console.error('Content scheduler error:', err.message);
  }
}

module.exports = { runContentScheduler };
```

Start the scheduler:

```javascript
// In your app startup
const { runContentScheduler } = require('./scheduler/contentScheduler');

// Run every 60 seconds
setInterval(runContentScheduler, 60 * 1000);
runContentScheduler(); // Run immediately on startup
```

## Querying Published Content

```javascript
// Get currently published content
async function getPublishedContent(options = {}) {
  const now = new Date();
  return await Content.find({
    status: 'published',
    $or: [
      { unpublishAt: null },
      { unpublishAt: { $gt: now } }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(options.limit || 20);
}

// Preview scheduled content
async function getScheduledContent() {
  return await Content.find({ status: 'scheduled' })
    .sort({ publishAt: 1 })
    .select('title slug publishAt unpublishAt scheduledBy');
}
```

## Summary

MongoDB content scheduling uses date fields (`publishAt`, `unpublishAt`) combined with a status field to control content lifecycle. A scheduler loop runs every minute and uses `updateMany` to transition content between states when the target time passes. This approach is simple and queryable - editors can view the publishing queue by filtering on `status: 'scheduled'`, and the scheduler processes multiple content items in a single `updateMany` call where each document update is individually atomic.
