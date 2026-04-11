# How to Use ElastiCache Serverless for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, Serverless, AWS, Auto Scaling

Description: Learn how to create and use Amazon ElastiCache Serverless for Redis to get automatic scaling without managing cluster capacity or node types.

---

## What Is ElastiCache Serverless

ElastiCache Serverless is a deployment option for ElastiCache Redis and Memcached that automatically scales compute and memory to match your workload. Unlike traditional ElastiCache where you choose node types and shard counts, Serverless:

- Scales instantly from zero to thousands of requests per second
- Bills per usage (ECPUs consumed + GB stored)
- Eliminates capacity planning
- Provides built-in Multi-AZ availability

It is designed for workloads with unpredictable or variable traffic, not for workloads that need the absolute lowest latency at constant high load.

## Creating an ElastiCache Serverless Cache

### Via AWS Console

1. Go to ElastiCache in the AWS Console
2. Click "Create Serverless cache"
3. Choose Redis as the engine
4. Set a name and configure VPC, subnets, and security groups
5. Set optional usage limits (data storage maximum, ECPU per second maximum)

### Via AWS CLI

```bash
aws elasticache create-serverless-cache \
  --serverless-cache-name my-serverless-redis \
  --engine redis \
  --subnet-ids subnet-abc123 subnet-def456 subnet-ghi789 \
  --security-group-ids sg-xyz789 \
  --cache-usage-limits '{
    "DataStorage": {"Maximum": 50, "Unit": "GB"},
    "ECPUPerSecond": {"Maximum": 10000}
  }' \
  --kms-key-id alias/elasticache-redis \
  --region us-east-1
```

The `ECPUPerSecond` limit is a safety cap, not a reservation. Set it high enough to allow bursting.

### Via Terraform

```hcl
resource "aws_elasticache_serverless_cache" "app_cache" {
  engine = "redis"
  name   = "app-serverless-cache"

  # Optional usage limits (safety caps, not reservations)
  cache_usage_limits {
    data_storage {
      maximum = 50   # Max 50 GB stored
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 10000  # Max 10,000 ECPUs/sec
    }
  }

  # Networking
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.redis_sg.id]

  # Security
  kms_key_id = aws_kms_key.elasticache.arn

  # Snapshot settings
  snapshot_retention_limit = 7
  daily_snapshot_time      = "03:00"

  tags = {
    Environment = "production"
  }
}

output "redis_endpoint" {
  value = aws_elasticache_serverless_cache.app_cache.endpoint[0].address
}
```

## Connecting to ElastiCache Serverless

ElastiCache Serverless uses a single endpoint (no configuration endpoint needed). It always requires TLS.

```python
import redis

# Serverless always requires TLS - no auth token needed by default
# but you can add IAM-based auth or VPC security group restrictions
client = redis.Redis(
    host='my-serverless-redis.serverless.use1.cache.amazonaws.com',
    port=6379,
    ssl=True,
    ssl_cert_reqs='required',
    decode_responses=True
)

# Test
client.ping()
print("Connected to ElastiCache Serverless")

# Use exactly like regular Redis
client.set('user:1001', 'Alice', ex=3600)
value = client.get('user:1001')
print(value)
```

```javascript
const Redis = require('ioredis');

const client = new Redis({
  host: 'my-serverless-redis.serverless.use1.cache.amazonaws.com',
  port: 6379,
  tls: {
    rejectUnauthorized: true
  },
  retryStrategy: (times) => Math.min(times * 100, 3000)
});

await client.set('key', 'value', 'EX', 3600);
const val = await client.get('key');
```

## Understanding ECPU Billing

ElastiCache Serverless charges in ECPUs (ElastiCache Processing Units). Different commands consume different amounts.

```text
Command pricing (approximate):
- GET (hit):     1 ECPU
- GET (miss):    1 ECPU
- SET (1 KB):    1 ECPU
- SET (100 KB):  ~100 ECPUs
- HGETALL:       depends on hash size
- SCAN:          1 ECPU per 10 keys returned

Pricing example (us-east-1):
- ECPUs: $0.0000034 per ECPU
- Storage: $0.125 per GB-month

At 1,000 GET commands/sec (all hits):
- 1,000 ECPUs/sec = 86.4M ECPUs/day
- Cost: 86.4M x $0.0000034 = ~$294/day in ECPUs
```

Compare this to provisioned nodes to decide which is cheaper.

## Monitoring Serverless Cache

```bash
# Key CloudWatch metrics for Serverless
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name ElastiCacheProcessingUnits \
  --dimensions Name=ServerlessCacheName,Value=my-serverless-redis \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T01:00:00Z \
  --period 60 \
  --statistics Sum
```

Key Serverless-specific metrics:

- `ElastiCacheProcessingUnits` - ECPU consumption rate
- `BytesUsedForCache` - storage used
- `CacheHits` / `CacheMisses` - hit rate
- `ThrottledCmds` - commands throttled due to ECPU limit

```python
import boto3
from datetime import datetime, timedelta

def check_ecpu_usage(cache_name, hours=1):
    cw = boto3.client('cloudwatch', region_name='us-east-1')
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)

    response = cw.get_metric_statistics(
        Namespace='AWS/ElastiCache',
        MetricName='ElastiCacheProcessingUnits',
        Dimensions=[{'Name': 'ServerlessCacheName', 'Value': cache_name}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Sum']
    )

    total_ecpu = sum(dp['Sum'] for dp in response['Datapoints'])
    cost = total_ecpu * 0.0000034
    print(f"ECPUs consumed: {total_ecpu:,.0f}")
    print(f"Estimated cost: ${cost:.4f}")
    return total_ecpu
```

## When to Use Serverless vs Provisioned

```text
Use Serverless when:
  - Traffic is highly variable (batch jobs, nightly processing)
  - Unpredictable load spikes
  - Multiple low-traffic applications (cost efficiency vs. many small nodes)
  - You want zero capacity management
  - Development/staging environments

Use Provisioned when:
  - Sustained high-throughput (constant thousands of req/sec)
  - Latency under 1ms is critical (Serverless has slightly higher p99 latency)
  - You need cluster mode with specific shard topology
  - Cost at high consistent load is lower with provisioned nodes
```

## Migrating from Provisioned to Serverless

```bash
# Step 1: Create a snapshot of provisioned cluster
aws elasticache create-snapshot \
  --replication-group-id my-provisioned-cluster \
  --snapshot-name migration-to-serverless

# Step 2: Wait for snapshot to complete
aws elasticache describe-snapshots \
  --snapshot-name migration-to-serverless \
  --query 'Snapshots[0].SnapshotStatus'

# Step 3: Import snapshot into Serverless cache
aws elasticache create-serverless-cache \
  --serverless-cache-name my-serverless-redis \
  --engine redis \
  --snapshot-arns-to-restore arn:aws:elasticache:us-east-1:123456789012:snapshot:migration-to-serverless \
  --subnet-ids subnet-abc123 subnet-def456 \
  --security-group-ids sg-xyz789
```

## Summary

ElastiCache Serverless simplifies Redis deployment by eliminating node type selection and shard configuration, automatically scaling to match workload demand. It is billed per ECPU consumed and GB stored, making it cost-effective for variable workloads but potentially more expensive than provisioned nodes for constant high-throughput use cases. Connect to the single serverless endpoint using standard Redis clients with TLS enabled, and monitor ECPU consumption via CloudWatch to track costs and watch for throttling.
