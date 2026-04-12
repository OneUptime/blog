# How to Set Up Memorystore Redis Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GCP, Memorystore, Read Replica, Scalability

Description: Learn how to add read replicas to Memorystore for Redis Standard tier to scale read throughput and distribute cache reads across multiple endpoints.

---

Memorystore for Redis Standard tier supports up to 5 read replicas. Read replicas let you offload read-heavy workloads from the primary and scale read throughput horizontally.

## Requirements

- Standard HA tier (Basic does not support replicas)
- Redis 5.0 or later

## Creating an Instance with Read Replicas

```bash
gcloud redis instances create prod-cache \
  --region=us-central1 \
  --size=10 \
  --tier=standard \
  --redis-version=redis_7_0 \
  --replica-count=3 \
  --read-replicas-mode=read-replicas-enabled
```

## Adding Replicas to an Existing Instance

```bash
gcloud redis instances update prod-cache \
  --region=us-central1 \
  --replica-count=2 \
  --read-replicas-mode=read-replicas-enabled
```

## Getting Endpoint Information

```bash
gcloud redis instances describe prod-cache \
  --region=us-central1 \
  --format="json(host,port,readEndpoint,readEndpointPort)"
```

Output:

```json
{
  "host": "10.0.0.3",
  "port": 6379,
  "readEndpoint": "10.0.0.5",
  "readEndpointPort": 6379
}
```

## Terraform Configuration

```hcl
resource "google_redis_instance" "prod" {
  name                = "prod-cache"
  region              = "us-central1"
  memory_size_gb      = 10
  tier                = "STANDARD_HA"
  redis_version       = "REDIS_7_0"
  replica_count       = 3
  read_replicas_mode  = "READ_REPLICAS_ENABLED"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}

output "primary_endpoint" {
  value = google_redis_instance.prod.host
}

output "read_endpoint" {
  value = google_redis_instance.prod.read_endpoint
}
```

## Python - Separate Read and Write Clients

```python
import redis
import os

# Write to primary
write_client = redis.Redis(
    host=os.environ["REDIS_PRIMARY_HOST"],
    port=6379,
    decode_responses=True,
)

# Read from replica endpoint
read_client = redis.Redis(
    host=os.environ["REDIS_READ_HOST"],
    port=6379,
    decode_responses=True,
)

def set_value(key: str, value: str, ttl: int = 300):
    write_client.setex(key, ttl, value)

def get_value(key: str) -> str | None:
    return read_client.get(key)
```

## Monitoring Replication Lag

```bash
gcloud redis instances describe prod-cache \
  --region=us-central1 \
  --format="json(replicationInfo)"
```

You can also monitor replication metrics in the Cloud Console via Metrics Explorer. Key metric: `redis.googleapis.com/replication/offset_diff` - the number of bytes the replica is behind the primary. Large values indicate replication lag.

## When to Use Read Replicas

- Read:write ratio is 5:1 or higher
- You need to scale reads beyond single-instance throughput
- You want geographic distribution of cache reads (pair with zone-specific replicas)

## Summary

Memorystore for Redis read replicas distribute read traffic across up to 5 replica nodes. Use separate client connections for writes (primary endpoint) and reads (read endpoint). Monitor replication offset lag to ensure replicas are not falling behind. For most read-heavy caching workloads, 1-2 replicas significantly improve throughput without increasing primary load.
