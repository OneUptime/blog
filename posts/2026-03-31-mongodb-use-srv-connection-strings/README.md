# How to Use SRV Connection Strings for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, SRV, Connection, DNS, Atlas

Description: Learn how MongoDB SRV connection strings use DNS service records to simplify cluster configuration and enable automatic host discovery for Atlas and self-managed deployments.

---

The `mongodb+srv://` connection string format uses DNS SRV records to automatically discover replica set hosts. Instead of listing all hosts manually, a single DNS hostname resolves to all cluster members. This format is the default for MongoDB Atlas and simplifies connection string management.

## SRV vs Standard Format

Standard format requires listing all hosts:

```text
mongodb://user:pass@host1:27017,host2:27017,host3:27017/db?replicaSet=rs0
```

SRV format uses a single hostname:

```text
mongodb+srv://user:pass@cluster0.abcde.mongodb.net/db
```

Behind the scenes, the driver performs a DNS SRV lookup on `_mongodb._tcp.cluster0.abcde.mongodb.net` to discover all hosts.

## How DNS SRV Resolution Works

The driver queries two DNS record types:

1. **SRV records** (`_mongodb._tcp.<hostname>`) - returns host:port pairs for all cluster members
2. **TXT records** (`<hostname>`) - returns default URI options (e.g., `replicaSet=rs0&authSource=admin`)

```bash
# Inspect SRV records manually
dig +short SRV _mongodb._tcp.cluster0.abcde.mongodb.net

# Inspect TXT records
dig +short TXT cluster0.abcde.mongodb.net
```

## Connecting to MongoDB Atlas

Atlas provides SRV connection strings in the cluster connection dialog:

```text
mongodb+srv://username:password@cluster0.abcde.mongodb.net/myDatabase?retryWrites=true&w=majority
```

TLS is enabled by default with SRV connections - no need to add `tls=true` explicitly.

## Node.js with SRV

```javascript
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
// uri = "mongodb+srv://user:pass@cluster0.abcde.mongodb.net/myDB?retryWrites=true&w=majority"

const client = new MongoClient(uri);

async function connect() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected via SRV");
}

connect().catch(console.error);
```

## Python with PyMongo

```python
from pymongo import MongoClient
import os

uri = os.environ["MONGODB_URI"]
# uri = "mongodb+srv://user:pass@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(uri)
client.admin.command("ping")
print("Connected via SRV")
```

Note: PyMongo requires the `dnspython` package for SRV resolution. Since PyMongo 4.3, `dnspython` is installed automatically as a required dependency:

```bash
pip install pymongo
```

## Setting Up SRV Records for Self-Managed Deployments

Configure DNS SRV records for a self-managed replica set:

```text
# SRV records (TTL 300)
_mongodb._tcp.mongo.example.com.  300  IN  SRV  0  5  27017  mongo1.example.com.
_mongodb._tcp.mongo.example.com.  300  IN  SRV  0  5  27017  mongo2.example.com.
_mongodb._tcp.mongo.example.com.  300  IN  SRV  0  5  27017  mongo3.example.com.

# TXT record with default options
mongo.example.com.  300  IN  TXT  "replicaSet=rs0&authSource=admin"
```

Connection string becomes:

```text
mongodb+srv://user:pass@mongo.example.com/myDB
```

## SRV Limitations

- Only one hostname is allowed (no comma-separated list)
- You cannot specify a port in a `mongodb+srv://` URI - ports are determined by the SRV records
- DNS TTL affects failover speed - lower TTL means faster host list refresh but more DNS queries
- Requires a DNS server accessible from the application host

## Verifying SRV Resolution

```javascript
// After connecting, check which hosts were discovered via SDAM events
const client = new MongoClient("mongodb+srv://...");
client.on("topologyDescriptionChanged", (event) => {
  console.log(event.newDescription.servers);
});
await client.connect();
```

## Summary

Use `mongodb+srv://` to simplify connection strings by offloading host list management to DNS. It is the recommended format for MongoDB Atlas and works with self-managed clusters when DNS SRV records are configured. SRV enables zero-configuration updates to cluster membership - just update DNS records when adding or removing members.
