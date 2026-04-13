# How to Generate Sample Data for MongoDB Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testing, Sample Data, Development, Aggregation

Description: Learn how to generate sample data for MongoDB collections using $sample, scripting with random values, and tools like mgeneratejs for realistic test datasets.

---

Generating sample data in MongoDB serves two purposes: sampling existing data for analysis, and creating synthetic data for testing. MongoDB provides both a `$sample` aggregation stage for the former and scripting tools for the latter.

## Sampling Existing Data with $sample

`$sample` returns a random subset of documents from a collection:

```javascript
// Get 10 random documents
db.myCollection.aggregate([{ $sample: { size: 10 } }])
```

For large collections, MongoDB uses a pseudo-random cursor skip when the sample size is less than 5% of the collection, making it fast. For larger samples, it performs a collection scan.

```javascript
// Sample 100 documents and project specific fields for analysis
db.users.aggregate([
  { $sample: { size: 100 } },
  { $project: { name: 1, email: 1, plan: 1, _id: 0 } }
])
```

## Generating Synthetic Data in mongosh

The following script generates realistic e-commerce order data:

```javascript
// generate_orders.js
use testDB;

const products = ["Widget", "Gadget", "Doohickey", "Thingamajig", "Gizmo"];
const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const regions  = ["North", "South", "East", "West"];

function randomDate(daysBack) {
  return new Date(Date.now() - Math.random() * daysBack * 86400000);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BATCH_SIZE = 1000;
const TOTAL = 50000;

for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
  const batch = [];
  for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL; j++) {
    batch.push({
      orderId:   `ORD-${String(i + j + 1).padStart(6, "0")}`,
      product:   products[randomInt(0, products.length - 1)],
      quantity:  randomInt(1, 20),
      unitPrice: parseFloat((Math.random() * 100 + 5).toFixed(2)),
      status:    statuses[randomInt(0, statuses.length - 1)],
      region:    regions[randomInt(0, regions.length - 1)],
      createdAt: randomDate(365)
    });
  }
  db.orders.insertMany(batch, { ordered: false });
  print(`Inserted batch ending at ${i + BATCH_SIZE}`);
}
```

Batching with 1000 documents per `insertMany` provides optimal throughput.

## Using mgeneratejs for Declarative Data Generation

`mgeneratejs` lets you define a template and generates random documents:

```bash
npm install -g mgeneratejs
```

Create a template file `user_template.json`:

```json
{
  "name": { "$name": {} },
  "email": { "$email": {} },
  "age": { "$integer": { "min": 18, "max": 80 } },
  "plan": { "$pick": { "array": ["free", "pro", "enterprise"] } },
  "createdAt": { "$date": { "min": "2023-01-01", "max": "2024-12-31" } },
  "score": { "$floating": { "min": 0, "max": 100, "fixed": 2 } }
}
```

Generate and import:

```bash
mgeneratejs user_template.json -n 10000 | \
  mongoimport --db testDB --collection users
```

## Generating Time-Series Sample Data

For testing time-series workloads:

```javascript
// generate_timeseries.js
use testDB;

const sensors = ["sensor_001", "sensor_002", "sensor_003"];
const docs = [];
const start = new Date("2024-01-01");

sensors.forEach(sensorId => {
  for (let minuteOffset = 0; minuteOffset < 43200; minuteOffset += 5) {
    docs.push({
      sensorId,
      timestamp: new Date(start.getTime() + minuteOffset * 60000),
      temperature: parseFloat((20 + Math.random() * 10).toFixed(2)),
      humidity:    parseFloat((40 + Math.random() * 20).toFixed(2))
    });
  }
});

// Insert in batches
const BATCH = 2000;
for (let i = 0; i < docs.length; i += BATCH) {
  db.sensorData.insertMany(docs.slice(i, i + BATCH));
}
print(`Total inserted: ${docs.length}`);
```

## Verifying Generated Data Distribution

After generation, verify the data looks realistic:

```javascript
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Summary

Use `$sample` to extract random subsets from existing collections for analysis. Use mongosh batch scripting or mgeneratejs for generating large synthetic datasets. Always batch `insertMany` calls at 500-2000 documents per batch for optimal insert throughput, and verify data distributions after generation.
