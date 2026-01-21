# How to Set Up Google Cloud Memorystore for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Google Cloud, GCP, Memorystore, Caching, DevOps, Infrastructure

Description: A comprehensive guide to deploying and configuring Google Cloud Memorystore for Redis, covering instance setup, networking, security, and integration with GCP services.

---

Google Cloud Memorystore for Redis is a fully managed Redis service that provides a highly available, scalable, and secure Redis instance for your applications on Google Cloud Platform. This guide covers everything you need to know to set up and optimize Memorystore for production workloads.

## Why Use Memorystore for Redis?

Memorystore for Redis offers several advantages:

- **Fully Managed**: Google handles all operational tasks including patching and updates
- **High Availability**: Automatic failover with cross-zone replication
- **Sub-millisecond Latency**: Low-latency access for your GCP workloads
- **Seamless Integration**: Native integration with GKE, Cloud Functions, and other GCP services
- **Two Tiers**: Basic (development) and Standard (production with HA)

## Understanding Memorystore Tiers

| Tier | Use Case | High Availability | Automatic Failover |
|------|----------|-------------------|-------------------|
| Basic | Development, Testing | No | No |
| Standard | Production | Yes (cross-zone) | Yes |

## Prerequisites

Before starting, ensure you have:

- A Google Cloud project with billing enabled
- gcloud CLI installed and configured
- Appropriate IAM permissions (roles/redis.admin)
- A VPC network configured

## Creating a Memorystore Instance

### Using gcloud CLI

#### Basic Tier (Development)

```bash
# Create a Basic tier instance
gcloud redis instances create my-redis-basic \
    --size=1 \
    --region=us-central1 \
    --tier=basic \
    --redis-version=redis_7_0 \
    --network=projects/my-project/global/networks/default
```

#### Standard Tier (Production)

```bash
# Create a Standard tier instance with high availability
gcloud redis instances create my-redis-prod \
    --size=5 \
    --region=us-central1 \
    --tier=standard \
    --redis-version=redis_7_0 \
    --network=projects/my-project/global/networks/my-vpc \
    --connect-mode=private-service-access \
    --transit-encryption-mode=server-authentication \
    --auth-enabled \
    --maintenance-window-day=sunday \
    --maintenance-window-hour=2 \
    --labels=env=production,team=platform
```

#### With Read Replicas

```bash
# Create instance with read replicas for read scaling
gcloud redis instances create my-redis-replicas \
    --size=5 \
    --region=us-central1 \
    --tier=standard \
    --redis-version=redis_7_0 \
    --network=projects/my-project/global/networks/my-vpc \
    --replica-count=2 \
    --read-replicas-mode=read-replicas-enabled \
    --transit-encryption-mode=server-authentication \
    --auth-enabled
```

### Using Terraform

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

# Enable required APIs
resource "google_project_service" "redis" {
  service            = "redis.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "main" {
  name                    = "redis-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "redis-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Private Service Access for Memorystore
resource "google_compute_global_address" "redis_range" {
  name          = "redis-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "redis" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.redis_range.name]
}

# Basic Tier Instance
resource "google_redis_instance" "basic" {
  name           = "my-redis-basic"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  redis_version = "REDIS_7_0"

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  depends_on = [google_service_networking_connection.redis]

  labels = {
    environment = "development"
  }
}

# Standard Tier Instance with HA
resource "google_redis_instance" "standard" {
  name           = "my-redis-prod"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.region

  redis_version = "REDIS_7_0"

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  transit_encryption_mode = "SERVER_AUTHENTICATION"
  auth_enabled            = true

  # Read replicas
  replica_count       = 2
  read_replicas_mode  = "READ_REPLICAS_ENABLED"

  # Maintenance window
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }

  # Redis configuration
  redis_configs = {
    maxmemory-policy = "volatile-lru"
    notify-keyspace-events = "Ex"
  }

  depends_on = [google_service_networking_connection.redis]

  labels = {
    environment = "production"
  }
}

# Outputs
output "redis_host" {
  value = google_redis_instance.standard.host
}

output "redis_port" {
  value = google_redis_instance.standard.port
}

output "redis_auth_string" {
  value     = google_redis_instance.standard.auth_string
  sensitive = true
}

output "read_endpoint" {
  value = google_redis_instance.standard.read_endpoint
}
```

## Connecting to Memorystore

### Getting Connection Information

```bash
# Get instance details
gcloud redis instances describe my-redis-prod --region=us-central1

# Get just the host and port
gcloud redis instances describe my-redis-prod \
    --region=us-central1 \
    --format="value(host,port)"

# Get the auth string (if auth is enabled)
gcloud redis instances get-auth-string my-redis-prod --region=us-central1
```

### Python Connection Example

```python
import os
import redis

def get_memorystore_connection():
    """Connect to Memorystore for Redis"""
    return redis.Redis(
        host=os.environ['REDIS_HOST'],
        port=int(os.environ.get('REDIS_PORT', 6379)),
        password=os.environ.get('REDIS_AUTH_STRING'),
        ssl=True,  # If transit encryption is enabled
        ssl_cert_reqs='required',
        decode_responses=True
    )

# With connection pooling
def get_redis_pool():
    """Create a connection pool for better performance"""
    pool = redis.ConnectionPool(
        host=os.environ['REDIS_HOST'],
        port=int(os.environ.get('REDIS_PORT', 6379)),
        password=os.environ.get('REDIS_AUTH_STRING'),
        ssl=True,
        max_connections=25,
        decode_responses=True
    )
    return redis.Redis(connection_pool=pool)

# Usage
redis_client = get_memorystore_connection()
redis_client.set('greeting', 'Hello from Memorystore!')
print(redis_client.get('greeting'))
```

### Node.js Connection Example

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_AUTH_STRING,
  tls: {
    // Enable if transit encryption is on
    rejectUnauthorized: false
  },
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Memorystore');
});

// Usage with async/await
async function example() {
  await redis.connect();
  await redis.set('key', 'value');
  const value = await redis.get('key');
  console.log(`Value: ${value}`);
}

example();
```

### Go Connection Example

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"
    "os"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    host := os.Getenv("REDIS_HOST")
    port := os.Getenv("REDIS_PORT")
    if port == "" {
        port = "6379"
    }

    rdb := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:%s", host, port),
        Password: os.Getenv("REDIS_AUTH_STRING"),
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    })

    // Test connection
    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Ping: %s\n", pong)

    // Set and get value
    err = rdb.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Value: %s\n", val)
}
```

## Connecting from GKE

### Create a Kubernetes Secret for Credentials

```bash
# Get the auth string
AUTH_STRING=$(gcloud redis instances get-auth-string my-redis-prod \
    --region=us-central1 \
    --format="value(authString)")

# Create the secret
kubectl create secret generic redis-credentials \
    --from-literal=host=10.0.0.3 \
    --from-literal=port=6379 \
    --from-literal=auth-string=$AUTH_STRING
```

### Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-client-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-client
  template:
    metadata:
      labels:
        app: redis-client
    spec:
      containers:
      - name: app
        image: my-app:latest
        env:
        - name: REDIS_HOST
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: host
        - name: REDIS_PORT
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: port
        - name: REDIS_AUTH_STRING
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: auth-string
```

## Connecting from Cloud Functions

```python
import os
import redis
import functions_framework

# Create Redis client outside handler for connection reuse
redis_client = None

def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = redis.Redis(
            host=os.environ['REDIS_HOST'],
            port=int(os.environ.get('REDIS_PORT', 6379)),
            password=os.environ.get('REDIS_AUTH_STRING'),
            decode_responses=True
        )
    return redis_client

@functions_framework.http
def hello_redis(request):
    client = get_redis_client()

    # Increment a counter
    count = client.incr('visit_count')

    return f'This page has been visited {count} times.'
```

Configure the function with VPC connector:

```bash
gcloud functions deploy hello-redis \
    --runtime=python311 \
    --trigger-http \
    --allow-unauthenticated \
    --vpc-connector=projects/my-project/locations/us-central1/connectors/my-connector \
    --set-env-vars=REDIS_HOST=10.0.0.3,REDIS_PORT=6379
```

## Configuring Read Replicas

For read-heavy workloads, use read replicas to scale read operations:

```hcl
resource "google_redis_instance" "with_replicas" {
  name           = "my-redis-read-scaling"
  tier           = "STANDARD_HA"
  memory_size_gb = 10
  region         = var.region

  redis_version = "REDIS_7_0"

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  # Enable read replicas
  replica_count      = 5
  read_replicas_mode = "READ_REPLICAS_ENABLED"

  depends_on = [google_service_networking_connection.redis]
}
```

### Connecting to Read Endpoint

```python
import redis

def get_redis_clients():
    """Create separate clients for read and write operations"""

    # Primary for writes
    write_client = redis.Redis(
        host=os.environ['REDIS_HOST'],
        port=6379,
        password=os.environ['REDIS_AUTH_STRING'],
        decode_responses=True
    )

    # Read endpoint for reads
    read_client = redis.Redis(
        host=os.environ['REDIS_READ_ENDPOINT'],
        port=6379,
        password=os.environ['REDIS_AUTH_STRING'],
        decode_responses=True
    )

    return write_client, read_client

# Usage
write_client, read_client = get_redis_clients()
write_client.set('data', 'value')
value = read_client.get('data')  # Read from replica
```

## Monitoring with Cloud Monitoring

### Creating Alerts

```hcl
resource "google_monitoring_alert_policy" "redis_memory" {
  display_name = "Redis Memory Usage High"
  combiner     = "OR"

  conditions {
    display_name = "Memory usage exceeds 80%"

    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "604800s"
  }
}

resource "google_monitoring_alert_policy" "redis_connections" {
  display_name = "Redis Connections High"
  combiner     = "OR"

  conditions {
    display_name = "Connected clients exceeds threshold"

    condition_threshold {
      filter          = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/clients/connected\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Redis Alerts Email"
  type         = "email"

  labels = {
    email_address = "ops@example.com"
  }
}
```

### Custom Dashboard

```hcl
resource "google_monitoring_dashboard" "redis" {
  dashboard_json = jsonencode({
    displayName = "Memorystore Redis Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "Memory Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
                }
              }
            }]
          }
        },
        {
          title = "Connected Clients"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/clients/connected\""
                }
              }
            }]
          }
        },
        {
          title = "Commands per Second"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/calls\""
                }
              }
            }]
          }
        },
        {
          title = "Hit Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/keyspace_hits\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

## Scaling Memorystore

### Vertical Scaling (Change Size)

```bash
# Scale up memory
gcloud redis instances update my-redis-prod \
    --size=10 \
    --region=us-central1

# Scale with minimal disruption
gcloud redis instances update my-redis-prod \
    --size=10 \
    --region=us-central1 \
    --async
```

### Horizontal Scaling (Add Replicas)

```bash
# Add read replicas
gcloud redis instances update my-redis-prod \
    --replica-count=5 \
    --region=us-central1
```

## Import and Export Data

### Export to Cloud Storage

```bash
# Export RDB snapshot
gcloud redis instances export my-redis-prod \
    --region=us-central1 \
    gs://my-bucket/redis-backup.rdb
```

### Import from Cloud Storage

```bash
# Import RDB snapshot
gcloud redis instances import my-redis-prod \
    --region=us-central1 \
    gs://my-bucket/redis-backup.rdb
```

## Security Best Practices

### 1. Enable AUTH

```bash
gcloud redis instances update my-redis-prod \
    --auth-enabled \
    --region=us-central1
```

### 2. Enable Transit Encryption

```bash
gcloud redis instances update my-redis-prod \
    --transit-encryption-mode=server-authentication \
    --region=us-central1
```

### 3. Use Private Service Access

Always use private service access instead of direct peering for better security isolation:

```hcl
resource "google_redis_instance" "secure" {
  name           = "secure-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.region

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"  # Recommended

  transit_encryption_mode = "SERVER_AUTHENTICATION"
  auth_enabled            = true

  depends_on = [google_service_networking_connection.redis]
}
```

### 4. Use IAM for Access Control

```hcl
resource "google_project_iam_member" "redis_viewer" {
  project = var.project_id
  role    = "roles/redis.viewer"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "redis_admin" {
  project = var.project_id
  role    = "roles/redis.admin"
  member  = "group:redis-admins@example.com"
}
```

## Cost Optimization Tips

1. **Right-size instances**: Start small and scale based on actual usage
2. **Use Basic tier for development**: Save costs on non-production workloads
3. **Monitor memory usage**: Avoid over-provisioning memory
4. **Use read replicas wisely**: Only add replicas if you have read-heavy workloads
5. **Set appropriate TTLs**: Prevent unbounded memory growth
6. **Consider committed use discounts**: For predictable, long-term workloads

## Conclusion

Google Cloud Memorystore for Redis provides a robust, fully managed Redis solution that integrates seamlessly with the GCP ecosystem. By following this guide, you can set up a production-ready Redis instance with proper security, monitoring, and scalability configurations.

Key takeaways:

- Choose Standard tier for production workloads requiring high availability
- Use Private Service Access for secure network connectivity
- Enable AUTH and transit encryption for security
- Implement read replicas for read-heavy workloads
- Set up Cloud Monitoring alerts for proactive monitoring

For advanced configurations and enterprise deployments, consult the Google Cloud documentation and consider working with Google Cloud support for complex architectures.
