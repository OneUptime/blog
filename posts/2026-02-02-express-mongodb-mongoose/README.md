# How to Use MongoDB with Express and Mongoose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, MongoDB, Mongoose, Database

Description: A comprehensive guide to using MongoDB with Express.js and Mongoose, covering schemas, models, CRUD operations, relationships, and best practices.

---

MongoDB pairs naturally with Express.js for building Node.js APIs. But working directly with MongoDB's native driver means handling a lot of boilerplate - connection management, data validation, type coercion. Mongoose sits between your application and MongoDB, providing schemas, validation, middleware hooks, and a cleaner query API.

This guide walks through setting up Mongoose with Express, from basic CRUD operations to handling relationships and building production-ready models.

## Why Use Mongoose?

Mongoose gives you structure in a schema-less database. You define what your documents should look like, and Mongoose enforces it. You also get:

- **Schema validation** - Catch invalid data before it hits the database
- **Type casting** - Strings become Dates, Numbers, ObjectIds automatically
- **Middleware hooks** - Run code before/after save, remove, validate
- **Query helpers** - Chainable query building with a clean API
- **Virtuals** - Computed properties that don't persist to the database

## Setting Up the Connection

First, install the required packages:

```bash
npm install express mongoose dotenv
```

Create a database connection module that handles reconnection and error logging:

```javascript
// db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connection options for production reliability
    const options = {
      maxPoolSize: 10,           // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000,  // Timeout after 5s if server not available
      socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting reconnect...');
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

Wire it up in your Express app:

```javascript
// app.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./db');

const app = express();
app.use(express.json());

// Connect to database before starting server
connectDB().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
});
```

## Defining Schemas and Models

Schemas define the shape of your documents. Models are constructors compiled from schemas - they provide the interface for querying and manipulating data.

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,         // Always store lowercase
    trim: true,              // Remove whitespace
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false            // Don't include in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  profile: {
    bio: String,
    avatar: String,
    website: String
  }
}, {
  timestamps: true           // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('User', userSchema);
```

### Schema Types Reference

| Type | Description | Example |
|------|-------------|---------|
| String | Text data | `name: String` |
| Number | Numeric values | `age: Number` |
| Boolean | True/false | `isActive: Boolean` |
| Date | Date objects | `createdAt: Date` |
| ObjectId | MongoDB document reference | `author: mongoose.Schema.Types.ObjectId` |
| Array | Lists of values | `tags: [String]` |
| Mixed | Any type (use sparingly) | `metadata: mongoose.Schema.Types.Mixed` |
| Buffer | Binary data | `photo: Buffer` |

## CRUD Operations

### Create

```javascript
// routes/users.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Create a single user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ errors: messages });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Create multiple users
router.post('/bulk', async (req, res) => {
  try {
    const users = await User.insertMany(req.body.users, {
      ordered: false  // Continue inserting even if some fail
    });
    res.status(201).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Read

```javascript
// Get all users with filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', role } = req.query;

    // Build query object
    const query = { isActive: true };
    if (role) query.role = role;

    const users = await User.find(query)
      .sort(sort)                          // '-createdAt' for descending
      .skip((page - 1) * limit)            // Pagination offset
      .limit(parseInt(limit))              // Results per page
      .select('name email role createdAt'); // Only return these fields

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
```

### Update

```javascript
// Update user
router.put('/:id', async (req, res) => {
  try {
    // findByIdAndUpdate options:
    // - new: return the updated document
    // - runValidators: run schema validators on update
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Partial update with $set
router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Delete

```javascript
// Hard delete
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete - often better for production
router.delete('/:id/soft', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

## Relationships

MongoDB supports two approaches to modeling relationships: references (like foreign keys) and embedding (nested documents).

### References with Population

Use references when documents are accessed independently or when data would be duplicated excessively.

```javascript
// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',              // Reference to User model
    required: true
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
```

Query with populated references:

```javascript
// Get posts with author details populated
router.get('/posts', async (req, res) => {
  const posts = await Post.find()
    .populate('author', 'name email')     // Only include name and email
    .populate({
      path: 'comments',
      populate: { path: 'author', select: 'name' }  // Nested populate
    })
    .sort('-createdAt');

  res.json(posts);
});
```

### Embedded Documents

Use embedding when data is always accessed together and doesn't make sense on its own.

```javascript
// Embedded comment schema
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorName: String,
  authorId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const articleSchema = new mongoose.Schema({
  title: String,
  body: String,
  comments: [commentSchema]    // Array of embedded documents
});

module.exports = mongoose.model('Article', articleSchema);
```

Add and remove embedded documents:

```javascript
// Add a comment to an article
router.post('/articles/:id/comments', async (req, res) => {
  const article = await Article.findById(req.params.id);
  article.comments.push({
    text: req.body.text,
    authorName: req.user.name,
    authorId: req.user._id
  });
  await article.save();
  res.json(article);
});

// Remove a comment
router.delete('/articles/:articleId/comments/:commentId', async (req, res) => {
  const article = await Article.findById(req.params.articleId);
  article.comments.id(req.params.commentId).remove();
  await article.save();
  res.json(article);
});
```

## Middleware Hooks

Middleware runs at specific points in the document lifecycle. Use it for hashing passwords, logging, or cascading deletes.

```javascript
const bcrypt = require('bcrypt');

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Remove user's posts when user is deleted
userSchema.pre('remove', async function(next) {
  await Post.deleteMany({ author: this._id });
  next();
});

// Log after saving
userSchema.post('save', function(doc) {
  console.log('User saved:', doc._id);
});
```

## Instance Methods and Statics

Add custom methods to your models:

```javascript
// Instance method - available on document instances
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method - available on the model itself
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Usage
const user = await User.findByEmail('john@example.com');
const isMatch = await user.comparePassword('password123');
```

## Virtuals

Virtual properties are computed fields that don't get saved to MongoDB:

```javascript
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Include virtuals in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
```

## Indexes

Add indexes to improve query performance:

```javascript
// Single field index
userSchema.index({ email: 1 });

// Compound index
userSchema.index({ role: 1, createdAt: -1 });

// Text index for search
postSchema.index({ title: 'text', content: 'text' });
```

## Summary

| Concept | Purpose |
|---------|---------|
| **Schema** | Defines document structure and validation |
| **Model** | Provides the query interface for a collection |
| **References** | Links documents across collections with populate |
| **Embedding** | Nests related data inside a document |
| **Middleware** | Runs code before/after database operations |
| **Virtuals** | Computed properties without persistence |
| **Indexes** | Speeds up queries on specific fields |

Mongoose bridges the gap between MongoDB's flexibility and the structure most applications need. Start with schemas that match your data, add validation to catch errors early, and use middleware to handle cross-cutting concerns like password hashing. As your application grows, references and embedding give you options for modeling relationships that fit your query patterns.
