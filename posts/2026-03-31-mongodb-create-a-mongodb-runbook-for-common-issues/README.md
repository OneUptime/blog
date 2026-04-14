# How to Create a MongoDB Runbook for Common Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Runbook, Incident Response

Description: Build a MongoDB runbook covering replica set failures, connection exhaustion, slow queries, and disk pressure to speed up incident response.

---

## What Is a MongoDB Runbook

A runbook is a documented procedure for diagnosing and resolving known issues. For MongoDB, this means step-by-step instructions your on-call engineer can follow at 3am without needing to be a database expert. Good runbooks reduce mean time to resolution (MTTR) dramatically.

## Runbook Structure

Each runbook entry should include:

```text
- Alert name and trigger condition
- Immediate triage steps
- Root cause analysis commands
- Remediation steps
- Escalation path
- Post-incident actions
```

## Issue 1: Replica Set Primary Not Found

**Trigger:** `MongoDBNodeNotHealthy` alert fires, application throws "No primary found" errors.

**Triage:**

```bash
# Check replica set status
mongosh --eval "rs.status()"

# Find current primary
mongosh --eval "db.hello()"
```

**Resolution:**

```bash
# If election is stalled, step down the current primary to force a new election
mongosh --eval "rs.stepDown(30)"

# If a secondary is stuck in STARTUP2, perform an initial sync:
# 1. Stop the secondary mongod process
# 2. Delete its data directory contents
# 3. Restart mongod - it will automatically perform an initial sync from the primary
```

## Issue 2: Connection Pool Exhausted

**Trigger:** Application logs show "connection refused" or "connection pool exhausted".

**Triage:**

```bash
# Check current connection count
mongosh --eval "db.serverStatus().connections"

# Find top connection sources
mongosh --eval "db.currentOp(true).inprog.map(op => op.client).reduce((a,c) => { a[c] = (a[c]||0)+1; return a; }, {})"
```

**Resolution:**

```javascript
// Kill long-running operations holding connections
db.adminCommand({ killOp: 1, op: <opid> })
```

```bash
# Increase maxIncomingConnections in mongod.conf
net:
  maxIncomingConnections: 10000
```

## Issue 3: Slow Queries Degrading Performance

**Trigger:** p99 query latency exceeds threshold, `MongoDBSlowQueries` alert fires.

**Triage:**

```bash
# Enable profiling temporarily
mongosh --eval "db.setProfilingLevel(1, { slowms: 50 })"

# Find slow queries
mongosh --eval "db.system.profile.find({}, {ns:1, millis:1, command:1}).sort({millis:-1}).limit(10)"
```

**Resolution:**

```javascript
// Identify missing indexes using explain
db.orders.find({ status: "pending", userId: "u123" }).explain("executionStats")

// Create the missing index
db.orders.createIndex({ status: 1, userId: 1 })
```

## Issue 4: Disk Space Critical

**Trigger:** Disk utilization alert fires, MongoDB logs show "no space left on device".

**Triage:**

```bash
# Check disk usage
df -h /var/lib/mongodb

# Check MongoDB data sizes
mongosh --eval "db.stats(1024*1024)"
```

**Resolution:**

```bash
# Run compact on the largest collection to reclaim disk space
mongosh --eval "db.runCommand({ compact: 'orders' })"

# Archive old data before compact
mongodump --db=mydb --collection=orders --query='{"createdAt": {"$lt": {"$date": "2024-01-01T00:00:00Z"}}}' --out=/backup/archive
```

## Escalation Path

```text
Level 1 (On-call engineer): Follow runbook steps, resolve within 15 min
Level 2 (DB team lead): Engage if unresolved after 15 min
Level 3 (MongoDB support): Engage for data corruption or persistent elections
```

## Summary

A well-structured MongoDB runbook turns panic into procedure. Document your four most common alert scenarios: replica set elections, connection exhaustion, slow queries, and disk pressure. For each, provide ready-to-paste diagnostic commands and resolution steps. Store the runbook in your incident response tool (PagerDuty, Opsgenie, or a shared wiki) so on-call engineers can access it immediately when an alert fires.
