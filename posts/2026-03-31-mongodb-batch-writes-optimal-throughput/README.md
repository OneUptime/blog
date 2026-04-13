# How to Batch Writes for Optimal Throughput in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Write, Performance, Throughput, Insert

Description: Learn how to use MongoDB bulk write operations to maximize write throughput by batching inserts, updates, and deletes efficiently.

---

## Why Batch Writes Matter

Sending individual write operations one at a time adds network round-trip overhead for every document. For workloads that insert or update thousands of documents, this overhead dominates. MongoDB's `bulkWrite` and `insertMany` operations send multiple operations in a single network request, dramatically improving throughput.

## Using insertMany for Bulk Inserts

The simplest way to batch inserts is `insertMany`:

```javascript
const { MongoClient } = require('mongodb');

async function insertBatch(collection, documents) {
    const result = await collection.insertMany(documents, {
        ordered: false // Continue even if some documents fail
    });
    console.log(`Inserted ${result.insertedCount} documents`);
    return result;
}

// Generate sample data
const docs = Array.from({ length: 10000 }, (_, i) => ({
    userId: `user_${i}`,
    action: 'page_view',
    timestamp: new Date(),
    metadata: { page: `/page/${i % 100}` }
}));

// Insert in chunks of 500
const BATCH_SIZE = 500;
for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await insertBatch(collection, batch);
}
```

## Using bulkWrite for Mixed Operations

When you have a mix of inserts, updates, and deletes, use `bulkWrite`:

```javascript
async function processBatch(collection, operations) {
    const bulkOps = operations.map(op => {
        if (op.type === 'insert') {
            return { insertOne: { document: op.data } };
        } else if (op.type === 'upsert') {
            return {
                updateOne: {
                    filter: { _id: op.id },
                    update: { $set: op.data },
                    upsert: true
                }
            };
        } else if (op.type === 'delete') {
            return { deleteOne: { filter: { _id: op.id } } };
        }
    }).filter(Boolean);

    if (bulkOps.length === 0) return;

    const result = await collection.bulkWrite(bulkOps, { ordered: false });
    return result;
}
```

## Optimal Batch Size

Batch size affects both throughput and memory. Too small means too many round trips; too large increases memory pressure and timeout risk:

```javascript
const OPTIMAL_BATCH_SIZE = 1000; // Good default for most workloads

async function writeInBatches(collection, documents, batchSize = OPTIMAL_BATCH_SIZE) {
    let totalInserted = 0;
    const errors = [];

    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        try {
            const result = await collection.insertMany(batch, { ordered: false });
            totalInserted += result.insertedCount;
        } catch (err) {
            if (err.code === 11000) {
                // Handle duplicate key errors from ordered: false
                totalInserted += err.result?.insertedCount || 0;
                errors.push({ batch: i / batchSize, count: err.writeErrors?.length });
            } else {
                throw err;
            }
        }
    }

    return { totalInserted, errors };
}
```

## Using Write Concern for Performance vs. Durability

Write concern controls when MongoDB acknowledges a write. For maximum throughput in non-critical scenarios:

```javascript
// Fire-and-forget: no acknowledgment (fastest, least durable)
await collection.insertMany(docs, {
    writeConcern: { w: 0 }
});

// Default: acknowledged by primary (balanced)
await collection.insertMany(docs, {
    writeConcern: { w: 1 }
});

// Majority: acknowledged by majority of replica set (slowest, most durable)
await collection.insertMany(docs, {
    writeConcern: { w: 'majority' }
});
```

## Ordered vs. Unordered Batches

`ordered: true` stops on the first error. `ordered: false` continues and reports all errors at the end, which is faster for independent documents:

```javascript
// ordered: false maximizes throughput for independent documents
try {
    const result = await collection.bulkWrite(
        operations,
        { ordered: false, writeConcern: { w: 1 } }
    );

    console.log({
        inserted: result.insertedCount,
        updated: result.modifiedCount,
        deleted: result.deletedCount,
        errors: 0
    });
} catch (err) {
    if (err.result) {
        console.log({
            inserted: err.result.insertedCount,
            updated: err.result.modifiedCount,
            deleted: err.result.deletedCount,
            errors: err.writeErrors?.length || 0
        });
    } else {
        throw err;
    }
}
```

## Monitoring Batch Write Throughput

Use `mongostat` to watch write rates during batch operations:

```bash
mongostat --uri="mongodb://localhost:27017" 1
```

Look at the `insert` column. A well-optimized batch with `ordered: false` and batch size of 1000 should achieve several thousand inserts per second on typical hardware.

## Summary

Batching writes with `insertMany` or `bulkWrite` using `ordered: false` is the most effective way to maximize MongoDB write throughput. Choose a batch size between 500 and 2000 documents based on document size and available memory. Adjust write concern to match your durability requirements, and always handle partial failures when using unordered batches.
