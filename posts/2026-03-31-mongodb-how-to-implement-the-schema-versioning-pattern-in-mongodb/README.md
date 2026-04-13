# How to Implement the Schema Versioning Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Schema Versioning, Migration, Schema Design

Description: Learn how to implement the schema versioning pattern in MongoDB to manage evolving document schemas without downtime, using a version field to handle multiple schema versions simultaneously.

---

## What Is the Schema Versioning Pattern?

The schema versioning pattern adds a `schemaVersion` field to each document so your application can handle documents with different schema structures simultaneously. This eliminates the need for big-bang migrations that update every document before deploying new code.

## The Problem: Schema Evolution Without Versioning

When you change your document structure without versioning, old documents break new code and vice versa. A typical problematic migration:

```javascript
// Old document structure (version 1)
{
  _id: ObjectId("u001"),
  name: "Alice Smith",
  phone: "555-1234"        // Single phone field
}

// After adding multiple phones - old documents have no "phones" array
// New code expecting "phones" breaks on old documents
{
  _id: ObjectId("u002"),
  name: "Bob Jones",
  phones: [
    { type: "mobile", number: "555-5678" }
  ]
}
```

## The Solution: Add schemaVersion

Mark every document with a `schemaVersion` field and handle each version in application code:

```javascript
// Version 1 document (original)
{
  _id: ObjectId("u001"),
  schemaVersion: 1,
  name: "Alice Smith",
  phone: "555-1234"
}

// Version 2 document (new structure)
{
  _id: ObjectId("u002"),
  schemaVersion: 2,
  name: "Bob Jones",
  phones: [
    { type: "mobile", number: "555-5678" },
    { type: "home", number: "555-9012" }
  ]
}
```

## Application-Level Version Handling

The application reads the `schemaVersion` field and normalizes the document to the current shape:

```javascript
function normalizeUser(doc) {
  switch (doc.schemaVersion) {
    case 1:
      // Convert old single phone to phones array
      const { phone, ...rest } = doc;
      return {
        ...rest,
        schemaVersion: 2,
        phones: phone ? [{ type: "mobile", number: phone }] : []
      };
    case 2:
      // Already current version
      return doc;
    default:
      throw new Error(`Unknown schema version: ${doc.schemaVersion}`);
  }
}

// Usage
const rawUser = db.users.findOne({ _id: ObjectId("u001") });
const user = normalizeUser(rawUser);
console.log(user.phones); // [{ type: "mobile", number: "555-1234" }]
```

## Lazy Migration: Update on Read

Optionally, write the normalized document back on read to gradually migrate the collection:

```javascript
async function getUser(userId) {
  const raw = await db.users.findOne({ _id: userId });
  const normalized = normalizeUser(raw);

  // If schema was upgraded, persist the new version
  if (normalized.schemaVersion !== raw.schemaVersion) {
    await db.users.replaceOne({ _id: userId }, normalized);
  }

  return normalized;
}
```

Over time, all documents will be migrated to the latest version through normal read traffic.

## Background Migration Script

For a more proactive migration, run a background script during low-traffic periods:

```javascript
// Migrate all version 1 documents to version 2
async function migrateV1toV2() {
  const cursor = db.users.find({ schemaVersion: 1 });
  let migrated = 0;

  for await (const doc of cursor) {
    const normalized = normalizeUser(doc);
    await db.users.replaceOne({ _id: doc._id }, normalized);
    migrated++;
    if (migrated % 1000 === 0) {
      print(`Migrated ${migrated} documents...`);
    }
  }

  print(`Migration complete. Total: ${migrated} documents.`);
}

migrateV1toV2();
```

## Index on schemaVersion

Index `schemaVersion` to quickly find documents needing migration:

```javascript
db.users.createIndex({ schemaVersion: 1 })

// Count documents still on old versions
db.users.countDocuments({ schemaVersion: { $lt: 2 } })
```

## Multiple Version Transitions

Handle more than two versions with a migration chain:

```javascript
function normalizeUser(doc) {
  let current = { ...doc };

  // Apply migrations in order
  if (!current.schemaVersion || current.schemaVersion < 1) {
    // Add schemaVersion to legacy documents that have none
    current.schemaVersion = 1;
  }

  if (current.schemaVersion === 1) {
    current.phones = current.phone
      ? [{ type: "mobile", number: current.phone }]
      : [];
    delete current.phone;
    current.schemaVersion = 2;
  }

  if (current.schemaVersion === 2) {
    // V2 to V3: add verified field
    current.phones = current.phones.map(p => ({ ...p, verified: false }));
    current.schemaVersion = 3;
  }

  return current;
}
```

## Deploying New Schema Versions Safely

Follow this deployment sequence:
1. Deploy new code that reads both old and new schema versions
2. Write new documents with the new schema version
3. Run background migration to update existing documents
4. After migration is complete, remove handling for old versions

## Summary

The schema versioning pattern adds a `schemaVersion` field to documents, enabling your application to handle multiple document structures simultaneously without downtime migrations. Normalize documents in application code based on their version, optionally write updated documents back during reads for lazy migration, and run background scripts to proactively update old documents. This pattern decouples schema evolution from deployment, enabling zero-downtime schema changes in MongoDB.
