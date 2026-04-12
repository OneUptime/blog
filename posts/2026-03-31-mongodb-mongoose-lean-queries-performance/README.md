# How to Use Mongoose Lean Queries for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Performance, Lean, Query

Description: Learn how to use Mongoose lean queries to skip document hydration and return plain JavaScript objects for faster read-only operations.

---

## Overview

By default, Mongoose hydrates query results into full Mongoose document instances with getters, virtuals, methods, and change tracking. For read-only operations where you only need plain data, `.lean()` skips this hydration and returns plain JavaScript objects - dramatically reducing memory and CPU overhead.

## Basic Lean Query

Add `.lean()` before executing any find query:

```javascript
const User = require('./models/User');

// Without lean: returns Mongoose Document instances
const users = await User.find({ active: true });

// With lean: returns plain JS objects
const leanUsers = await User.find({ active: true }).lean();

console.log(leanUsers[0] instanceof User); // false - plain object
console.log(leanUsers[0]._id.toString()); // ObjectId, not hydrated
```

## Performance Comparison

A benchmark with 10,000 documents:

```javascript
const { performance } = require('perf_hooks');

// Normal query
let t = performance.now();
await User.find({});
console.log('Hydrated:', performance.now() - t, 'ms');

// Lean query
t = performance.now();
await User.find({}).lean();
console.log('Lean:', performance.now() - t, 'ms');
// Lean is typically 2-5x faster and uses ~5x less memory
```

## Using Lean with Populate

Lean works with `.populate()`, but the populated documents are also plain objects:

```javascript
const orders = await Order.find({ status: 'pending' })
  .populate('customerId', 'name email')
  .lean();

// customerId is a plain object, not a Mongoose document
console.log(orders[0].customerId.name);
```

## Lean with the lean() Plugin

The `mongoose-lean-virtuals` plugin adds virtual fields to lean results:

```bash
npm install mongoose-lean-virtuals
```

```javascript
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

userSchema.plugin(mongooseLeanVirtuals);

const users = await User.find().lean({ virtuals: true });
console.log(users[0].fullName); // virtual field included
```

## When to Use Lean

```text
Use lean() for:
  - API responses (read-only serialization)
  - Data exports and reports
  - High-volume list endpoints
  - Background jobs processing many documents

Do NOT use lean() when:
  - Calling .save() on documents
  - Using document methods (doc.validateSync())
  - Needing change tracking (isModified())
  - Relying on getters or virtuals (unless using plugin)
```

## Lean with findOne and findById

```javascript
const user = await User.findById(id).lean();
if (!user) return res.status(404).send('Not found');
res.json(user); // serializes directly, no .toObject() needed
```

## Summary

Mongoose lean queries return plain JavaScript objects instead of Mongoose document instances, skipping hydration, change tracking, and getter computation. This makes them 2-5x faster for read-only operations. Use `.lean()` for API responses and data processing, and use `mongoose-lean-virtuals` if you need virtual fields in lean results. Avoid lean when you need to save, use document methods, or rely on Mongoose's full ODM functionality.
