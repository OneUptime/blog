# How to Use Mongoose Middleware (Pre and Post Hooks)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Middleware, Hook, Node.js

Description: Learn how to use Mongoose pre and post middleware hooks to run logic before and after document operations like save, validate, and remove.

---

## Overview

Mongoose middleware (also called hooks) are functions that execute before or after specific operations such as `save`, `validate`, `find`, and `deleteOne`. They allow you to separate cross-cutting concerns like password hashing, auditing, and cascading deletes from your core business logic.

## Document Middleware

Document middleware runs on document instances. Common hooks: `validate`, `save`, `deleteOne`, `init`.

```javascript
const bcrypt = require('bcryptjs');
const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  email:    String,
  password: String,
  updatedAt: Date
});

// Pre-save: hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Pre-save: set updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Post-save: log after successful save
userSchema.post('save', function(doc, next) {
  console.log(`User ${doc.email} saved`);
  next();
});
```

## Query Middleware

Query middleware runs on Mongoose query objects. Use `this` to access the query.

```javascript
// Pre-find: exclude soft-deleted documents automatically
userSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

// Post-find: log result count
userSchema.post('find', function(docs, next) {
  console.log(`find returned ${docs.length} documents`);
  next();
});
```

## Aggregate Middleware

```javascript
userSchema.pre('aggregate', function(next) {
  // Prepend a $match stage to exclude deleted docs
  this.pipeline().unshift({ $match: { deletedAt: null } });
  next();
});
```

## Model Middleware

Run logic before or after `insertMany`:

```javascript
userSchema.pre('insertMany', function(next, docs) {
  docs.forEach(doc => { doc.createdAt = new Date(); });
  next();
});
```

## Error Handling in Middleware

Return an error to abort the operation:

```javascript
userSchema.pre('save', function(next) {
  if (!this.email.includes('@')) {
    return next(new Error('Invalid email format'));
  }
  next();
});
```

## Cascading Deletes with Post Middleware

```javascript
const postSchema = new Schema({ authorId: Schema.Types.ObjectId, content: String });
const Post = model('Post', postSchema);

userSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  await Post.deleteMany({ authorId: doc._id });
  console.log(`Deleted posts for user ${doc._id}`);
});
```

## Summary

Mongoose pre and post hooks execute on document, query, aggregate, and model operations. Use `pre('save')` for hashing and timestamping, `pre(/^find/)` for automatic soft-delete filters, and `post('deleteOne')` for cascading deletes. Always call `next()` or return an error to control execution flow.
