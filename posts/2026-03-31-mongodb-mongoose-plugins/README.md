# How to Use Mongoose Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Plugin, Schema, Node.js

Description: Learn how to create and apply Mongoose plugins to add reusable functionality like timestamps, soft delete, and pagination across multiple schemas.

---

## Overview

Mongoose plugins are reusable functions that extend schema functionality. A plugin receives a schema and options, then adds fields, methods, statics, or hooks. You can apply plugins to individual schemas or globally to all schemas.

## Creating a Simple Plugin

A plugin is a function that takes a `schema` and `options` as arguments:

```javascript
// plugins/lastModified.js
function lastModifiedPlugin(schema, options) {
  schema.add({ lastModified: Date });

  schema.pre('save', function(next) {
    this.lastModified = new Date();
    next();
  });

  if (options && options.index) {
    schema.path('lastModified').index(options.index);
  }
}

module.exports = lastModifiedPlugin;
```

Apply it to a schema:

```javascript
const { Schema, model } = require('mongoose');
const lastModifiedPlugin = require('./plugins/lastModified');

const blogSchema = new Schema({ title: String, body: String });
blogSchema.plugin(lastModifiedPlugin, { index: true });

const Blog = model('Blog', blogSchema);
```

## Soft Delete Plugin

```javascript
function softDeletePlugin(schema) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.methods.softDelete = async function() {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.statics.findActive = function(filter = {}) {
    return this.find({ ...filter, deletedAt: null });
  };

  schema.pre(/^find/, function(next) {
    if (!this.getFilter().includeDeleted) {
      this.where({ deletedAt: null });
    }
    next();
  });
}
```

## Pagination Plugin

```javascript
function paginatePlugin(schema) {
  schema.statics.paginate = async function(filter = {}, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.find(filter).skip(skip).limit(limit),
      this.countDocuments(filter)
    ]);
    return { docs, total, page, pages: Math.ceil(total / limit) };
  };
}
```

## Using Community Plugins

Install and apply popular community plugins:

```bash
npm install mongoose-paginate-v2 mongoose-autopopulate
```

```javascript
const paginate = require('mongoose-paginate-v2');
const autopopulate = require('mongoose-autopopulate');

const orderSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', autopopulate: true },
  total:      Number
});

orderSchema.plugin(paginate);
orderSchema.plugin(autopopulate);
```

## Global Plugin Registration

Apply a plugin to every schema in your application:

```javascript
const mongoose = require('mongoose');
const lastModifiedPlugin = require('./plugins/lastModified');

// Must be called before defining any models
mongoose.plugin(lastModifiedPlugin);
```

## Summary

Mongoose plugins encapsulate schema extensions - fields, hooks, methods, and statics - into reusable units. Create plugins as functions that accept `schema` and `options`, then apply them per schema with `schema.plugin()` or globally with `mongoose.plugin()`. Plugins are ideal for cross-cutting concerns like soft delete, auditing, and pagination.
