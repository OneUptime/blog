# How to Handle Connection Timeouts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection, Timeout, Driver, Reliability

Description: Learn how to configure and handle connection timeouts in MongoDB drivers, including serverSelectionTimeout, connectTimeout, and socketTimeout settings.

---

## Overview

Connection timeouts in MongoDB occur when a client cannot establish or maintain a connection within the configured time limits. Understanding the different timeout settings and how to handle timeout errors gracefully prevents application outages and data loss.

## Types of Timeouts in MongoDB

MongoDB drivers expose several timeout settings:

- `serverSelectionTimeoutMS` - how long the driver waits to find a suitable server
- `connectTimeoutMS` - how long the driver waits to establish a TCP connection
- `socketTimeoutMS` - how long the driver waits for a response on an active connection
- `heartbeatFrequencyMS` - how often the driver pings servers to check their status

## Configuring Timeouts in the Connection String

```bash
mongodb://localhost:27017/mydb?serverSelectionTimeoutMS=5000&connectTimeoutMS=10000&socketTimeoutMS=30000
```

## Configuring Timeouts in Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000
});

async function connect() {
  try {
    await client.connect();
    console.log("Connected successfully");
  } catch (err) {
    if (err.name === "MongoServerSelectionError") {
      console.error("Could not find a suitable MongoDB server:", err.message);
    } else {
      console.error("Connection failed:", err.message);
    }
    process.exit(1);
  }
}
```

## Configuring Timeouts in Python

```python
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, NetworkTimeout

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000
)

try:
    client.admin.command("ping")
    print("Connected to MongoDB")
except ServerSelectionTimeoutError as e:
    print(f"Server selection timed out: {e}")
except NetworkTimeout as e:
    print(f"Network timeout: {e}")
```

## Handling Timeout Errors in Application Code

```javascript
async function findWithTimeout(collection, filter) {
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      return await collection.findOne(filter);
    } catch (err) {
      if (err.name === "MongoServerSelectionError" || err.name === "MongoNetworkTimeoutError") {
        attempt++;
        const delay = Math.pow(2, attempt) * 100;
        console.warn(`Timeout, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Network-Level Considerations

Timeouts can be caused by:
- Firewall rules dropping idle TCP connections (set `keepAliveInitialDelay` lower than the firewall idle timeout)
- Overloaded MongoDB servers with a full operation queue
- DNS resolution delays when using replica set connection strings

In the Node.js driver v6+, TCP keep-alive is always enabled with a default initial delay of 300 seconds. In older driver versions (v5.x and below), you can enable it explicitly:

```javascript
// Node.js driver v5.x and below only
const client = new MongoClient("mongodb://localhost:27017", {
  keepAlive: true,
  keepAliveInitialDelay: 120000
});
```

## Summary

MongoDB timeout errors are caused by network issues, overloaded servers, or misconfigured timeout values. Configure `serverSelectionTimeoutMS`, `connectTimeoutMS`, and `socketTimeoutMS` to match your application's latency requirements. Always handle `MongoServerSelectionError` and `MongoNetworkTimeoutError` with retry logic and exponential backoff.
