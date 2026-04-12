# How to Use validationLevel (strict vs moderate) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Database, Configuration

Description: Learn the difference between MongoDB strict and moderate validationLevel settings and when to use each for rolling out schema validation on existing collections.

---

When you add schema validation to a MongoDB collection, `validationLevel` controls which documents are checked. The `strict` level validates every write operation; `moderate` only validates inserts and updates to documents that already satisfy the validator. Choosing the right level is essential when migrating existing collections with legacy data.

## validationLevel Values

```text
"off"      - No validation is performed
"strict"   - Validates all inserts and updates (default)
"moderate" - Validates inserts; only validates updates to documents that already pass validation
```

## Setting validationLevel

**When creating a new collection:**

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username"],
      properties: {
        email: { bsonType: "string" },
        username: { bsonType: "string" }
      }
    }
  },
  validationLevel: "strict"
});
```

**Updating validationLevel on an existing collection:**

```javascript
db.runCommand({
  collMod: "users",
  validationLevel: "moderate"
});
```

## strict Mode

In `strict` mode, MongoDB validates every insert and every update, regardless of whether the document being updated already satisfies the schema.

```javascript
// With strict validationLevel:

// Insert - validated (must pass schema)
db.users.insertOne({ username: "alice", email: "alice@example.com" }); // valid

// Update - validated (result must pass schema)
db.users.updateOne(
  { username: "alice" },
  { $unset: { email: "" } } // fails - email is required
);
```

## moderate Mode

In `moderate` mode, inserts are always validated. For updates, only documents that already satisfy the validator are re-validated after the update.

**This is useful for:** gradual schema enforcement when existing documents do not conform to the new schema.

```javascript
// Existing document that does NOT satisfy the validator (no email field)
// { _id: ObjectId("..."), username: "legacy_user" }

// In moderate mode - update is allowed because the existing doc fails validation
db.users.updateOne(
  { username: "legacy_user" },
  { $set: { lastLogin: new Date() } }
); // Succeeds in moderate mode, would fail in strict mode

// In strict mode - same update fails because the result lacks "email"
// MongoServerError: Document failed validation
```

## Practical Migration Workflow

When adding validation to an existing collection that may have non-conforming documents:

```javascript
// Step 1: Apply validator in moderate mode
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username"]
    }
  },
  validationLevel: "moderate"
});

// Step 2: Find and fix non-conforming documents
db.users.find({
  $or: [
    { email: { $exists: false } },
    { username: { $exists: false } }
  ]
}).forEach((doc) => {
  const fix = {};
  if (!doc.email) fix.email = "unknown@example.com";
  if (!doc.username) fix.username = "unknown_user";
  db.users.updateOne(
    { _id: doc._id },
    { $set: fix }
  );
});

// Step 3: Switch to strict once all docs are conforming
db.runCommand({
  collMod: "users",
  validationLevel: "strict"
});
```

## Checking Current validationLevel

```javascript
db.getCollectionInfos({ name: "users" })[0].options;
```

```text
{
  validator: { $jsonSchema: { ... } },
  validationLevel: "moderate",
  validationAction: "error"
}
```

## When to Use Each Level

| Level | Best For |
|---|---|
| `strict` | New collections, fully migrated existing collections |
| `moderate` | Rolling out validation on collections with legacy data |
| `off` | Temporarily disabling validation for bulk data migrations |

## Summary

`validationLevel: "strict"` enforces the schema on every write operation, while `moderate` only enforces the schema on inserts and on updates to documents that already conform. Use `moderate` as a stepping stone when migrating existing collections, fixing legacy data in batches, then switch to `strict` once all documents comply with the new schema.
