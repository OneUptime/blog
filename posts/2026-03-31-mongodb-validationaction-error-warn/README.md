# How to Use validationAction (error vs warn) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Database, Configuration

Description: Learn the difference between MongoDB error and warn validationAction settings, and how to use warn mode to audit schema violations without rejecting writes.

---

MongoDB's `validationAction` controls what happens when a document fails schema validation. With `error`, MongoDB rejects the write and returns an error to the client. With `warn`, MongoDB allows the write but logs a warning. Choosing the right action depends on your validation rollout strategy.

## validationAction Values

```text
"error" - Reject the write operation (default)
"warn"  - Allow the write but log a warning to the MongoDB log
```

## Setting validationAction

**At collection creation:**

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "total"],
      properties: {
        customerId: { bsonType: "string" },
        total: { bsonType: "double", minimum: 0 }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

**Changing action on an existing collection:**

```javascript
db.runCommand({
  collMod: "orders",
  validationAction: "warn"
});
```

## error Mode

In `error` mode (the default), any write that fails validation is rejected immediately. The driver receives a `MongoServerError`:

```javascript
// Missing required "total" field
db.orders.insertOne({ customerId: "cust_001" });
```

Error:

```text
MongoServerError: Document failed validation
{
  failingDocumentId: ObjectId("..."),
  details: {
    operatorName: "$jsonSchema",
    schemaRulesNotSatisfied: [
      { operatorName: "required", missingProperties: ["total"] }
    ]
  }
}
```

## warn Mode

In `warn` mode, the write succeeds and a warning is written to the MongoDB server log:

```javascript
// Set to warn mode
db.runCommand({ collMod: "orders", validationAction: "warn" });

// This now succeeds even without "total"
db.orders.insertOne({ customerId: "cust_001" });
// Write succeeds, warning logged server-side
```

Log entry (in MongoDB log):

```text
{"s":"W","c":"STORAGE","id":20294,"ctx":"conn1",
"msg":"Document would fail validation","attr":{
  "namespace":"mydb.orders",
  "document":{"_id":{"$oid":"..."},"customerId":"cust_001"}}}
```

## Practical Use Cases for warn Mode

**1. Auditing before enforcing rules**

Before switching to `error`, use `warn` to discover which application code paths generate non-conforming documents:

```javascript
// Phase 1: Add validator in warn mode
db.runCommand({
  collMod: "users",
  validator: { $jsonSchema: { ... } },
  validationAction: "warn"
});

// Monitor logs for warnings over 1-2 weeks
// Phase 2: Fix application code
// Phase 3: Switch to error mode
db.runCommand({ collMod: "users", validationAction: "error" });
```

**2. Parsing MongoDB log warnings**

Parse the MongoDB log for validation warnings:

```bash
grep "Document would fail validation" /var/log/mongodb/mongod.log | \
  jq '.attr.document' | head -20
```

**3. Tracking violations in application code**

In `warn` mode, there are no errors for your app to catch - monitor server logs or a log aggregation tool (like OneUptime) for `"Document would fail validation"` events.

## Checking Current Settings

```javascript
db.getCollectionInfos({ name: "orders" })[0].options;
```

```text
{
  validator: { ... },
  validationLevel: "strict",
  validationAction: "warn"
}
```

## Recommended Rollout Strategy

| Phase | validationAction | validationLevel | Purpose |
|---|---|---|---|
| 1 | `warn` | `moderate` | Audit without impact |
| 2 | `warn` | `strict` | Audit all writes |
| 3 | `error` | `strict` | Full enforcement |

## Summary

`validationAction: "error"` rejects writes that fail validation, which is the right choice for enforcing data integrity in production. `validationAction: "warn"` allows all writes but logs violations, making it ideal for safely auditing a new schema before enforcing it. Use the `warn` phase to discover and fix all non-conforming write paths before switching to `error`.
