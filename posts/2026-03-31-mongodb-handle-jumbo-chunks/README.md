# How to Handle Jumbo Chunks in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Jumbo Chunk, Administration, Database

Description: Learn what jumbo chunks are in MongoDB, why they form, how to detect them, and the steps to resolve them including manual splits and shard key redesign.

---

A **jumbo chunk** is a MongoDB chunk that has grown beyond the configured maximum chunk size (default 128 MB) and cannot be split further because all documents in the chunk share the same shard key value. Jumbo chunks block the balancer and can cause severe data imbalance.

## Why Jumbo Chunks Form

Jumbo chunks form when a shard key has **low cardinality** at a specific value - many documents share the same key, so they all land in the same chunk:

```text
Shard key: { category: 1 }

"electronics" has 5 million documents
"books" has 200 documents

-> All "electronics" documents form one unjumpable chunk
```

Also caused by a monotonically increasing key where all new inserts go to the last chunk faster than the balancer can split it.

## Detect Jumbo Chunks

```javascript
use config
db.chunks.find({ jumbo: true })
```

Or use `sh.status()` which marks jumbo chunks:

```text
{ "category" : "electronics" } -->> { "category" : { "$maxKey" : 1 } } on : shard1 jumbo
```

Count jumbo chunks per collection:

```javascript
db.chunks.aggregate([
  { $match: { jumbo: true } },
  { $group: { _id: "$ns", count: { $sum: 1 } } }
])
```

## Option 1 - Clear the Jumbo Flag (Temporary Fix)

If the chunk is falsely marked as jumbo (the data has since been deleted), clear the flag:

```javascript
use config
db.chunks.updateOne(
  { ns: "myapp.products", min: { category: "electronics" } },
  { $unset: { jumbo: "" } }
)
```

The balancer will attempt to split and migrate the chunk again.

## Option 2 - Manually Split the Chunk

If the chunk has more than one distinct key value, you can split it manually:

```javascript
// Split at a known midpoint value within the chunk range
sh.splitAt("myapp.products", { category: "furniture" })
```

To find a good split point:

```javascript
db.products.find({ category: "electronics" })
  .skip(Math.floor(db.products.countDocuments({ category: "electronics" }) / 2))
  .limit(1)
  .toArray()
```

If the chunk has only a single shard key value (true jumbo), it cannot be split further.

## Option 3 - Move the Jumbo Chunk Manually

Even with the jumbo flag, you can manually move the chunk to balance load:

```javascript
sh.moveChunk(
  "myapp.products",
  { category: "electronics" },
  "shard2"
)
```

This does not remove the jumbo flag but redistributes the data.

## Option 4 - Refactor the Shard Key (Long-Term Fix)

The only permanent fix for a true low-cardinality jumbo chunk is to change the shard key. MongoDB 5.0+ supports resharding:

```javascript
// MongoDB 5.0+ resharding
db.adminCommand({
  reshardCollection: "myapp.products",
  key: { category: 1, _id: 1 }  // compound key with higher cardinality
})
```

For older versions, the process requires creating a new sharded collection, copying data, and swapping:

```bash
# Export from old collection
mongoexport --db myapp --collection products --out products_backup.json

# Import to new sharded collection
mongoimport --db myapp --collection products_v2 --file products_backup.json
```

## Prevent Jumbo Chunks

```text
1. Choose high-cardinality shard keys
2. Use compound keys (e.g., { category: 1, _id: 1 }) instead of single low-cardinality fields
3. Use hashed shard keys for even distribution
4. Monitor chunk sizes and jumbo flags regularly
```

## Summary

Jumbo chunks form when shard key cardinality is too low - many documents share the same shard key value. Detect them via `config.chunks` queries or `sh.status()`. For temporary relief, clear the jumbo flag or manually move the chunk. For a permanent fix, choose a higher-cardinality compound shard key. In MongoDB 5.0+, use resharding to change the shard key on a live collection without rebuilding from scratch.

