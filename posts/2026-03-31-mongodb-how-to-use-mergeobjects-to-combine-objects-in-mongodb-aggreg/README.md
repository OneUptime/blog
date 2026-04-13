# How to Use $mergeObjects to Combine Objects in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $mergeObjects, Object, Document Merging

Description: Learn how to use $mergeObjects in MongoDB aggregation to combine multiple documents or objects into a single merged document with examples.

---

## Overview

`$mergeObjects` is a MongoDB aggregation operator that combines multiple documents into a single document. When fields exist in multiple input documents, the value from the last document wins. It is particularly useful in `$group` stages for merging partial documents and in `$project` stages for overlaying defaults or overrides.

## Basic $mergeObjects Syntax

```javascript
// Merge a fixed object with a document field
db.users.aggregate([
  {
    $project: {
      profile: {
        $mergeObjects: [
          { role: "user", active: true },
          "$settings"
        ]
      }
    }
  }
])
```

Later objects override earlier ones on key conflicts:

```javascript
db.demo.aggregate([
  {
    $project: {
      merged: {
        $mergeObjects: [
          { a: 1, b: 2 },
          { b: 99, c: 3 }
        ]
      }
    }
  }
])
// Result: { merged: { a: 1, b: 99, c: 3 } }
```

## $mergeObjects in $group as Accumulator

When used as an accumulator in `$group`, `$mergeObjects` merges documents from all grouped records:

```javascript
db.inventory.insertMany([
  { category: "electronics", item: "laptop", stock: 10 },
  { category: "electronics", item: "phone", stock: 25 },
  { category: "clothing", item: "shirt", stock: 100 }
])

db.inventory.aggregate([
  {
    $group: {
      _id: "$category",
      allItems: {
        $mergeObjects: { $arrayToObject: [["$item", "$stock"]] }
      }
    }
  }
])
```

A cleaner pattern - merge whole subdocuments:

```javascript
db.userPrefs.insertMany([
  { userId: 1, prefs: { theme: "dark", lang: "en" } },
  { userId: 1, prefs: { notifications: true } },
  { userId: 2, prefs: { theme: "light" } }
])

db.userPrefs.aggregate([
  {
    $group: {
      _id: "$userId",
      mergedPrefs: { $mergeObjects: "$prefs" }
    }
  }
])
// Result: { _id: 1, mergedPrefs: { theme: "dark", lang: "en", notifications: true } }
```

## Applying Default Values with $mergeObjects

Use `$mergeObjects` to apply defaults that get overridden by actual values:

```javascript
const defaultProfile = {
  role: "viewer",
  active: false,
  theme: "light",
  language: "en"
}

db.users.aggregate([
  {
    $project: {
      profile: {
        $mergeObjects: [defaultProfile, "$userSettings"]
      }
    }
  }
])
```

## Merging a Lookup Result

After a `$lookup`, merge the joined document fields into the parent:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerInfo"
    }
  },
  {
    $project: {
      enriched: {
        $mergeObjects: [
          "$$ROOT",
          { $arrayElemAt: ["$customerInfo", 0] }
        ]
      }
    }
  },
  { $replaceRoot: { newRoot: "$enriched" } }
])
```

## Handling Null Values

`$mergeObjects` ignores null inputs and skips them gracefully:

```javascript
db.profiles.aggregate([
  {
    $project: {
      combined: {
        $mergeObjects: [
          "$baseProfile",
          { $ifNull: ["$overrides", {}] },
          { updatedAt: new Date() }
        ]
      }
    }
  }
])
```

## Real-World Example - Merging Versioned Documents

```javascript
db.configs.insertMany([
  { service: "api", version: 1, settings: { timeout: 30, retries: 3 } },
  { service: "api", version: 2, settings: { timeout: 60, maxConnections: 10 } }
])

db.configs.aggregate([
  { $sort: { version: 1 } },
  {
    $group: {
      _id: "$service",
      mergedSettings: { $mergeObjects: "$settings" }
    }
  }
])
// Result: { _id: "api", mergedSettings: { timeout: 60, retries: 3, maxConnections: 10 } }
```

## Summary

`$mergeObjects` combines multiple documents into one, with later documents winning on key conflicts. As a `$project` expression it applies defaults or overlays, and as a `$group` accumulator it folds multiple documents from a group into a single merged result. It is commonly used for merging lookup results, applying default field values, and aggregating partial configuration documents.
