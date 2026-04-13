# How to Handle Schema Evolution Without Downtime in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Migration, Zero Downtime, Document Model

Description: Learn strategies for evolving your MongoDB schema safely without taking downtime, including lazy migration, versioning, and additive change patterns.

---

## The Challenge of Schema Evolution

Unlike relational databases, MongoDB does not enforce a schema at the storage level. This flexibility is powerful, but it means your application code becomes responsible for handling documents in multiple schema versions simultaneously during a migration.

## Additive Changes - The Safest Path

Adding new optional fields to documents is always safe. Deploy code that writes the new field and reads it if present, then backfill existing documents in the background.

```javascript
// New code handles both old and new documents
function getUserDisplayName(user) {
  return user.displayName || `${user.firstName} ${user.lastName}`;
}
```

Backfill with a batched update to avoid locking:

```javascript
const batchSize = 1000;
let processed = 0;
while (true) {
  const docs = await db.users.find(
    { displayName: { $exists: false } }
  ).limit(batchSize).toArray();

  if (docs.length === 0) break;

  const ids = docs.map(d => d._id);
  const result = await db.users.updateMany(
    { _id: { $in: ids } },
    [{ $set: { displayName: { $concat: ["$firstName", " ", "$lastName"] } } }]
  );
  processed += result.modifiedCount;
}
console.log(`Backfilled ${processed} documents`);
```

## Schema Versioning

Track schema versions explicitly so your application can handle multiple document shapes:

```javascript
{
  _id: ObjectId(),
  schemaVersion: 2,
  email: "user@example.com",
  // v2 fields
  preferences: { theme: "dark", notifications: true }
}
```

```javascript
function transformUser(doc) {
  if (doc.schemaVersion === 1) {
    return {
      ...doc,
      schemaVersion: 2,
      preferences: { theme: "light", notifications: true }
    };
  }
  return doc;
}
```

## Rename Fields Without Downtime

Renaming a field requires a three-phase deploy. In phase one, write both old and new field names. In phase two, migrate data. In phase three, stop writing the old field name.

```javascript
// Phase 2: Migrate existing data to new field name
db.users.updateMany(
  { newFieldName: { $exists: false } },
  [{ $set: { newFieldName: "$oldFieldName" } }]
);

// Phase 3: Remove old field after all code reads new field
db.users.updateMany(
  { oldFieldName: { $exists: true } },
  { $unset: { oldFieldName: "" } }
);
```

## Removing Fields

Never remove a field in the same deploy that stops writing it. Deploy the code removal first, then unset the field from documents after the deploy stabilizes.

```javascript
db.collection.updateMany(
  { deprecatedField: { $exists: true } },
  { $unset: { deprecatedField: "" } }
);
```

## Using Schema Validation During Migration

MongoDB's schema validation can enforce the new shape while allowing the old shape via `$or`:

```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $or: [
      { schemaVersion: { $eq: 1 } },
      {
        schemaVersion: { $eq: 2 },
        preferences: { $type: "object" }
      }
    ]
  },
  validationLevel: "moderate"
});
```

## Summary

MongoDB schema evolution without downtime relies on deploying backward-compatible code before migrating data. Use additive changes whenever possible, track schema versions explicitly, and apply rename or removal changes across multiple sequential deployments. Batched background updates keep migrations from impacting production performance.
