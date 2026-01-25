# How to Configure MongoDB Atlas for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cloud, Production, Database, DevOps

Description: A comprehensive guide to configuring MongoDB Atlas for production workloads, covering cluster sizing, security, monitoring, backup strategies, and cost optimization.

---

MongoDB Atlas removes the operational burden of running MongoDB yourself. But managed does not mean hands-off. Production deployments require careful configuration of cluster tiers, security settings, backup policies, and monitoring. This guide covers the essential settings for running Atlas in production.

## Cluster Tier Selection

### Development vs Production

```mermaid
flowchart TB
    Start{Workload Type?}
    Start -->|Development| M0[M0/M2/M5<br/>Shared Clusters]
    Start -->|Production| Dedicated[Dedicated Clusters]

    Dedicated --> Small{Traffic Level?}
    Small -->|Low| M10[M10<br/>2GB RAM]
    Small -->|Medium| M30[M30<br/>8GB RAM]
    Small -->|High| M50[M50+<br/>16GB+ RAM]
```

**Shared Clusters (M0, M2, M5):**
- For development and testing only
- Limited connections and throughput
- No SLA guarantees

**Dedicated Clusters (M10+):**
- Required for production
- Predictable performance
- SLA guarantees
- Advanced features (VPC peering, private endpoints)

### Sizing Guidelines

| Metric | M10 | M30 | M50 | M60+ |
|--------|-----|-----|-----|------|
| RAM | 2GB | 8GB | 16GB | 32GB+ |
| Storage | 10-128GB | 40-512GB | 80-4TB | 160-4TB |
| vCPUs | 2 | 4 | 8 | 16+ |
| Connections | 1,500 | 3,000 | 6,000 | 8,000+ |

Choose based on:
- Working set size (data + indexes that must fit in RAM)
- Connection count (each connection uses ~1MB memory)
- Query complexity
- Throughput requirements

## Network Security

### IP Access List

Never use 0.0.0.0/0 in production. Whitelist specific IPs:

```javascript
// Using Atlas Admin API
const axios = require('axios');

async function addIpToAccessList(projectId, ip, comment) {
  await axios.post(
    `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`,
    [{
      ipAddress: ip,
      comment: comment
    }],
    {
      auth: {
        username: process.env.ATLAS_PUBLIC_KEY,
        password: process.env.ATLAS_PRIVATE_KEY
      }
    }
  );
}

// Add application server IPs
await addIpToAccessList(projectId, "10.0.1.50/32", "Production app server 1");
await addIpToAccessList(projectId, "10.0.1.51/32", "Production app server 2");
```

### VPC Peering

For AWS, GCP, or Azure deployments, use VPC peering:

1. Create peering connection in Atlas
2. Accept peering in your cloud provider
3. Update route tables
4. Traffic never traverses public internet

### Private Endpoints

Even more secure than VPC peering:

```bash
# AWS Private Link setup via Atlas CLI
atlas privateEndpoints aws create --projectId <projectId> --region us-east-1

# Get endpoint service name
atlas privateEndpoints aws describe <privateEndpointId> --projectId <projectId>
```

## Authentication and Authorization

### Database Users

Create dedicated users for each application:

```javascript
// Create application user via Admin API
async function createDatabaseUser(projectId, username, password, roles) {
  await axios.post(
    `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/databaseUsers`,
    {
      databaseName: "admin",
      username: username,
      password: password,
      roles: roles
    },
    { auth: { username: publicKey, password: privateKey } }
  );
}

// Application user with minimal permissions
await createDatabaseUser(projectId, "app-production", "securePassword123", [
  { roleName: "readWrite", databaseName: "production" }
]);

// Read-only user for analytics
await createDatabaseUser(projectId, "analytics-reader", "anotherPassword", [
  { roleName: "read", databaseName: "production" }
]);
```

### Custom Roles

Create granular permissions:

```javascript
// Custom role for order processing
{
  "roleName": "orderProcessor",
  "databaseName": "admin",
  "privileges": [
    {
      "resource": { "db": "production", "collection": "orders" },
      "actions": ["find", "insert", "update"]
    },
    {
      "resource": { "db": "production", "collection": "products" },
      "actions": ["find"]
    }
  ]
}
```

## Connection Configuration

### Production Connection String

```javascript
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://app-production:password@cluster0.abc123.mongodb.net/production?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  // Connection pool settings
  maxPoolSize: 50,
  minPoolSize: 10,

  // Timeouts
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,

  // Write concern for durability
  w: 'majority',
  wtimeoutMS: 5000,

  // Read preference for replica sets
  readPreference: 'primaryPreferred',

  // Retry configuration
  retryWrites: true,
  retryReads: true
});
```

### Connection String Best Practices

1. Use `mongodb+srv://` format for automatic failover
2. Store credentials in environment variables
3. Set appropriate pool sizes for your load
4. Configure timeouts based on your SLA

## Backup and Recovery

### Continuous Backup

Enable continuous backup for point-in-time recovery:

```
Cluster > Backup > Configure
- Enable Cloud Backup
- Choose backup frequency
- Set retention period
```

Recommended settings:
- Snapshot frequency: Every 6 hours minimum
- Retention: 7+ days for daily snapshots
- Point-in-time recovery window: 7 days

### Backup Schedule Example

```javascript
// Atlas API: Configure backup policy
{
  "policies": [{
    "id": "daily",
    "policyItems": [{
      "frequencyInterval": 1,
      "frequencyType": "daily",
      "retentionUnit": "days",
      "retentionValue": 7
    }]
  }, {
    "id": "weekly",
    "policyItems": [{
      "frequencyInterval": 1,
      "frequencyType": "weekly",
      "retentionUnit": "weeks",
      "retentionValue": 4
    }]
  }]
}
```

### Testing Restores

Regularly test backup restoration:

```bash
# Restore to new cluster
atlas backup restores create \
  --clusterName production-cluster \
  --snapshotId <snapshotId> \
  --targetClusterName restore-test \
  --projectId <projectId>
```

## Monitoring and Alerts

### Essential Alerts

Configure these alerts in Atlas:

```javascript
// Alert configurations
const alerts = [
  {
    eventTypeName: "CLUSTER_MONGOS_IS_MISSING",
    enabled: true,
    notifications: [{ typeName: "PAGER_DUTY", delayMin: 0 }]
  },
  {
    eventTypeName: "REPLICATION_OPLOG_WINDOW_RUNNING_OUT",
    enabled: true,
    threshold: { operator: "LESS_THAN", threshold: 1, units: "HOURS" }
  },
  {
    eventTypeName: "HOST_DISK_SPACE_USED",
    enabled: true,
    threshold: { operator: "GREATER_THAN", threshold: 80, units: "RAW" }
  },
  {
    eventTypeName: "HOST_CPU_USAGE_NORMALISED",
    enabled: true,
    threshold: { operator: "GREATER_THAN", threshold: 80, units: "RAW" }
  },
  {
    eventTypeName: "CONNECTIONS_PERCENT",
    enabled: true,
    threshold: { operator: "GREATER_THAN", threshold: 80, units: "RAW" }
  }
];
```

### Key Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | 70% | 85% |
| Memory Usage | 80% | 90% |
| Disk Usage | 70% | 85% |
| Connections | 70% | 85% |
| Oplog Window | 8 hours | 2 hours |
| Replication Lag | 30 seconds | 60 seconds |

### Performance Advisor

Enable and review Performance Advisor recommendations:

```
Cluster > Performance Advisor
- Review suggested indexes
- Check slow query analysis
- Apply recommendations
```

## Scaling Strategies

### Vertical Scaling

Upgrade cluster tier for more resources:

```bash
# Scale up cluster
atlas cluster update production-cluster \
  --projectId <projectId> \
  --tier M50

# Note: May cause brief election during upgrade
```

### Horizontal Scaling with Sharding

For very large datasets or high throughput:

```javascript
// Enable sharding on collection
sh.enableSharding("production");
sh.shardCollection("production.events", { "tenantId": 1, "timestamp": 1 });
```

### Auto-Scaling

Configure auto-scaling for variable workloads:

```javascript
// Auto-scaling configuration
{
  "autoScaling": {
    "compute": {
      "enabled": true,
      "scaleDownEnabled": true
    },
    "diskGBEnabled": true
  },
  "providerSettings": {
    "autoScaling": {
      "compute": {
        "minInstanceSize": "M30",
        "maxInstanceSize": "M60"
      }
    }
  }
}
```

## Cost Optimization

### Right-Sizing

1. Monitor actual resource usage for 2+ weeks
2. Scale down if consistently under 50% utilization
3. Use auto-scaling for variable workloads

### Storage Optimization

```javascript
// Check collection storage stats
db.orders.stats();

// Create indexes wisely (each index adds storage)
db.orders.getIndexes();

// Enable compression for large collections
db.createCollection("logs", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
});
```

### Reserved Capacity

For predictable workloads, purchase reserved capacity for 30-50% savings.

## Production Checklist

Before going live:

- [ ] Dedicated cluster (M10+) selected
- [ ] VPC peering or private endpoints configured
- [ ] IP access list restricted to known IPs
- [ ] Database users with minimal required permissions
- [ ] Connection pooling configured
- [ ] Continuous backup enabled
- [ ] Point-in-time recovery enabled
- [ ] Backup restoration tested
- [ ] Alerts configured for critical metrics
- [ ] Performance Advisor reviewed
- [ ] Query profiling enabled
- [ ] Index optimization complete
- [ ] Auto-scaling configured if needed
- [ ] Cost alerts set

## Emergency Procedures

### Cluster Recovery

```bash
# Restore from snapshot
atlas backup restores create \
  --clusterName production-cluster \
  --snapshotId <latest-snapshot> \
  --targetClusterName production-cluster-restored

# Update application connection strings
# Validate data integrity
# Switch traffic to restored cluster
```

### Contact Support

For production issues:
- Use Atlas in-app chat for P1 issues
- File support ticket with cluster details
- Include query logs and metrics screenshots

---

Atlas simplifies MongoDB operations, but production success requires proper configuration. Size your cluster appropriately, secure your network, configure comprehensive monitoring, and test your recovery procedures. The time invested in proper setup prevents outages and data loss when things go wrong.
