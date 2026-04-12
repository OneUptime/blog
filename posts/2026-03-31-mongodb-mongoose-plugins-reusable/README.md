# How to Use Mongoose Plugins for Reusable Functionality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Plugin, Reusable, Schema

Description: Learn how to write and apply Mongoose plugins to add reusable functionality like soft deletes, timestamps, and pagination across multiple models.

---

## What Are Mongoose Plugins?

A Mongoose plugin is a function that receives a schema and options, and modifies the schema to add fields, methods, statics, virtuals, or hooks. Plugins let you extract cross-cutting schema behavior into a single reusable module rather than duplicating it across every model.

## Writing a Basic Plugin

A plugin is a plain JavaScript function:

```javascript
// plugins/timestamps.js
function timestampsPlugin(schema, options) {
  schema.add({
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  schema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
  });
}

module.exports = timestampsPlugin;
```

Apply it to a schema:

```javascript
const timestampsPlugin = require('./plugins/timestamps');
const postSchema = new mongoose.Schema({ title: String, body: String });
postSchema.plugin(timestampsPlugin);
```

## Soft Delete Plugin

A soft delete plugin adds `deletedAt` and `isDeleted` fields and filters deleted documents automatically:

```javascript
// plugins/softDelete.js
function softDeletePlugin(schema) {
  schema.add({
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date, default: null }
  });

  // Automatically exclude soft-deleted documents
  schema.pre(/^find/, function (next) {
    if (this.getQuery().isDeleted == null) {
      this.where({ isDeleted: false });
    }
    next();
  });

  // Instance method: soft delete
  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // Static: restore a soft-deleted document
  schema.statics.restore = function (id) {
    return this.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
  };
}

module.exports = softDeletePlugin;
```

## Pagination Plugin

Add cursor-based pagination to any model:

```javascript
// plugins/pagination.js
function paginationPlugin(schema) {
  schema.statics.paginate = async function (query, options = {}) {
    const { limit = 20, cursor, sortField = '_id', sortOrder = 1 } = options;

    const filter = { ...query };
    if (cursor) {
      filter[sortField] = sortOrder === 1
        ? { $gt: cursor }
        : { $lt: cursor };
    }

    const docs = await this.find(filter)
      .sort({ [sortField]: sortOrder })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();

    return {
      data: docs,
      nextCursor: hasMore ? docs[docs.length - 1][sortField] : null
    };
  };
}

module.exports = paginationPlugin;
```

Usage:

```javascript
const { data, nextCursor } = await Post.paginate(
  { published: true },
  { limit: 10, cursor: lastSeenId }
);
```

## Applying a Plugin Globally

Register a plugin with `mongoose.plugin()` to apply it to all schemas in your application:

```javascript
const mongoose = require('mongoose');
const timestampsPlugin = require('./plugins/timestamps');

// Applied to every schema created after this line
mongoose.plugin(timestampsPlugin);
```

Use this sparingly - only for truly universal behavior like audit fields.

## Summary

Mongoose plugins are functions that extend schemas with fields, methods, statics, virtuals, and hooks. Write them as pure functions with a schema parameter, apply them per-schema with `schema.plugin()`, or globally with `mongoose.plugin()`. Common plugin patterns include soft delete, audit timestamps, pagination, and schema-level access control. Plugins eliminate schema duplication and keep cross-cutting concerns centralized and testable.
