# How to Validate Data Integrity After Migration in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Migration, Data Integrity, Validation, Operation

Description: Learn how to validate data integrity after a MongoDB migration by comparing document counts, checksums, and field-level samples between source and target databases.

---

## Why Validation Matters After Migration

A migration can silently lose documents, corrupt fields, or mis-convert data types. Validation before cutting over production traffic prevents serving incorrect data to users. A complete validation strategy checks document counts, schema consistency, and sample-level data equivalence.

## Step 1: Compare Document Counts

The first and fastest check is comparing total document counts across all collections:

```javascript
// Run on source
const sourceStats = {};
db.getCollectionNames().forEach(name => {
  sourceStats[name] = db[name].estimatedDocumentCount();
  print(name, sourceStats[name]);
});

// Run on target - compare results
db.getCollectionNames().forEach(name => {
  const targetCount = db[name].estimatedDocumentCount();
  print(name, "target:", targetCount, "matches:", targetCount === sourceStats[name]);
});
```

## Step 2: Validate Index Recreation

Verify all indexes were created on the target:

```javascript
// On source
const sourceIndexes = {};
db.getCollectionNames().forEach(name => {
  sourceIndexes[name] = db[name].getIndexes().map(i => i.name).sort();
});

// On target - compare
db.getCollectionNames().forEach(name => {
  const targetIndexes = db[name].getIndexes().map(i => i.name).sort();
  const missing = sourceIndexes[name].filter(i => !targetIndexes.includes(i));
  if (missing.length > 0) print("Missing indexes on", name + ":", missing);
});
```

## Step 3: Sample Document Comparison

Check that a random sample of documents transferred correctly:

```javascript
// Get 100 random document IDs from source
const sampleIds = db.orders.aggregate([
  { $sample: { size: 100 } },
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);

// Fetch from both source and target, compare
const sourceDoc = sourceDb.orders.findOne({ _id: sampleIds[0] });
const targetDoc = targetDb.orders.findOne({ _id: sampleIds[0] });

// Deep compare (simplified)
const sourceJson = JSON.stringify(sourceDoc);
const targetJson = JSON.stringify(targetDoc);
if (sourceJson !== targetJson) {
  print("MISMATCH on", sampleIds[0]);
  print("Source:", sourceJson);
  print("Target:", targetJson);
}
```

## Step 4: Schema Validation Checks

After migration, verify that required fields are present:

```javascript
// Check for documents missing required fields
const missingStatus = db.orders.countDocuments({ status: { $exists: false } });
const missingCustomer = db.orders.countDocuments({ customerId: { $exists: false } });
print("Orders missing status:     ", missingStatus);
print("Orders missing customerId: ", missingCustomer);
```

Apply a MongoDB schema validator to catch any violations:

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "status", "createdAt"],
      properties: {
        status: { bsonType: "string", enum: ["pending","paid","shipped","delivered"] },
        customerId: { bsonType: "objectId" },
        total: { bsonType: "double" }
      }
    }
  },
  validationAction: "warn" // warn only, don't block existing data
});
```

## Step 5: Aggregation-Level Consistency

For financial data, compare aggregated totals:

```javascript
// Source
const sourceTotal = db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
]).next();

// Target should match
const targetTotal = db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
]).next();

print("Count match:", sourceTotal.count === targetTotal.count);
print("Total match:", Math.abs(sourceTotal.total - targetTotal.total) < 0.01);
```

## Summary

Validating data integrity after a MongoDB migration requires checking document counts per collection, verifying index recreation, sampling individual documents for field-level equivalence, applying schema validators to surface missing required fields, and comparing aggregated financial totals. Run validation in stages - counts first (fast), then samples (thorough) - and switch production traffic only after all checks pass.
