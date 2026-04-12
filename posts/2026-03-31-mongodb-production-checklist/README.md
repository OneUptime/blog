# How to Configure MongoDB for Production Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Production, Security, Performance, Configuration

Description: A comprehensive checklist for configuring MongoDB in production covering security, performance, storage, networking, and monitoring essentials.

---

## Security Configuration

### Enable Authentication

```yaml
security:
  authorization: enabled
```

Create admin user before enabling:

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase"]
})
```

### Enable TLS/SSL

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
```

### Bind to Specific IPs

```yaml
net:
  bindIp: 127.0.0.1,10.0.0.5
  port: 27017
```

## Storage Configuration

### Set WiredTiger Cache Size

```yaml
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy
```

### Enable Journaling

```yaml
storage:
  journal:
    enabled: true
    commitIntervalMs: 100
```

## Operating System Tuning

Disable transparent huge pages:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Set `vm.swappiness` to 1:

```bash
echo "vm.swappiness=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Increase open file limits in `/etc/security/limits.conf`:

```text
mongod soft nofile 64000
mongod hard nofile 64000
mongod soft nproc 64000
mongod hard nproc 64000
```

## Replica Set Configuration

```yaml
replication:
  replSetName: "rs0"
```

Initialize:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})
```

## Logging Configuration

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: rename
  verbosity: 0
```

Enable slow query logging:

```javascript
db.setProfilingLevel(1, { slowms: 100 })
```

## Monitoring Setup

Enable free monitoring or configure Ops Manager/Cloud Manager. At minimum, monitor:

```javascript
// Key metrics to alert on
db.serverStatus().connections    // Connection usage
db.serverStatus().opcounters     // Operation rates
db.serverStatus().mem            // Memory usage
db.serverStatus().globalLock     // Lock contention
```

## Backup Strategy

Configure automated backups with `mongodump` via cron:

```bash
0 2 * * * mongodump --host localhost --gzip --archive=/backups/mongo-$(date +\%Y\%m\%d).archive
```

## Summary

A production MongoDB deployment requires enabling authentication and TLS, sizing WiredTiger cache appropriately, tuning OS settings for performance, deploying as a replica set for high availability, and configuring structured logging with slow query profiling. Combined with a tested backup strategy and proactive monitoring, this checklist covers the core requirements for a stable production deployment.
