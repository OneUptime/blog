# How to Migrate Azure Redis Cache to Google Cloud Memorystore for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, Azure Migration, Caching, Database Migration

Description: Step-by-step instructions for migrating your Azure Cache for Redis instances to Google Cloud Memorystore for Redis with minimal downtime.

---

Migrating a Redis cache between cloud providers sounds straightforward - it is Redis on both sides, after all. But the details matter. Network configuration, authentication, persistence settings, and data migration all need careful handling. This guide walks through migrating from Azure Cache for Redis to Google Cloud Memorystore for Redis, covering everything from instance setup to data transfer.

## Service Comparison

Both services are managed Redis offerings, but they differ in several ways:

| Feature | Azure Cache for Redis | Google Cloud Memorystore for Redis |
|---------|----------------------|-----------------------------------|
| Redis versions | 6.0 for Basic/Standard/Premium; 7.2 for Enterprise/Enterprise Flash | 3.2, 4.0, 5.0, 6.x, 7.0, 7.2 |
| Tiers | Basic, Standard, Premium, Enterprise, Enterprise Flash | Basic, Standard |
| Clustering | Yes (Premium/Enterprise) | No for Basic/Standard instances; use Memorystore for Redis Cluster separately |
| Max size | Up to 4.5 TB, depending on tier | Up to 300 GB per instance |
| VNet integration | Yes | VPC-based access only |
| TLS support | Yes | Yes |
| AUTH | Access keys, Microsoft Entra ID | AUTH string |
| Persistence | RDB/AOF on Premium; tier-dependent persistence on Enterprise | RDB snapshots |
| Read replicas | Yes (Premium) | Yes (Standard tier with read replicas enabled) |

Key architectural difference: Memorystore instances are accessible only through internal IP addresses in a VPC. There is no public IP option. Your applications must be running in the authorized VPC or connected to that VPC through supported private connectivity such as Cloud VPN or Cloud Interconnect.

Also note that Azure Cache for Redis has a published retirement timeline. This guide is still useful for migrating existing Azure Cache for Redis instances, but new designs should account for Microsoft's recommendation to move away from Azure Cache for Redis.

## Step 1: Provision the Memorystore Instance

Create a Memorystore for Redis instance that matches your Azure Redis configuration.

```bash
# Create a Memorystore Redis instance

# Standard tier gives you replication and automatic failover (like Azure Standard/Premium)
gcloud redis instances create my-redis-cache \
    --size=5 \
    --region=us-central1 \
    --tier=standard \
    --redis-version=redis_7_0 \
    --network=default \
    --connect-mode=PRIVATE_SERVICE_ACCESS \
    --enable-auth \
    --transit-encryption-mode=SERVER_AUTHENTICATION

# Get the host and port
gcloud redis instances describe my-redis-cache \
    --region=us-central1 \
    --format="value(host,port)"

# Get the AUTH string
gcloud redis instances get-auth-string my-redis-cache \
    --region=us-central1

# If you enabled in-transit encryption, save the server CA certificate
gcloud redis instances describe my-redis-cache \
    --region=us-central1 \
    --format="value(serverCaCerts[0].cert)" > server_ca.pem
```

A few notes on the options:

- `--tier=standard` is the equivalent of Azure Standard/Premium - it includes replication for high availability
- `--enable-auth` turns on Redis AUTH, similar to Azure's access keys
- `--transit-encryption-mode=SERVER_AUTHENTICATION` enables TLS, matching Azure's SSL requirement
- `--connect-mode=PRIVATE_SERVICE_ACCESS` requires a private services access connection for the VPC before you create the Redis instance

## Step 2: Configure Network Access

Since Memorystore is VPC-only, make sure your application's compute resources can reach it. If your apps run on GKE or Compute Engine in the same VPC, they can connect directly.

For Cloud Run, use Direct VPC egress when possible. If Direct VPC egress is not available for your serverless environment, use a Serverless VPC Access connector:

```bash
# Recommended for Cloud Run: deploy with Direct VPC egress
gcloud run deploy my-service \
    --image=gcr.io/my-project/my-service \
    --network=default \
    --subnet=default \
    --vpc-egress=private-ranges-only \
    --region=us-central1

# Create a VPC connector for serverless services to reach Memorystore
gcloud compute networks vpc-access connectors create redis-connector \
    --region=us-central1 \
    --network=default \
    --range=10.8.0.0/28

# When deploying a Cloud Run service, attach the connector
gcloud run deploy my-service \
    --image=gcr.io/my-project/my-service \
    --vpc-connector=redis-connector \
    --region=us-central1
```

## Step 3: Export Data from Azure Redis

There are several approaches to move data from Azure Redis to Memorystore, depending on your data size and downtime tolerance.

### Option A: RDB Export and Import (Best for Larger Datasets)

If you are using Azure Premium tier, you can export an RDB snapshot:

```bash
# Export RDB from Azure Redis to Azure Blob Storage
az redis export \
    --name my-azure-redis \
    --resource-group my-rg \
    --prefix "redis-export" \
    --container "https://mystorageaccount.blob.core.windows.net/redis-backups?<sas-token>" \
    --file-format rdb

# Find the exported blob name if your cache exports multiple files or uses a generated suffix
az storage blob list \
    --account-name mystorageaccount \
    --container-name redis-backups \
    --prefix redis-export \
    --output table

# Download the RDB file
az storage blob download \
    --account-name mystorageaccount \
    --container-name redis-backups \
    --name redis-export.rdb \
    --file redis-export.rdb

# Upload to GCS
gsutil cp redis-export.rdb gs://my-migration-bucket/redis-export.rdb

# Import into Memorystore
gcloud redis instances import gs://my-migration-bucket/redis-export.rdb \
    my-redis-cache \
    --region=us-central1
```

The import replaces all existing data in the Memorystore instance and makes the instance unavailable while the import runs, so only do this during a maintenance window. The Memorystore target must run the same Redis version as the source RDB file or a newer Redis version.

### Option B: Application-Level Migration (For Smaller Datasets or Complex Key Structures)

Write a migration script that reads keys from Azure Redis and writes them to Memorystore. This works well when you need to filter or transform data during migration.

```python
# Migration script that copies Redis data between instances
import redis
import time

# Connect to Azure Redis (source)
azure_redis = redis.Redis(
    host='my-azure-redis.redis.cache.windows.net',
    port=6380,
    password='azure-access-key',
    ssl=True,
    decode_responses=False  # Keep binary data intact
)

# Connect to Memorystore (destination)
# Run this script from a VM in the same VPC as Memorystore
memorystore = redis.Redis(
    host='10.0.0.3',  # Memorystore private IP
    port=6379,
    password='memorystore-auth-string',
    ssl=True,
    ssl_ca_certs='server_ca.pem',
    decode_responses=False
)

def migrate_keys():
    """Migrate all keys from Azure Redis to Memorystore."""
    cursor = 0
    migrated = 0

    while True:
        # Use SCAN to iterate through keys without blocking
        cursor, keys = azure_redis.scan(cursor=cursor, count=100)

        if keys:
            # Use pipeline for batch operations
            pipe = memorystore.pipeline()

            for key in keys:
                # Get the key type to use the right copy method
                key_type = azure_redis.type(key).decode('utf-8')
                ttl = azure_redis.ttl(key)

                if key_type == 'string':
                    value = azure_redis.get(key)
                    pipe.set(key, value)
                elif key_type == 'hash':
                    value = azure_redis.hgetall(key)
                    pipe.hset(key, mapping=value)
                elif key_type == 'list':
                    values = azure_redis.lrange(key, 0, -1)
                    if values:
                        pipe.rpush(key, *values)
                elif key_type == 'set':
                    values = azure_redis.smembers(key)
                    if values:
                        pipe.sadd(key, *values)
                elif key_type == 'zset':
                    values = azure_redis.zrange(key, 0, -1, withscores=True)
                    if values:
                        pipe.zadd(key, dict(values))
                elif key_type == 'stream':
                    values = azure_redis.xrange(key, '-', '+')
                    for entry_id, fields in values:
                        pipe.xadd(key, fields, id=entry_id)
                else:
                    print(f"Skipping unsupported key type {key_type!r} for key {key!r}")
                    continue

                # Preserve TTL if set
                if ttl > 0:
                    pipe.expire(key, ttl)

                migrated += 1

            pipe.execute()
            print(f"Migrated {migrated} keys so far...")

        # cursor returns to 0 when scan is complete
        if cursor == 0:
            break

    print(f"Migration complete. Total keys migrated: {migrated}")

migrate_keys()
```

### Option C: RIOT (Redis Input/Output Tool)

RIOT is an open source tool specifically designed for Redis-to-Redis migration. It handles all data types and can do live replication:

```bash
# Install RIOT
# https://developer.redis.com/riot/

# Replicate from Azure Redis to Memorystore
riot replicate \
    rediss://my-azure-redis.redis.cache.windows.net:6380 \
    rediss://10.0.0.3:6379 \
    --source-pass "azure-access-key" \
    --target-pass "memorystore-auth-string" \
    --mode live
```

## Step 4: Update Application Connection Strings

Update your application's Redis connection configuration. The main changes are:

1. Host changes from Azure endpoint to Memorystore private IP
2. Port typically changes from 6380 (Azure SSL) to 6379
3. Authentication changes from Azure access key to Memorystore auth string
4. TLS configuration must match whether you enabled in-transit encryption on Memorystore

Here is a Node.js example showing the before and after:

```javascript
// Before: Azure Redis connection
const redis = require('redis');
const fs = require('fs');

const azureClient = redis.createClient({
    url: 'rediss://my-azure-redis.redis.cache.windows.net:6380',
    password: 'azure-primary-key'
});

// After: Memorystore connection
const memorystoreClient = redis.createClient({
    url: 'rediss://10.0.0.3:6379',
    password: 'memorystore-auth-string',
    socket: {
        ca: fs.readFileSync('server_ca.pem')
    }
});
```

## Step 5: Validate the Migration

After migrating data and updating connections, verify everything looks correct:

```bash
# Connect to Memorystore from a Compute Engine VM in the same VPC
redis-cli -h 10.0.0.3 -p 6379 -a "memorystore-auth-string" --tls --cacert server_ca.pem

# Check key count matches
> DBSIZE

# Spot check a few critical keys
> GET session:user123
> HGETALL config:app-settings
> SMEMBERS feature-flags:enabled
```

Compare the DBSIZE output with your Azure Redis instance to make sure all keys were transferred.

## Handling Downtime

For zero-downtime migration, consider this approach:

1. Set up Memorystore and run the initial data migration
2. Update your application to dual-write to both Azure Redis and Memorystore
3. Use RIOT's live replication mode to keep the two in sync for any writes you cannot dual-write
4. Switch reads to Memorystore
5. Once stable, remove the Azure Redis writes
6. Decommission Azure Redis

This dual-write approach adds some latency to write operations temporarily, but it means your users never experience a cache miss during migration.

## Monitoring After Migration

Set up monitoring on your Memorystore instance to catch any performance issues:

```bash
# Create an alert for high memory usage
gcloud monitoring policies create \
    --display-name="Redis memory alert" \
    --condition-display-name="System memory usage above 80%" \
    --condition-filter='resource.type="redis_instance" AND metric.type="redis.googleapis.com/stats/memory/system_memory_usage_ratio"' \
    --if='> 0.8' \
    --duration=300s
```

Also watch for elevated cache miss rates in the first few hours after migration. If you see a spike in misses, it likely means some keys were not migrated or expired during the migration window.

## Conclusion

Migrating Redis between clouds is one of the more straightforward migrations because the protocol and data model are the same on both sides. The main complexities are around network access (Memorystore's VPC-only requirement) and minimizing downtime during the cutover. Use the RDB export/import method for large datasets, and consider a dual-write pattern if you need zero downtime. Once the migration is done, your application code barely changes - it is still just Redis underneath.
