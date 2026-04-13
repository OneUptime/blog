# How to Use Read Preference 'primaryPreferred' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Replication, Failover, Secondary, Driver

Description: Learn how to use read preference primaryPreferred in MongoDB to route reads to the primary while falling back to secondaries when the primary is unavailable.

---

## Introduction

Read preference `primaryPreferred` sends reads to the primary when it is available, but automatically falls back to a secondary if the primary is unreachable. This provides a balance between consistency and availability, making it useful for applications that prefer fresh data but must stay operational during primary elections.

## How "primaryPreferred" Works

- When the primary is available: reads go to the primary
- When the primary is unavailable (election in progress): reads fall back to a secondary
- Secondary reads may be slightly stale due to replication lag
- Provides better availability than `primary` preference

## Setting Read Preference in mongosh

```javascript
db.getMongo().setReadPref("primaryPreferred");
db.products.find({ available: true });
```

## Setting Read Preference in Node.js

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient(
  "mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0",
  { readPreference: ReadPreference.PRIMARY_PREFERRED }
);

await client.connect();
const products = client.db("mydb").collection("products");
const available = await products.find({ available: true }).toArray();
```

## Setting in Connection String

```javascript
const client = new MongoClient(
  "mongodb://host1,host2,host3/?replicaSet=rs0&readPreference=primaryPreferred"
);
```

## Using with Max Staleness

Combine with `maxStalenessSeconds` to limit how stale secondary reads can be:

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const pref = new ReadPreference("primaryPreferred", [], {
  maxStalenessSeconds: 90
});

const result = await collection.find({}).withReadPreference(pref).toArray();
```

## When to Use "primaryPreferred"

Use `primaryPreferred` when:
- Your application should continue reading during primary elections
- Slight staleness during failover is acceptable
- You want consistent reads from the primary with automatic failover to secondaries
- You have SLA requirements that cannot tolerate read failures during elections

```javascript
// Product catalog reads - minor staleness acceptable during failover
const client = new MongoClient(uri, {
  readPreference: "primaryPreferred"
});
```

## Comparison with Related Preferences

| Preference | Primary Available | Primary Unavailable |
|------------|-----------------|---------------------|
| primary | Primary | Error |
| primaryPreferred | Primary | Secondary (stale) |
| secondary | Secondary | Secondary |
| nearest | Lowest latency | Lowest latency |

## Summary

Read preference `primaryPreferred` provides resilient reads that default to the primary for consistency but fall back to secondaries during failover. It is a practical choice for applications that cannot afford read failures during elections but still want fresh data most of the time. Adding `maxStalenessSeconds` bounds the staleness risk during fallback reads.
