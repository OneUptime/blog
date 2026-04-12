# How to Choose Memorystore for Redis Tier and Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GCP, Memorystore, Tier Selection, Architecture

Description: Learn how to choose between Memorystore for Redis Basic and Standard tiers, pick the right capacity, and size your instance based on memory requirements and availability needs.

---

Memorystore for Redis offers two tiers - Basic and Standard. The right choice depends on whether you need high availability and how much memory your dataset requires.

## Tier Comparison

| Feature | Basic | Standard |
|---|---|---|
| Replication | No | Yes (1 replica) |
| Automatic Failover | No | Yes |
| SLA | None | 99.9% |
| Read Replicas | No | Up to 5 |
| Max Capacity | 300 GB | 300 GB |
| Use Case | Dev/Test | Production |

## Available Capacity Sizes

Memorystore instances can be any integer size from 1 GB to 300 GB. Common sizes include:

```text
1, 2, 4, 5, 10, 16, 20, 25, 50, 100, 150, 200, 250, 300 GB
```

## Estimating Memory Requirements

```python
# Rough memory estimation helper
def estimate_redis_memory(
    num_keys: int,
    avg_key_size_bytes: int,
    avg_value_size_bytes: int,
    overhead_factor: float = 1.5  # Redis per-key overhead
) -> float:
    raw_bytes = num_keys * (avg_key_size_bytes + avg_value_size_bytes)
    with_overhead = raw_bytes * overhead_factor
    gb = with_overhead / (1024 ** 3)
    return gb

# Example: 10 million keys, 50-byte keys, 200-byte values
needed_gb = estimate_redis_memory(10_000_000, 50, 200)
print(f"Estimated memory needed: {needed_gb:.1f} GB")
# Result: ~3.5 GB, choose 4 GB instance for headroom
```

## Creating a Basic Tier Instance

```bash
gcloud redis instances create dev-cache \
  --region=us-central1 \
  --zone=us-central1-a \
  --size=2 \
  --tier=BASIC \
  --redis-version=redis_7_0
```

## Creating a Standard Tier Instance

```bash
gcloud redis instances create prod-cache \
  --region=us-central1 \
  --size=10 \
  --tier=STANDARD_HA \
  --redis-version=redis_7_0 \
  --replica-count=1
```

## Terraform

```hcl
resource "google_redis_instance" "prod" {
  name           = "prod-cache"
  region         = "us-central1"
  memory_size_gb = 10
  tier           = "STANDARD_HA"
  redis_version  = "REDIS_7_0"
  replica_count  = 1
  read_replicas_mode = "READ_REPLICAS_ENABLED"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  labels = {
    environment = "production"
  }
}
```

## Resizing an Existing Instance

```bash
# Increase size from 10 GB to 20 GB (online, no downtime for Standard)
gcloud redis instances update prod-cache \
  --region=us-central1 \
  --size=20
```

## Decision Guide

```text
Dev/Test?                          -> Basic, 1-4 GB
Low-traffic production?            -> Standard, 4-10 GB
Medium production with caching?    -> Standard, 10-25 GB
Large session store / full dataset -> Standard, 50+ GB
```

## Summary

Choose Standard tier for any production workload - it provides replication and automatic failover for a modest price premium over Basic. Size your instance by estimating key count times average entry size, multiplied by 1.5x for Redis overhead, then add 20-30% headroom. You can resize a Standard instance online without downtime.
