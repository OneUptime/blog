# How to Use Mongoose Subdocuments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Subdocument, Embedded, Node.js

Description: Learn how to define and work with Mongoose subdocuments to embed nested arrays and objects inside MongoDB documents with full validation and middleware support.

---

## What Are Mongoose Subdocuments?

Mongoose subdocuments are nested schema instances embedded inside a parent document. Unlike plain JavaScript objects, subdocuments have their own schemas - with validation, defaults, and lifecycle methods - and they receive their own `_id` by default.

## Defining Subdocuments

Create a schema for the embedded document, then reference it in the parent:

```javascript
const commentSchema = new mongoose.Schema({
  author:    { type: String, required: true },
  body:      { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  likes:     { type: Number, default: 0 }
});

const metadataSchema = new mongoose.Schema({
  views:    { type: Number, default: 0 },
  featured: { type: Boolean, default: false }
});

const postSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  body:     String,
  comments: [commentSchema],       // array of subdocuments
  metadata: metadataSchema          // single nested subdocument
});

const Post = mongoose.model('Post', postSchema);
```

## Adding Subdocuments to an Array

```javascript
const post = await Post.findById(postId);

// Push a new comment subdocument
post.comments.push({
  author: 'Alice',
  body: 'Great post!'
});

await post.save(); // validation runs on new subdocument
```

Mongoose validates each subdocument against its schema when you call `save()`.

## Accessing Subdocuments by ID

Each subdocument gets an `_id` automatically. Use `id()` to find one by its ObjectId string:

```javascript
const post = await Post.findById(postId);
const comment = post.comments.id(commentId);

if (!comment) throw new Error('Comment not found');

console.log(comment.body);

// Update a subdocument field
comment.likes += 1;
await post.save();
```

## Removing a Subdocument

```javascript
const post = await Post.findById(postId);
const comment = post.comments.id(commentId);

if (comment) {
  comment.deleteOne();    // marks subdoc for removal
  await post.save();
}
```

Or using `$pull` for a direct atomic update:

```javascript
await Post.updateOne(
  { _id: postId },
  { $pull: { comments: { _id: commentId } } }
);
```

## Subdocument Middleware

Subdocument schemas support their own `pre('save')` hooks:

```javascript
commentSchema.pre('save', function (next) {
  this.body = this.body.trim();
  next();
});
```

This hook runs whenever the parent document is saved and the subdocument is new or modified.

## Disabling _id on Subdocuments

For embedded objects that do not need their own ID (e.g., small value objects), disable `_id`:

```javascript
const addressSchema = new mongoose.Schema(
  { street: String, city: String, zip: String },
  { _id: false }
);

const customerSchema = new mongoose.Schema({
  name:    String,
  address: addressSchema
});
```

This reduces document size and avoids generating unnecessary ObjectIds.

## Summary

Mongoose subdocuments embed nested schemas with full validation inside parent documents. Use an array of a subdocument schema for one-to-many embedded data (like comments), and a single subdocument schema for nested objects (like address). Access subdocuments by `_id` using the `id()` method, update them in place and call `save()`, or use `$pull` for direct atomic removal. Set `{ _id: false }` on subdocument schemas for value objects that do not need an identifier.
