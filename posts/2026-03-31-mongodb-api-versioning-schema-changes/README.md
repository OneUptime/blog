# How to Handle API Versioning with MongoDB Schema Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, API, Schema, Versioning, Migration

Description: Learn strategies for managing API versioning alongside MongoDB schema changes without downtime or breaking existing clients.

---

## The Challenge of Versioning APIs with MongoDB

MongoDB's flexible schema is a double-edged sword: it makes it easy to add fields but can leave your API and data in inconsistent states as you evolve. When you release a v2 API with a new data shape, you need to handle both old and new documents gracefully.

## Common Versioning Strategies

There are three main approaches to API versioning:

- **URL versioning**: `/api/v1/users` and `/api/v2/users` - most explicit and easy to route
- **Header versioning**: `Accept: application/vnd.api+json;version=2` - clean URLs but harder to test
- **Query parameter versioning**: `/api/users?version=2` - simple but pollutes query strings

URL versioning is the most common and easiest to implement with MongoDB-backed APIs.

## Schema Versioning Pattern in MongoDB

Store a `schemaVersion` field on each document to track which version of the schema it uses:

```javascript
// Old document (v1)
{
    "_id": ObjectId("..."),
    "schemaVersion": 1,
    "name": "Jane Doe",
    "address": "123 Main St, Springfield"
}

// New document (v2)
{
    "_id": ObjectId("..."),
    "schemaVersion": 2,
    "name": "Jane Doe",
    "address": {
        "street": "123 Main St",
        "city": "Springfield",
        "zip": "62701"
    }
}
```

## Transform Layer for Multiple Versions

Create transform functions that convert documents to the shape expected by each API version:

```javascript
function toV1(doc) {
    if (doc.schemaVersion >= 2 && typeof doc.address === 'object') {
        return {
            ...doc,
            address: `${doc.address.street}, ${doc.address.city}`
        };
    }
    return doc;
}

function toV2(doc) {
    if (doc.schemaVersion === 1 && typeof doc.address === 'string') {
        const parts = doc.address.split(', ');
        return {
            ...doc,
            schemaVersion: 2,
            address: {
                street: parts[0] || '',
                city: parts[1] || ''
            }
        };
    }
    return doc;
}
```

## Routing to Version-Specific Controllers

```javascript
const express = require('express');
const app = express();

const v1Router = require('./routes/v1/users');
const v2Router = require('./routes/v2/users');

app.use('/api/v1/users', v1Router);
app.use('/api/v2/users', v2Router);
```

In the v1 route handler:

```javascript
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { toV1 } = require('../../transforms/user');

router.get('/', async (req, res) => {
    const users = await User.find().lean();
    res.json(users.map(toV1));
});

module.exports = router;
```

## Lazy Migration vs. Bulk Migration

**Lazy migration** updates each document on first access - good for gradual rollouts:

```javascript
async function getUserWithMigration(id) {
    const user = await User.findById(id);
    if (user.schemaVersion === 1) {
        const migrated = migrateToV2(user.toObject());
        await User.updateOne(
            { _id: user._id },
            { $set: { address: migrated.address, schemaVersion: 2 } }
        );
        return migrated;
    }
    return user;
}
```

**Bulk migration** uses a background script to update all old documents at once:

```javascript
async function migrateAllUsersToV2() {
    const cursor = User.find({ schemaVersion: { $lt: 2 } }).cursor();
    let count = 0;

    for await (const user of cursor) {
        const migrated = migrateToV2(user.toObject());
        await User.updateOne(
            { _id: user._id },
            { $set: { address: migrated.address, schemaVersion: 2 } }
        );
        count++;
        if (count % 100 === 0) {
            console.log(`Migrated ${count} users`);
        }
    }

    console.log(`Migration complete: ${count} users updated`);
}
```

## Creating Indexes for New Schema Fields

When adding new fields in v2, create indexes before migrating data:

```javascript
// Create index on new field before migration
await User.collection.createIndex({ 'address.city': 1 });
// Then run migration
await migrateAllUsersToV2();
```

## Deprecation and Sunset Headers

Signal to clients when a version will be removed:

```javascript
app.use('/api/v1', (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', 'Thu, 31 Dec 2026 23:59:59 GMT');
    res.set('Link', '</api/v2>; rel="successor-version"');
    next();
});
```

## Summary

Managing API versioning with MongoDB requires a combination of schema versioning in documents, transform layers per API version, and a migration strategy for existing data. Using the `schemaVersion` field pattern gives you full control over when and how documents are upgraded, while URL versioning provides clear routing between old and new API contracts.
