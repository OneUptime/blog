# How to Migrate from Self-Managed Redis to Memorystore for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, Migration, Google Cloud

Description: A practical guide to migrating your self-managed Redis instances to Google Cloud Memorystore for Redis, covering data export, network setup, and validation steps.

---

Running Redis on your own VMs or bare-metal servers means you are responsible for patching, scaling, failover, and backups. Google Cloud Memorystore for Redis takes all of that off your plate. It gives you a fully managed Redis service with built-in high availability, automatic failover, and seamless integration with the rest of GCP. In this post, I will walk through the full migration process from a self-managed Redis deployment to Memorystore.

## Why Move to Memorystore

Before diving into the how, let me briefly cover the why. When you run Redis yourself, there is a long list of operational tasks that eat into your time. You need to handle OS-level security patches, manage replication topology, configure persistence, monitor memory usage, and plan capacity. Memorystore eliminates most of this. You get sub-millisecond latency, automatic failover for Standard tier instances, and native VPC connectivity. You also get IAM-based access control and integration with Cloud Monitoring out of the box.

The trade-off is that you lose some flexibility. Memorystore does not support every Redis module, and you cannot SSH into the underlying nodes. But for the vast majority of caching and session-store use cases, this is a net win.

## Prerequisites

Before starting the migration, make sure you have the following ready:

- A GCP project with billing enabled
- The gcloud CLI installed and authenticated
- Network connectivity between your source Redis and GCP (either VPN, Interconnect, or a temporary migration VM)
- A rough idea of your current Redis memory usage and key count
- The `redis-cli` tool available on a machine that can reach both the old and new Redis instances

## Step 1 - Provision the Memorystore Instance

First, create a Memorystore for Redis instance that matches your current setup. You will want to pick the same Redis version and allocate enough memory.

This command creates a 5GB Standard-tier Memorystore instance in the us-central1 region:

```bash
# Create a Standard-tier Memorystore instance with 5GB capacity
gcloud redis instances create my-redis-instance \
  --size=5 \
  --region=us-central1 \
  --tier=STANDARD \
  --redis-version=redis_7_0 \
  --network=default
```

The Standard tier gives you a replica for automatic failover. If you only need a cache that can tolerate data loss, the Basic tier is cheaper.

Wait for the instance to finish provisioning, then grab the host and port:

```bash
# Get the IP address and port of the new instance
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format="value(host,port)"
```

## Step 2 - Assess Your Source Redis

Before migrating data, take stock of what you have. Connect to your source Redis and run a few diagnostic commands.

```bash
# Check memory usage and key count on the source instance
redis-cli -h SOURCE_HOST -p 6379 INFO memory
redis-cli -h SOURCE_HOST -p 6379 DBSIZE
```

Note the `used_memory_human` value from the INFO output. Your Memorystore instance needs to have at least that much capacity, plus headroom for overhead.

If your source Redis uses multiple databases (DB 0 through DB 15), check each one. Memorystore supports multiple databases, but you should know which ones contain data.

## Step 3 - Export Data Using RDB Dump

The most reliable migration path uses an RDB dump. On your source Redis, trigger a background save and export the dump file.

```bash
# Trigger an RDB save on the source Redis
redis-cli -h SOURCE_HOST -p 6379 BGSAVE

# Wait for the save to complete
redis-cli -h SOURCE_HOST -p 6379 LASTSAVE

# Copy the dump.rdb file from the Redis data directory
scp user@source-server:/var/lib/redis/dump.rdb /tmp/dump.rdb
```

Now upload the dump file to a Google Cloud Storage bucket:

```bash
# Upload the RDB dump to a GCS bucket
gsutil cp /tmp/dump.rdb gs://my-migration-bucket/dump.rdb
```

## Step 4 - Import Data into Memorystore

Memorystore supports importing RDB files directly from Cloud Storage. This is the smoothest way to load data.

```bash
# Import the RDB dump into the Memorystore instance
gcloud redis instances import gs://my-migration-bucket/dump.rdb \
  my-redis-instance \
  --region=us-central1
```

This operation will temporarily make the instance unavailable while it loads the data. For large datasets, this can take several minutes. Plan accordingly and do this during a maintenance window.

## Step 5 - Validate the Migration

Once the import finishes, connect to the Memorystore instance and verify your data.

```bash
# Connect to Memorystore and check the key count
redis-cli -h MEMORYSTORE_HOST -p 6379 DBSIZE

# Spot-check a few known keys
redis-cli -h MEMORYSTORE_HOST -p 6379 GET my:important:key

# Compare memory usage
redis-cli -h MEMORYSTORE_HOST -p 6379 INFO memory
```

Compare the DBSIZE output between source and destination. The numbers should match. Pick a handful of keys that you know the values of and verify them manually.

## Step 6 - Update Application Configuration

With data validated, it is time to point your applications at the new instance. This typically involves updating environment variables or configuration files.

Here is an example for a Node.js application using ioredis:

```javascript
// Update the Redis connection to point to Memorystore
const Redis = require('ioredis');

const redis = new Redis({
  host: '10.0.0.3',  // Memorystore private IP
  port: 6379,
  // Memorystore uses VPC networking, no AUTH by default
  // Enable AUTH if you configured it during instance creation
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});
```

For Python applications using redis-py:

```python
# Connect to Memorystore from a Python application
import redis

r = redis.Redis(
    host='10.0.0.3',  # Memorystore private IP
    port=6379,
    decode_responses=True,
    socket_connect_timeout=5,
    retry_on_timeout=True
)
```

## Handling the Cutover

For a zero-downtime migration, you have a few options. The simplest is dual-write: update your application to write to both the old and new Redis instances, then gradually shift reads to Memorystore. Once you are confident everything works, stop writing to the old instance and decommission it.

If you cannot do dual-write, the next best approach is to schedule a brief maintenance window. Stop your application, do a final RDB export and import, update the configuration, and restart.

## Networking Considerations

Memorystore instances are only accessible from within the same VPC or from peered networks. You cannot reach them over the public internet. Make sure your application VMs, GKE clusters, or Cloud Run services are in a network that has connectivity to the Memorystore instance.

If your source Redis is on-premises, you will need a VPN or Cloud Interconnect to reach GCP for the migration. Once migration is done and your applications are running in GCP, this is no longer a concern for the Redis connection itself.

## Post-Migration Cleanup

After the migration is stable and you have monitored it for a reasonable period, clean up the old resources:

- Decommission the self-managed Redis servers
- Remove the RDB dump from Cloud Storage
- Update any monitoring or alerting to point at the new Memorystore metrics in Cloud Monitoring
- Review IAM permissions to make sure only the right service accounts can access the instance

## Monitoring After Migration

Set up alerts in Cloud Monitoring for your Memorystore instance. The key metrics to watch are memory usage ratio, connected clients, cache hit ratio, and the number of evicted keys. If you see eviction happening and you did not expect it, you may need to bump up the instance size.

Migrating from self-managed Redis to Memorystore is straightforward once you know the steps. The RDB import path handles the heavy lifting of data transfer, and the managed service takes care of the operational burden going forward. It is one of those moves that pays for itself quickly in reduced toil.
