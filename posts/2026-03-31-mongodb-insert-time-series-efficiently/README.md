# How to Insert Time Series Data Efficiently in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Insert, Performance, Bulk Write

Description: Maximize MongoDB time series insert throughput with batch inserts, ordered write control, and client-side buffering strategies for high-frequency sensor data.

---

Time series workloads often involve high write rates from many sensors, devices, or application metrics. MongoDB time series collections are optimized for sequential writes, but the way you insert data significantly affects throughput, latency, and storage efficiency.

## Why Batch Inserts Matter

Each individual `insertOne` call has network round-trip overhead. Batching documents into a single `insertMany` call amortizes that overhead:

```javascript
// Inefficient: one round trip per document
for (const reading of readings) {
  await collection.insertOne(reading);
}

// Efficient: one round trip for the entire batch
await collection.insertMany(readings, { ordered: false });
```

## Recommended Insert Pattern

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const tsCollection = client.db("iot").collection("sensorReadings");

const BATCH_SIZE = 500;
const buffer = [];

async function flushBuffer() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, BATCH_SIZE);
  await tsCollection.insertMany(batch, { ordered: false });
}

function onSensorReading(reading) {
  buffer.push({
    timestamp: new Date(),
    metadata: {
      sensorId: reading.sensorId,
      location: reading.location
    },
    temperature: reading.temperature,
    humidity: reading.humidity
  });

  if (buffer.length >= BATCH_SIZE) {
    flushBuffer().catch(console.error);
  }
}

// Flush remaining data every second
setInterval(flushBuffer, 1000);
```

## Using `ordered: false` for Higher Throughput

With `ordered: true` (the default), MongoDB stops on the first error. With `ordered: false`, MongoDB inserts all valid documents and reports errors at the end. For time series data where duplicate-key errors are unlikely, `ordered: false` allows parallel processing of the batch:

```javascript
const result = await tsCollection.insertMany(docs, { ordered: false });
console.log(`Inserted: ${result.insertedCount}`);
```

## Inserting from Python with pymongo

```python
from pymongo import MongoClient
from datetime import datetime, timezone
import os

client = MongoClient(os.environ["MONGODB_URI"])
ts_coll = client["iot"]["sensorReadings"]

def build_document(sensor_id, location, temp, humidity):
    return {
        "timestamp": datetime.now(timezone.utc),
        "metadata": {"sensorId": sensor_id, "location": location},
        "temperature": temp,
        "humidity": humidity
    }

batch = [build_document(f"sensor-{i}", "plant-a", 22.5 + i * 0.1, 50 + i) for i in range(500)]
result = ts_coll.insert_many(batch, ordered=False)
print(f"Inserted {len(result.inserted_ids)} documents")
```

## Sort by Timestamp and MetaField Before Inserting

MongoDB stores time series data in internal bucket documents. Inserting measurements in approximately chronological order within the same metaField value maximizes bucket fill efficiency:

```javascript
// Sort by (metaField, timestamp) before inserting for best compression
const sorted = readings.sort((a, b) => {
  if (a.metadata.sensorId < b.metadata.sensorId) return -1;
  if (a.metadata.sensorId > b.metadata.sensorId) return 1;
  return a.timestamp - b.timestamp;
});

await tsCollection.insertMany(sorted, { ordered: false });
```

## Choosing the Right Batch Size

| Write Rate | Recommended Batch Size |
|------------|------------------------|
| < 1,000/s | 100-200 |
| 1,000-10,000/s | 500-1,000 |
| > 10,000/s | 1,000-5,000 + sharding |

Batch sizes above 100,000 documents per call are not recommended as they increase client and server memory pressure. While the MongoDB driver automatically splits large batches into multiple wire protocol messages, very large batches still consume significant memory during serialization.

## Avoiding Backfill Performance Issues

Inserting historical (out-of-order) data can cause MongoDB to create many small buckets instead of filling existing ones. For large backfill jobs:

```javascript
// Increase the bucket time span for the duration of the backfill
// to allow more out-of-order measurements into each bucket
db.runCommand({
  collMod: "sensorReadings",
  timeseries: {
    bucketMaxSpanSeconds: 3600
  }
});
```

After the backfill, the compact command can consolidate small buckets:

```javascript
db.runCommand({ compact: "sensorReadings" });
```

## Summary

Efficient time series inserts in MongoDB rely on batching documents with `insertMany`, using `ordered: false` to allow parallel processing, sorting by metaField and timestamp to maximize bucket fill, and calibrating batch sizes to your write rate. For rates above 10,000 writes per second, combine batching with sharding to distribute the write load.
