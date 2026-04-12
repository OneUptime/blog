# How to Prepare MongoDB for Production Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Production, Deployment, Configuration, Operation

Description: A comprehensive checklist for preparing MongoDB for production including replica sets, security hardening, resource limits, and operational readiness.

---

## Production Readiness Checklist Overview

Deploying MongoDB to production requires more than installing and starting the service. This guide covers the key areas: topology, security, resource configuration, monitoring, and backup. Missing any area can lead to data loss, security breaches, or unexpected outages.

## Step 1: Deploy as a Replica Set

Never run a single standalone MongoDB instance in production. A replica set provides high availability and automatic failover:

```bash
# Initialize a 3-node replica set
mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1.example.com:27017", priority: 2 },
    { _id: 1, host: "mongo2.example.com:27017", priority: 1 },
    { _id: 2, host: "mongo3.example.com:27017", priority: 1 }
  ]
});
'
```

Verify replica set health:

```javascript
rs.status();
// Check all members show state: PRIMARY or SECONDARY
```

## Step 2: Configure mongod.conf for Production

Set key production parameters in `/etc/mongod.conf`:

```yaml
# /etc/mongod.conf

net:
  port: 27017
  bindIp: 10.0.1.10  # Bind to private IP only, not 0.0.0.0
  compression:
    compressors: zstd,snappy

security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile  # For replica set auth

storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8  # Set to ~50% of available RAM
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: zstd
    indexConfig:
      prefixCompression: true

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

replication:
  replSetName: "rs0"

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
```

## Step 3: Configure OS-Level Settings

Set kernel parameters for MongoDB performance:

```bash
# /etc/sysctl.conf additions
vm.swappiness=1
vm.dirty_ratio=15
vm.dirty_background_ratio=5
net.core.somaxconn=65535

# Apply settings
sudo sysctl -p

# Disable transparent huge pages (THP) — MongoDB 7.0 and earlier only.
# MongoDB 8.0+ recommends keeping THP enabled (upgraded TCMalloc benefits from it).
# Add to /etc/rc.local or systemd service
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

Configure ulimits for the mongod user:

```bash
# /etc/security/limits.d/mongodb.conf
mongod soft nofile 65535
mongod hard nofile 65535
mongod soft nproc 64000
mongod hard nproc 64000
```

## Step 4: Create Application Database Users

Never use the admin user for application connections:

```javascript
use myapp;
db.createUser({
  user: "appuser",
  pwd: "strong-random-password",
  roles: [
    { role: "readWrite", db: "myapp" }
  ]
});

// Read-only user for reporting
db.createUser({
  user: "reportuser",
  pwd: "another-strong-password",
  roles: [
    { role: "read", db: "myapp" }
  ]
});
```

## Step 5: Create Essential Indexes Before Launch

Create indexes before importing production data:

```javascript
use myapp;

// Primary query patterns
db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ customerId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Verify indexes
db.orders.getIndexes();
```

## Step 6: Validate Connection String and Limits

Test your production connection string and set appropriate pool size:

```text
mongodb://appuser:password@mongo1.example.com:27017,mongo2.example.com:27017,mongo3.example.com:27017/myapp?replicaSet=rs0&authSource=myapp&maxPoolSize=50&minPoolSize=5&connectTimeoutMS=5000&serverSelectionTimeoutMS=5000&compressors=zstd
```

## Step 7: Final Pre-Launch Verification

Run these checks before cutting over traffic:

```bash
#!/bin/bash
echo "=== MongoDB Production Readiness Check ==="

# Check replica set status
mongosh --eval "JSON.stringify(rs.status().members.map(m => ({name: m.name, state: m.stateStr})))"

# Check auth is enabled
mongosh --eval "db.adminCommand({getCmdLineOpts: 1}).parsed.security"

# Check slow op profiling
mongosh --eval "db.getProfilingStatus()"

# Check cache size
mongosh --eval "db.adminCommand({serverStatus: 1}).wiredTiger.cache['maximum bytes configured']"

echo "=== Check complete ==="
```

## Summary

Preparing MongoDB for production requires deploying a replica set (minimum 3 nodes), configuring `mongod.conf` with appropriate cache size, compression, and slow op profiling, tuning OS-level settings like THP and ulimits, creating least-privilege application users, and establishing indexes before launch. Run a pre-launch verification script to confirm all settings are applied before routing production traffic.
