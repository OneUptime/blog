# How to Work with MinKey and MaxKey in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MinKey, MaxKey, BSON

Description: Understand MongoDB's special MinKey and MaxKey BSON types, how they compare against all other values, and their practical uses in sharding and range queries.

---

## What Are MinKey and MaxKey

`MinKey` and `MaxKey` are special BSON sentinel values that represent the absolute minimum and maximum values in MongoDB's BSON comparison order. `MinKey` compares less than every other BSON value, and `MaxKey` compares greater than every other value, including `null`, arrays, objects, and strings.

## BSON Comparison Order

MongoDB sorts values of different types according to a defined order:

```text
MinKey < Null < Numbers < Symbol/String < Object < Array < BinData < ObjectId < Boolean < Date < Timestamp < RegExp < MaxKey
```

## Creating MinKey and MaxKey in mongosh

```javascript
const min = MinKey();
const max = MaxKey();

print(min); // MinKey()
print(max); // MaxKey()
```

## Practical Use in Zone Sharding

`MinKey` and `MaxKey` are most commonly used in zone sharding to cover all possible values of a shard key:

```javascript
// Route all documents with region "US" to US shards
sh.updateZoneKeyRange(
  "mydb.orders",
  { region: "US", _id: MinKey() },
  { region: "US", _id: MaxKey() },
  "US-Zone"
);

// Route everything else to the global shard
sh.updateZoneKeyRange(
  "mydb.orders",
  { region: MinKey() },
  { region: MaxKey() },
  "Global"
);
```

## Range Queries Covering All Values

You can use MinKey and MaxKey to construct range queries that include all possible values of a field regardless of type:

```javascript
// Find all documents where 'score' has any value (including null and non-numbers)
db.results.find({ score: { $gte: MinKey(), $lte: MaxKey() } });
```

This is equivalent to checking existence but also handles null and mixed types.

## Querying for MinKey and MaxKey Values

```javascript
// Find documents where a field is explicitly set to MinKey
db.config.find({ threshold: MinKey() });

// Find documents with MaxKey
db.config.find({ threshold: MaxKey() });

// Using $type operator
db.config.find({ threshold: { $type: "minKey" } });
db.config.find({ threshold: { $type: "maxKey" } });
```

## Storing MinKey and MaxKey in Documents

While uncommon in application data, they can serve as sentinels in configuration documents:

```javascript
db.indexRanges.insertOne({
  rangeName: "all-users",
  lowerBound: MinKey(),
  upperBound: MaxKey(),
  description: "Covers the full shard key range"
});
```

## In Node.js

```javascript
const { MinKey, MaxKey } = require("bson");

await collection.insertOne({
  rangeName: "full-range",
  lower: new MinKey(),
  upper: new MaxKey()
});

// Range query using MinKey/MaxKey
const docs = await collection.find({
  value: { $gte: new MinKey(), $lte: new MaxKey() }
}).toArray();
```

## Summary

`MinKey` and `MaxKey` are BSON sentinel values that compare below and above all other values in MongoDB's type comparison order. Their primary practical use is defining complete shard key ranges in zone sharding configurations. They also appear in range queries that must cover all possible BSON types and as sentinels in configuration documents.
