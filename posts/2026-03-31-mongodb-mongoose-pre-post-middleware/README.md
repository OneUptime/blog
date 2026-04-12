# How to Use Mongoose Pre and Post Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Middleware, Hook, Node.js

Description: Learn how to use Mongoose pre and post middleware hooks to add logging, hashing, cascading deletes, and other cross-cutting behavior to your MongoDB models.

---

## What Is Mongoose Middleware?

Mongoose middleware (also called hooks) are functions that run before (`pre`) or after (`post`) specific model operations - such as `save`, `find`, `findOneAndUpdate`, and `deleteOne`. They let you inject logic without modifying every call site.

## Pre-Save Middleware

The most common use case is hashing passwords before saving:

```javascript
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

The `this.isModified('password')` check prevents re-hashing the password when other fields are updated.

## Pre-Validate Middleware

Run logic before Mongoose validation:

```javascript
userSchema.pre('validate', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});
```

Pre-validate hooks let you normalize data before it is checked against schema validators.

## Post-Save Middleware

Post hooks receive the saved document and can trigger side effects:

```javascript
userSchema.post('save', async function (doc) {
  await sendWelcomeEmail(doc.email);
  console.log(`User ${doc._id} saved and welcome email queued`);
});
```

Post hooks do not call `next()` - they are informational callbacks after the operation completes.

## Query Middleware (pre-find)

Attach middleware to query operations to add soft delete filtering automatically:

```javascript
const postSchema = new mongoose.Schema({
  title: String,
  deletedAt: { type: Date, default: null }
});

postSchema.pre(/^find/, function (next) {
  // Automatically exclude soft-deleted documents from all find queries
  this.where({ deletedAt: null });
  next();
});
```

The regex `/^find/` matches `find`, `findOne`, `findOneAndDelete`, `findOneAndUpdate`, etc. Since `findById` internally calls `findOne`, this middleware also applies to `findById` queries.

## Cascading Deletes

Use a pre-deleteOne hook to delete related documents:

```javascript
const authorSchema = new mongoose.Schema({ name: String });

authorSchema.pre('deleteOne', { document: true }, async function (next) {
  await mongoose.model('Post').deleteMany({ authorId: this._id });
  next();
});
```

Pass `{ document: true }` to indicate the hook runs on document instances (not query middleware).

## Error Handling in Middleware

Handle errors by passing them to `next`:

```javascript
userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    next();
  } catch (err) {
    next(err); // Passes error to the save() promise rejection
  }
});
```

## Post Error-Handling Middleware

Intercept errors thrown by the operation itself (e.g., duplicate key):

```javascript
userSchema.post('save', function (err, doc, next) {
  if (err.code === 11000) {
    next(new Error('Email address is already registered'));
  } else {
    next(err);
  }
});
```

Post error middleware takes three parameters: `(err, doc, next)`.

## Summary

Mongoose pre and post middleware enable clean separation of cross-cutting concerns. Use `pre('save')` for password hashing and data normalization, `pre(/^find/)` for transparent soft-delete filtering, and `post('save')` for side effects like emails or cache invalidation. Always call `next()` in pre hooks (passing errors when they occur) and use the three-parameter signature in post hooks to handle operation errors. Middleware keeps your model methods focused on business logic while hooks handle infrastructure concerns.
