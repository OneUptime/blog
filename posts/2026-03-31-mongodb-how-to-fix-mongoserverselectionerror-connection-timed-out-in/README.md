# How to Fix MongoServerSelectionError: Connection Timed Out in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoServerSelectionError, Connection Timeout, Troubleshooting, Node.js

Description: Learn how to diagnose and fix the MongoServerSelectionError connection timeout error in MongoDB by checking connectivity, TLS settings, and driver configuration.

---

## Overview

`MongoServerSelectionError: connect ECONNREFUSED` or `Server selection timed out` is one of the most common MongoDB connection errors. It means the driver could not find a suitable server within the `serverSelectionTimeoutMS` window. This guide covers the most common causes and fixes.

## What the Error Looks Like

```text
MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
MongoServerSelectionError: Server selection timed out after 30000 ms
MongoServerSelectionError: getaddrinfo ENOTFOUND cluster.mongodb.net
```

## Step 1 - Verify MongoDB is Running

```bash
# Check if mongod is running
sudo systemctl status mongod

# Start MongoDB if stopped
sudo systemctl start mongod

# Check the port is listening
netstat -tlnp | grep 27017
# or
lsof -i :27017
```

## Step 2 - Test Basic Connectivity

```bash
# Connect via mongo shell or mongosh
mongosh "mongodb://localhost:27017"

# For a remote host
mongosh "mongodb://your-host:27017"

# Test with ping
mongo --eval "db.adminCommand('ping')" --host localhost --port 27017
```

## Step 3 - Check the Connection String

Verify your connection string format:

```javascript
// Local
const uri = "mongodb://localhost:27017";

// With authentication
const uri = "mongodb://username:password@localhost:27017/mydb?authSource=admin";

// MongoDB Atlas (replica set)
const uri = "mongodb+srv://username:password@cluster0.abc123.mongodb.net/mydb?retryWrites=true&w=majority";

// Explicit replica set members
const uri = "mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0";
```

Common mistakes:

```text
WRONG: mongodb//localhost:27017    (missing colon)
WRONG: mongodb://localhost/27017   (port is after colon, not slash)
CORRECT: mongodb://localhost:27017
```

## Step 4 - Increase serverSelectionTimeoutMS

If the server is slow to respond (e.g., Atlas free tier starting up), increase the timeout:

```javascript
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 60000,  // default is 30000 ms
  connectTimeoutMS: 30000
});
```

## Step 5 - Check Firewall and Network Rules

```bash
# Test TCP connectivity
nc -zv your-mongodb-host 27017
telnet your-mongodb-host 27017

# For AWS: check security group inbound rules
# For MongoDB Atlas: check Network Access IP allowlist
```

For MongoDB Atlas, ensure your current IP is in the Network Access allowlist. Using `0.0.0.0/0` allows all IPs (development only):

```text
Atlas Dashboard > Network Access > Add IP Address > Allow Access from Anywhere
```

## Step 6 - Fix TLS/SSL Issues

If using TLS and getting certificate errors:

```javascript
// Disable TLS verification for development only
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true  // development only!
});

// For production: specify the CA file
const client = new MongoClient(uri, {
  tls: true,
  tlsCAFile: "/path/to/ca.pem"
});
```

## Step 7 - Handle DNS Resolution (Atlas)

If you see `getaddrinfo ENOTFOUND`, the DNS resolution is failing:

```bash
# Test DNS
nslookup cluster0.abc123.mongodb.net
dig cluster0.abc123.mongodb.net

# Check /etc/resolv.conf for DNS servers
cat /etc/resolv.conf
```

Some corporate networks or VPNs block DNS SRV lookups. Try switching from `mongodb+srv://` to explicit hosts:

```javascript
const uri = "mongodb://ac-abc123-shard-00-00.abc123.mongodb.net:27017,ac-abc123-shard-00-01.abc123.mongodb.net:27017/?ssl=true&replicaSet=atlas-xyz&authSource=admin";
```

## Step 8 - Authentication Issues

If authentication fails, the driver may report it as a server selection error:

```javascript
const client = new MongoClient("mongodb://user:pass@localhost:27017/mydb?authSource=admin", {
  serverSelectionTimeoutMS: 5000
});

try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected successfully");
} catch (err) {
  console.error("Connection error:", err.message);
}
```

## Full Diagnostic Script

```javascript
const { MongoClient } = require("mongodb");

async function diagnose(uri) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    console.log("Attempting connection...");
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("SUCCESS: Connected and pinged MongoDB");
  } catch (err) {
    console.error("FAILED:", err.name, err.message);
    if (err.name === "MongoServerSelectionError") {
      console.error("Topology description:", JSON.stringify(err.reason, null, 2));
    }
  } finally {
    await client.close();
  }
}

diagnose(process.env.MONGODB_URI || "mongodb://localhost:27017");
```

## Summary

`MongoServerSelectionError` is almost always caused by one of five issues: MongoDB not running, wrong connection string, a firewall blocking port 27017, an Atlas IP allowlist miss, or TLS/DNS misconfiguration. Work through them methodically: verify the service is up, test raw TCP connectivity, check your connection string format, confirm firewall rules, and review TLS settings. The diagnostic script above helps narrow down the root cause quickly.
