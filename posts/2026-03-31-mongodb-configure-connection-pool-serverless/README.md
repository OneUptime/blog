# How to Configure Connection Pool for Serverless with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Serverless, Lambda, Configuration

Description: Configure MongoDB connection pooling for serverless environments like AWS Lambda and Vercel Functions to reuse connections across invocations and avoid exhaustion.

---

## The Serverless Connection Problem

Serverless functions (AWS Lambda, Google Cloud Functions, Vercel) create a new execution environment for each concurrent invocation. Without careful configuration, each function instance opens its own connection pool, rapidly exhausting MongoDB's connection limit.

For example, with 1,000 concurrent Lambda invocations and `maxPoolSize: 100`, you could create 100,000 connections - far exceeding what MongoDB can handle.

## Solution 1: Reduce maxPoolSize

For serverless, set `maxPoolSize` to a small value (1-5) since each function instance rarely needs more than one concurrent connection:

```javascript
// lambda-handler.js or pages/api/*.js

let client;

async function getClient() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,          // Small pool per function instance
      minPoolSize: 0,          // Don't keep idle connections alive
      maxIdleTimeMS: 10000,    // Close idle connections quickly
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    await client.connect();
  }
  return client;
}

exports.handler = async (event) => {
  const client = await getClient();
  const db = client.db("mydb");
  // Use db...
};
```

The `client` variable is declared outside the handler to be reused across warm invocations of the same container.

## Solution 2: Use MongoDB Atlas Serverless or Flex Clusters

Atlas Serverless instances are designed for bursty, unpredictable workloads and handle connection scaling automatically. Connect with standard connection pooling:

```javascript
const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});
```

## Solution 3: Use a Lightweight Driver Connection (Recommended for Scale)

For high-scale serverless workloads, minimize connection overhead by using a dedicated, short-lived client with aggressive pool settings and connection reuse at the module level:

```javascript
// serverless-optimized.js
import { MongoClient } from "mongodb";

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;

  cachedClient = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 1,            // Minimal pool for serverless
    minPoolSize: 0,
    maxIdleTimeMS: 5000,
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
  });
  await cachedClient.connect();
  return cachedClient;
}

export async function findOrders() {
  const client = await getClient();
  const db = client.db("ecommerce");
  return db.collection("orders").find({ status: "active" }).toArray();
}
```

## Solution 4: Vercel / Next.js Global Connection Cache

```javascript
// lib/mongodb.js
import { MongoClient } from "mongodb";

const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 5000
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // In dev, preserve across HMR reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(process.env.MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(process.env.MONGODB_URI, options);
  clientPromise = client.connect();
}

export default clientPromise;
```

## Monitoring Serverless Connections

Track server-side connections to detect spikes from scaling events:

```bash
# Atlas CLI: check connection metrics (replace <hostname:port> with your process)
atlas metrics processes <hostname:port> --granularity PT1M --period PT1H \
  --output json | jq '.measurements[] | select(.name=="CONNECTIONS")'
```

## Summary

Serverless MongoDB connections require low `maxPoolSize` (1-10) per function instance, module-level client caching to reuse connections across warm invocations, and short `maxIdleTimeMS` to release connections quickly after use. At large scale, use a connection proxy or Atlas Data API to decouple the number of function instances from MongoDB connection count, since traditional pooling assumptions break down when thousands of short-lived execution contexts each maintain their own pool.
