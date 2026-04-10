# How to Set Up Redis Cross-Region Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, High Availability, Disaster Recovery, Cloud, Replication

Description: Learn how to configure Redis cross-region replication and automate failover so your application survives a full regional outage with minimal downtime.

---

A single-region Redis deployment cannot survive a regional cloud outage. Cross-region failover ensures your application can redirect traffic to a Redis instance in another region when the primary region becomes unavailable.

## Architecture Overview

```text
Primary Region (us-east-1)
  Redis Primary: redis-primary.us-east-1.internal

Secondary Region (us-west-2)
  Redis Replica: redis-replica.us-west-2.internal
  (reads from primary over private cross-region link)

DNS / Load Balancer
  redis.myapp.com -> us-east-1 (normal)
  redis.myapp.com -> us-west-2 (during failover)
```

## Step 1: Set Up Cross-Region Replication

### AWS ElastiCache Global Datastore

ElastiCache Global Datastore provides managed cross-region replication:

```bash
# Create a global datastore from your existing cluster
aws elasticache create-global-replication-group \
  --global-replication-group-id-suffix my-app \
  --primary-replication-group-id my-redis-east \
  --global-replication-group-description "Cross-region Redis"

# Add a secondary replication group in us-west-2
aws elasticache create-replication-group \
  --replication-group-id my-redis-west \
  --global-replication-group-id ldgnf-my-app \
  --replication-group-description "West replica" \
  --num-cache-clusters 1 \
  --region us-west-2
```

Replication lag is typically 1-2 seconds over inter-region links.

### Self-Managed Redis with REPLICAOF

For self-managed Redis, set up replication across regions:

```bash
# On the secondary Redis instance in us-west-2
redis-cli REPLICAOF redis-primary.us-east-1.internal 6379
```

Ensure cross-region traffic is encrypted using TLS or a VPN tunnel.

## Step 2: Configure Your Application for Failover

Use a Redis client that supports multiple endpoints with health checking:

```python
import redis

# Multi-region connection with fallback
def get_redis_connection():
    try:
        r = redis.Redis(
            host="redis-primary.us-east-1.internal",
            port=6379,
            socket_connect_timeout=1,
            socket_timeout=1
        )
        r.ping()
        return r
    except redis.exceptions.ConnectionError:
        # Fall back to secondary region
        return redis.Redis(
            host="redis-replica.us-west-2.internal",
            port=6379
        )
```

## Step 3: Automate DNS-Based Failover

Use Route 53 health checks to automatically redirect traffic:

```bash
# Create a health check for the primary Redis endpoint
aws route53 create-health-check \
  --caller-reference "redis-primary-$(date +%s)" \
  --health-check-config '{
    "IPAddress": "203.0.113.50",
    "Port": 6379,
    "Type": "TCP",
    "RequestInterval": 10,
    "FailureThreshold": 3
  }'
```

Route 53 health checkers run from public AWS infrastructure, so the `IPAddress` must be a public IP that the health checkers can reach. For endpoints inside a VPC, use a CloudWatch alarm-based health check instead.

Then create a failover routing policy in Route 53 with PRIMARY (us-east-1) and SECONDARY (us-west-2) records tied to the health check.

## Step 4: Promote the Replica During Failover

When the primary region is down, promote the replica to accept writes:

```bash
# On the secondary Redis instance
redis-cli REPLICAOF NO ONE

# Verify it is now a primary
redis-cli INFO replication | grep role
# role:master
```

For ElastiCache Global Datastore, cross-region failover must be triggered manually:

```bash
aws elasticache failover-global-replication-group \
  --global-replication-group-id ldgnf-my-app \
  --primary-region us-west-2 \
  --primary-replication-group-id my-redis-west
```

## Step 5: Monitor Replication Lag

Alert when replication lag exceeds your RPO threshold:

```bash
redis-cli INFO replication | grep master_repl_offset
redis-cli INFO replication | grep slave_repl_offset
```

Set up a OneUptime monitor that triggers an alert if replication lag exceeds 5 seconds, indicating a risk to your recovery objectives.

## Summary

Redis cross-region failover requires a replica in a secondary region, application-level fallback logic, and automated DNS failover. AWS ElastiCache Global Datastore automates most of the heavy lifting for managed deployments. Always test failover procedures in staging before relying on them in production.
