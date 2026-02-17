# How to Migrate Amazon ElastiCache Redis Clusters to Google Cloud Memorystore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Memorystore, Redis, AWS ElastiCache, Cloud Migration

Description: A practical guide to migrating your Amazon ElastiCache Redis clusters to Google Cloud Memorystore, covering data export, configuration mapping, and validation strategies.

---

If you have been running Redis on Amazon ElastiCache and are planning a move to Google Cloud, Memorystore for Redis is the natural landing zone. Both are fully managed Redis services, but there are enough differences in configuration, networking, and operational details that you need a solid migration plan.

This guide walks through the entire process - from exporting your ElastiCache data to standing up Memorystore instances and validating that everything works correctly on the other side.

## Understanding the Two Services

Amazon ElastiCache for Redis gives you managed Redis clusters with options for cluster mode enabled or disabled, read replicas, and multi-AZ failover. Google Cloud Memorystore for Redis offers similar capabilities with Standard Tier (replication) and Basic Tier (no replication) options.

Key differences to be aware of:

- ElastiCache lets you pick specific Redis versions. Memorystore supports a curated set of versions.
- ElastiCache parameter groups map loosely to Memorystore Redis configuration settings.
- ElastiCache security groups are replaced by VPC network peering and firewall rules in GCP.
- ElastiCache cluster mode does not have a direct equivalent in Memorystore Standard Tier, though Memorystore for Redis Cluster exists separately.

## Step 1: Inventory Your ElastiCache Setup

Before migrating, document what you have. Pull details from each ElastiCache cluster.

This script lists your ElastiCache clusters and their key configuration details:

```bash
# List all ElastiCache Redis replication groups with their configuration
aws elasticache describe-replication-groups \
  --query 'ReplicationGroups[*].{
    ID:ReplicationGroupId,
    Status:Status,
    Engine:MemberClusters,
    NodeType:CacheNodeType,
    NumNodes:MemberClusters | length(@)
  }' \
  --output table

# Get parameter group settings for a specific cluster
aws elasticache describe-cache-parameters \
  --cache-parameter-group-name default.redis7 \
  --query 'Parameters[?ParameterValue!=`null`].{Name:ParameterName,Value:ParameterValue}' \
  --output table
```

Take note of the node type, number of replicas, Redis version, and any custom parameter group settings. You will need these to configure Memorystore appropriately.

## Step 2: Create an RDB Snapshot from ElastiCache

The most reliable migration path uses RDB snapshots. ElastiCache can export snapshots to an S3 bucket.

```bash
# Create a manual backup of your ElastiCache replication group
aws elasticache create-snapshot \
  --replication-group-id my-redis-cluster \
  --snapshot-name migration-snapshot

# Wait for the snapshot to complete
aws elasticache describe-snapshots \
  --snapshot-name migration-snapshot \
  --query 'Snapshots[0].SnapshotStatus'

# Copy the snapshot to an S3 bucket
aws elasticache copy-snapshot \
  --source-snapshot-name migration-snapshot \
  --target-snapshot-name migration-snapshot-s3 \
  --target-bucket my-migration-bucket
```

The exported RDB file lands in your S3 bucket. This is the standard Redis dump format that Memorystore can import.

## Step 3: Transfer the RDB File to Google Cloud Storage

Move the RDB file from S3 to a GCS bucket. You can use the Storage Transfer Service or just download and re-upload.

```bash
# Download from S3
aws s3 cp s3://my-migration-bucket/migration-snapshot-s3.rdb ./redis-dump.rdb

# Upload to GCS
gsutil cp ./redis-dump.rdb gs://my-gcp-migration-bucket/redis-dump.rdb
```

For large datasets, consider using Google's Storage Transfer Service to move the file directly from S3 to GCS without downloading locally:

```bash
# Create a transfer job from S3 to GCS using gcloud
gcloud transfer jobs create \
  s3://my-migration-bucket \
  gs://my-gcp-migration-bucket \
  --source-creds-file=aws-creds.json \
  --include-prefixes=migration-snapshot
```

## Step 4: Create the Memorystore Instance

Set up the Memorystore Redis instance with specifications that match your ElastiCache cluster.

```bash
# Create a Memorystore Redis instance
# Standard tier gives you automatic replication (like Multi-AZ in ElastiCache)
gcloud redis instances create my-redis-instance \
  --size=5 \
  --region=us-central1 \
  --tier=standard \
  --redis-version=redis_7_0 \
  --network=projects/my-project/global/networks/default \
  --redis-config maxmemory-policy=allkeys-lru
```

Here is a rough mapping of ElastiCache node types to Memorystore sizes:

| ElastiCache Node Type | Memory   | Memorystore Size (GB) |
|----------------------|----------|-----------------------|
| cache.r6g.large      | 13.07 GB | 13                    |
| cache.r6g.xlarge     | 26.32 GB | 26                    |
| cache.m6g.large      | 6.38 GB  | 7                     |
| cache.t3.medium      | 3.09 GB  | 3                     |

## Step 5: Import the RDB File into Memorystore

Once the instance is running and the RDB file is in GCS, trigger the import.

```bash
# Import the RDB file into the Memorystore instance
gcloud redis instances import gs://my-gcp-migration-bucket/redis-dump.rdb \
  my-redis-instance \
  --region=us-central1
```

This operation can take a while depending on the data size. The instance will be temporarily unavailable during import. For production migrations, plan this during a maintenance window.

## Step 6: Map Your ElastiCache Configuration

ElastiCache parameter groups contain Redis configuration settings. You need to translate these to Memorystore's supported configuration parameters.

Common mappings include:

```bash
# Set configuration parameters on Memorystore
gcloud redis instances update my-redis-instance \
  --region=us-central1 \
  --redis-config=maxmemory-policy=volatile-lru,notify-keyspace-events=Ex

# Check current configuration
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format='yaml(redisConfigs)'
```

Not all ElastiCache parameters are configurable in Memorystore. Review the Memorystore documentation for the full list of supported configuration parameters.

## Step 7: Update Application Connection Strings

ElastiCache provides endpoints like `my-cluster.abc123.ng.0001.use1.cache.amazonaws.com`. Memorystore gives you an IP address in your VPC.

```bash
# Get the Memorystore instance IP and port
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format='value(host,port)'
```

Update your application's Redis connection configuration. If you are using environment variables:

```bash
# Old ElastiCache connection
# REDIS_HOST=my-cluster.abc123.ng.0001.use1.cache.amazonaws.com
# REDIS_PORT=6379

# New Memorystore connection
REDIS_HOST=10.0.0.3
REDIS_PORT=6379
```

One important difference: Memorystore for Redis is only accessible from within the VPC (or through VPC peering). There is no public endpoint by default. Make sure your application instances are in the same VPC or a peered network.

## Step 8: Validate the Migration

After the import completes, verify your data is intact.

```bash
# Connect to Memorystore from a GCE instance in the same VPC
redis-cli -h 10.0.0.3 -p 6379

# Check key count
> DBSIZE

# Spot-check some keys
> KEYS sample:*
> GET sample:key1
> TYPE sample:key2

# Check memory usage
> INFO memory
```

Compare the key count and memory usage against your ElastiCache source. They should be close (minor differences in overhead are normal).

## Step 9: Handle AUTH and Encryption

If your ElastiCache cluster uses AUTH tokens or in-transit encryption, configure the same on Memorystore.

```bash
# Enable AUTH on the Memorystore instance
gcloud redis instances update my-redis-instance \
  --region=us-central1 \
  --enable-auth

# Get the AUTH string
gcloud redis instances get-auth-string my-redis-instance \
  --region=us-central1
```

For in-transit encryption, Memorystore supports TLS. Enable it during instance creation with the `--transit-encryption-mode=SERVER_AUTHENTICATION` flag.

## Handling Cluster Mode Migrations

If your ElastiCache setup uses cluster mode enabled (sharding), Memorystore for Redis Cluster is the target. The migration is more involved because you need to handle slot assignments and resharding. Export each shard separately, create a Memorystore Cluster, and import data per shard.

## Monitoring After Migration

Set up Cloud Monitoring dashboards to track your Memorystore instance. Key metrics to watch:

- `redis.googleapis.com/stats/memory/usage_ratio` - memory utilization
- `redis.googleapis.com/stats/connected_clients` - client connections
- `redis.googleapis.com/stats/cache_hit_ratio` - cache hit rate
- `redis.googleapis.com/stats/evicted_keys` - eviction rate

Compare these metrics against your ElastiCache CloudWatch metrics during the validation period.

## Wrapping Up

Migrating from ElastiCache to Memorystore is straightforward once you understand the RDB export-import workflow. The biggest gotchas are networking differences (VPC-only access in Memorystore), configuration parameter availability, and handling cluster mode setups. Plan for a maintenance window during the import, validate your data thoroughly, and update your monitoring before cutting over production traffic.
