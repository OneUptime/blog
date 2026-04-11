# How to Configure Memorystore for Redis HA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memorystore, GCP, High Availability, Google Cloud

Description: Learn how to configure Google Cloud Memorystore for Redis with high availability using read replicas and automatic failover to protect against node failures.

---

## Memorystore Redis High Availability Options

Google Cloud Memorystore for Redis supports two service tiers:

- **Basic tier**: Single node, no replicas, no failover - suitable for development only
- **Standard tier**: Primary node with one read replica, automatic failover within the same region

The Standard tier provides 99.9% availability SLA and can automatically promote the replica to primary if the primary fails.

## Creating a Standard Tier Instance (HA)

### Via gcloud CLI

```bash
# Create a Standard tier instance with HA
gcloud redis instances create my-redis-ha \
  --size=5 \
  --region=us-central1 \
  --zone=us-central1-a \
  --alternative-zone=us-central1-b \
  --tier=standard \
  --redis-version=redis_7_0 \
  --enable-auth \
  --transit-encryption-mode=SERVER_AUTHENTICATION \
  --network=projects/my-project/global/networks/my-vpc \
  --project=my-project

# View the instance details including primary and replica endpoints
gcloud redis instances describe my-redis-ha \
  --region=us-central1 \
  --project=my-project
```

The `--zone` is where the primary runs, `--alternative-zone` is where the replica runs. Use zones in different failure domains for maximum resilience.

### Via Terraform

```hcl
resource "google_redis_instance" "ha" {
  name           = "my-redis-ha"
  tier           = "STANDARD_HA"  # HA tier with automatic failover
  memory_size_gb = 5
  region         = "us-central1"

  location_id         = "us-central1-a"  # Primary zone
  alternative_location_id = "us-central1-b"  # Replica zone

  redis_version = "REDIS_7_0"

  # Security
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # Network
  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}

output "redis_host" {
  value = google_redis_instance.ha.host
}

output "redis_port" {
  value = google_redis_instance.ha.port
}

output "redis_auth_string" {
  value     = google_redis_instance.ha.auth_string
  sensitive = true
}
```

## Connecting to Memorystore HA

Memorystore provides a single primary endpoint. After failover, the same IP address remains accessible because Google Cloud promotes the replica and updates the IP binding internally.

### Python

```python
import redis
import ssl

# Get the auth string from Secret Manager or Terraform output
AUTH_STRING = "your-auth-string"
REDIS_HOST = "10.0.0.5"  # Private IP from Memorystore

# With auth and TLS
client = redis.Redis(
    host=REDIS_HOST,
    port=6378,  # Memorystore uses 6378 for TLS (6379 for non-TLS)
    password=AUTH_STRING,
    ssl=True,
    ssl_cert_reqs=ssl.CERT_NONE,  # Memorystore uses Google-managed cert
    decode_responses=True
)

# Test connection
client.ping()
```

### Node.js

```javascript
const Redis = require('ioredis');

const client = new Redis({
  host: '10.0.0.5',
  port: 6378,  // TLS port
  password: process.env.REDIS_AUTH_STRING,
  tls: {
    rejectUnauthorized: false  // Memorystore cert
  },
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: true
});

client.on('connect', () => console.log('Connected to Memorystore'));
client.on('error', (err) => console.error('Redis error:', err));
```

### Go

```go
package main

import (
    "crypto/tls"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func newRedisClient(host, password string) *redis.Client {
    return redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:6378", host),
        Password: password,
        TLSConfig: &tls.Config{
            InsecureSkipVerify: true, // Memorystore uses internal CA
        },
    })
}
```

## Understanding Failover Behavior

When the primary node fails, Memorystore automatically:

1. Detects the primary is unreachable (within ~30 seconds)
2. Promotes the replica to primary
3. Creates a new replica in the original primary's zone
4. Redirects the existing endpoint to the new primary (IP address stays the same)

```python
import time
import redis

def monitor_redis_availability(host, password, duration_seconds=300):
    """Monitor Redis availability during a failover"""
    client = redis.Redis(
        host=host,
        port=6378,
        password=password,
        ssl=True,
        ssl_cert_reqs='none',
        socket_timeout=2,
        socket_connect_timeout=2
    )

    client.set('health-check', 'ok')
    start = time.time()
    errors = 0
    last_error_time = None

    while time.time() - start < duration_seconds:
        try:
            val = client.get('health-check')
            if last_error_time:
                recovery_time = time.time() - last_error_time
                print(f"Recovered after {recovery_time:.1f}s")
                last_error_time = None
        except Exception as e:
            errors += 1
            if not last_error_time:
                last_error_time = time.time()
                print(f"Outage started: {e}")
        time.sleep(0.5)

    print(f"Total error count: {errors}")
```

## Manual Failover Testing

```bash
# Trigger a manual failover to test HA behavior
gcloud redis instances failover my-redis-ha \
  --region=us-central1 \
  --data-protection-mode=force-data-loss \
  --project=my-project

# Or limited data loss mode (safer, may not failover if too much data at risk)
gcloud redis instances failover my-redis-ha \
  --region=us-central1 \
  --data-protection-mode=limited-data-loss \
  --project=my-project
```

The `force-data-loss` mode will fail over regardless of replication lag. Use `limited-data-loss` for production - it only fails over if less than 30 MB of data is pending replication.

## Monitoring Memorystore HA

Key Cloud Monitoring metrics for Memorystore HA:

```bash
# View replication lag using gcloud
gcloud monitoring metrics list \
  --filter="metric.type=redis.googleapis.com/replication/master/slaves/lag"
```

Important metrics:
- `redis.googleapis.com/replication/master/slaves/lag` - replication lag in seconds
- `redis.googleapis.com/stats/memory/usage_ratio` - memory usage ratio
- `redis.googleapis.com/server/uptime` - uptime, resets on failover

```python
from google.cloud import monitoring_v3
from datetime import datetime, timedelta

def get_replication_lag(instance_name, project_id, region):
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    interval = monitoring_v3.TimeInterval(
        end_time={"seconds": int(datetime.utcnow().timestamp())},
        start_time={"seconds": int((datetime.utcnow() - timedelta(minutes=5)).timestamp())}
    )

    results = client.list_time_series(
        request={
            "name": project_name,
            "filter": (
                f'metric.type="redis.googleapis.com/replication/master/slaves/lag" '
                f'AND resource.labels.instance_id="{instance_name}"'
            ),
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        }
    )

    for result in results:
        for point in result.points:
            lag = point.value.int64_value
            if lag > 10:
                print(f"WARNING: High replication lag: {lag}s")
            return lag
    return None
```

## Summary

Google Cloud Memorystore for Redis Standard tier provides high availability through primary-replica replication across two zones with automatic failover. Create Standard tier instances using `--tier=standard` with primary and secondary zone specified in different failure domains. The same endpoint IP remains accessible after failover because Google Cloud handles the IP rebinding internally. Enable auth and TLS for production, and test failover behavior with `gcloud redis instances failover` using the `limited-data-loss` data protection mode.
