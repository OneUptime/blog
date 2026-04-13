# How to Handle Schema Evolution in Microservices with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Evolution, Microservice, Migration, Versioning

Description: Learn strategies for evolving MongoDB schemas safely in microservices without downtime, using versioning, migrations, and the expand-contract pattern.

---

## The Challenge of Schema Evolution

In microservices, multiple service instances run simultaneously, meaning your MongoDB schema must support both old and new document formats during rolling deployments. Unlike SQL databases, MongoDB's flexible schema makes field-level changes easier but also more error-prone without discipline.

## Strategy 1 - Document Versioning

Add a `schemaVersion` field to every document so your application can handle multiple versions:

```javascript
// v1 document
{ _id: "user-1", schemaVersion: 1, name: "Alice", email: "alice@example.com" }

// v2 document - added phone field
{ _id: "user-2", schemaVersion: 2, name: "Bob", email: "bob@example.com", phone: "+1-555-0100" }
```

Read logic handles both versions:

```javascript
// userRepository.js
class UserRepository {
  constructor(db) {
    this.collection = db.collection('users');
  }

  async findById(id) {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return this._migrate(doc);
  }

  _migrate(doc) {
    switch (doc.schemaVersion) {
      case 1:
        return {
          ...doc,
          schemaVersion: 2,
          phone: null  // default value for new field
        };
      case 2:
        return doc;
      default:
        throw new Error(`Unknown schema version: ${doc.schemaVersion}`);
    }
  }

  async save(user) {
    const doc = { ...user, schemaVersion: 2 };
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
}
```

## Strategy 2 - Expand-Contract Pattern

The expand-contract pattern allows zero-downtime migrations across multiple deployments:

### Phase 1 - Expand (add new field, write both old and new)

```javascript
// During deployment phase 1: write both old and new fields
async function saveUser(user) {
  const doc = {
    ...user,
    // New field
    fullName: `${user.firstName} ${user.lastName}`,
    // Keep old fields for backward compatibility
    firstName: user.firstName,
    lastName: user.lastName
  };
  await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
}

// Reading: prefer new field, fall back to old
function readUser(doc) {
  return {
    ...doc,
    fullName: doc.fullName || `${doc.firstName} ${doc.lastName}`
  };
}
```

### Phase 2 - Migrate (backfill existing documents)

```javascript
// migration.js - run as a one-time job
async function migrateUsers(db) {
  const collection = db.collection('users');
  let processed = 0;

  const cursor = collection.find({
    fullName: { $exists: false },
    firstName: { $exists: true }
  });

  const BATCH_SIZE = 1000;
  let batch = [];

  for await (const doc of cursor) {
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            fullName: `${doc.firstName} ${doc.lastName}`,
            schemaVersion: 2
          }
        }
      }
    });

    if (batch.length === BATCH_SIZE) {
      await collection.bulkWrite(batch);
      processed += batch.length;
      console.log(`Migrated ${processed} documents`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await collection.bulkWrite(batch);
    processed += batch.length;
  }

  console.log(`Migration complete: ${processed} documents updated`);
}
```

### Phase 3 - Contract (remove old fields)

```javascript
// After all services are on v2, remove old fields
async function contractMigration(db) {
  await db.collection('users').updateMany(
    { firstName: { $exists: true } },
    { $unset: { firstName: '', lastName: '' } }
  );
}
```

## Strategy 3 - Schema Validation with Versioned JSON Schema

Use MongoDB's JSON Schema validation to enforce structure while allowing evolution:

```javascript
// Create collection with v2 schema
await db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'email', 'schemaVersion'],
      properties: {
        schemaVersion: { bsonType: 'number', minimum: 1 },
        email: { bsonType: 'string' },
        fullName: { bsonType: 'string' },
        // Old fields optional during migration
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' }
      }
    }
  },
  validationLevel: 'moderate',  // only validate inserted/updated docs
  validationAction: 'warn'      // warn instead of error during migration
});

// After migration, tighten validation
await db.command({
  collMod: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'email', 'schemaVersion', 'fullName'],
      properties: {
        _id: { bsonType: 'string' },
        schemaVersion: { bsonType: 'number', enum: [2] },
        email: { bsonType: 'string' },
        fullName: { bsonType: 'string' }
      },
      additionalProperties: false
    }
  },
  validationLevel: 'strict',
  validationAction: 'error'
});
```

## Strategy 4 - Event-Driven Schema Migration

In event-driven microservices, emit schema migration events:

```javascript
// schemaVersioningMiddleware.js
class SchemaVersioningMiddleware {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.CURRENT_VERSION = 3;
  }

  async onDocumentRead(doc) {
    if (doc.schemaVersion < this.CURRENT_VERSION) {
      // Emit event to trigger async migration
      await this.eventBus.publish('schema.migration.needed', {
        collectionName: 'users',
        documentId: doc._id,
        currentVersion: doc.schemaVersion,
        targetVersion: this.CURRENT_VERSION
      });
    }
    return this._applyMigrations(doc);
  }

  _applyMigrations(doc) {
    let current = { ...doc };
    while (current.schemaVersion < this.CURRENT_VERSION) {
      current = this._migrateOne(current);
    }
    return current;
  }

  _migrateOne(doc) {
    const migrations = {
      1: (d) => ({ ...d, schemaVersion: 2, phone: null }),
      2: (d) => ({ ...d, schemaVersion: 3, fullName: `${d.firstName} ${d.lastName}` })
    };
    return migrations[doc.schemaVersion](doc);
  }
}
```

## Tracking Migration State

```javascript
// migrationTracker.js
async function trackMigration(db, migrationName, fn) {
  const migrations = db.collection('schema_migrations');

  const existing = await migrations.findOne({ name: migrationName });
  if (existing && existing.status === 'completed') {
    console.log(`Skipping migration ${migrationName} - already completed`);
    return;
  }

  await migrations.updateOne(
    { name: migrationName },
    { $set: { name: migrationName, status: 'running', startedAt: new Date() } },
    { upsert: true }
  );

  try {
    await fn(db);
    await migrations.updateOne(
      { name: migrationName },
      { $set: { status: 'completed', completedAt: new Date() } }
    );
    console.log(`Migration ${migrationName} completed`);
  } catch (err) {
    await migrations.updateOne(
      { name: migrationName },
      { $set: { status: 'failed', error: err.message, failedAt: new Date() } }
    );
    throw err;
  }
}

// Usage
await trackMigration(db, '002_add_fullname_field', async (db) => {
  await migrateUsers(db);
});
```

## Summary

Handling schema evolution in MongoDB microservices requires a combination of document versioning, the expand-contract deployment pattern, and automated migration scripts. By adding `schemaVersion` fields, using lazy migrations during reads, and running background batch migrations, you can evolve schemas across rolling deployments without downtime. Always track migration state in a dedicated collection to ensure idempotent, resumable operations.
