# How to Connect Memorystore Redis to Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memorystore, Cloud Run, GCP, Serverless

Description: Learn how to connect Google Cloud Run services to Cloud Memorystore for Redis using VPC Access Connector or Direct VPC Egress for private network access.

---

## Why VPC Access Is Required

Memorystore for Redis uses private VPC networking with no public endpoint. Cloud Run services run in Google-managed infrastructure outside your VPC by default. To reach Memorystore, you need to route Cloud Run egress traffic through your VPC using one of:

- **Serverless VPC Access Connector**: A managed resource that bridges Cloud Run to your VPC
- **Direct VPC Egress**: Cloud Run uses VPC IP ranges directly (newer, recommended for new deployments)

## Option 1: Serverless VPC Access Connector

### Create the Connector

```bash
# Create a VPC Access Connector in the same region as Cloud Run
gcloud compute networks vpc-access connectors create redis-connector \
  --region=us-central1 \
  --network=my-vpc \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-micro \
  --project=my-project
```

The `--range` is an unused /28 CIDR block in your VPC for the connector's internal IPs.

### Create Memorystore Instance

```bash
gcloud redis instances create cloudrun-redis \
  --size=2 \
  --region=us-central1 \
  --tier=standard \
  --redis-version=redis_7_0 \
  --auth-enabled \
  --network=projects/my-project/global/networks/my-vpc \
  --project=my-project

REDIS_IP=$(gcloud redis instances describe cloudrun-redis \
  --region=us-central1 \
  --format="value(host)")

REDIS_AUTH=$(gcloud redis instances get-auth-string cloudrun-redis \
  --region=us-central1 \
  --format="value(authString)")
```

### Deploy Cloud Run with Connector

```bash
# Deploy Cloud Run service with VPC connector
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-service:latest \
  --region=us-central1 \
  --vpc-connector=redis-connector \
  --vpc-egress=private-ranges-only \
  --set-env-vars="REDIS_HOST=$REDIS_IP,REDIS_PORT=6379" \
  --set-secrets="REDIS_AUTH=redis-auth:latest" \
  --project=my-project
```

## Option 2: Direct VPC Egress (Recommended)

Direct VPC Egress is simpler and more cost-efficient than VPC Access Connector for new deployments.

```bash
# Deploy Cloud Run with Direct VPC Egress
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-service:latest \
  --region=us-central1 \
  --network=my-vpc \
  --subnet=my-subnet \
  --vpc-egress=private-ranges-only \
  --set-env-vars="REDIS_HOST=$REDIS_IP,REDIS_PORT=6379" \
  --set-secrets="REDIS_AUTH=redis-auth:latest" \
  --project=my-project
```

## Terraform Configuration

```hcl
# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "redis_connector" {
  name          = "redis-connector"
  region        = "us-central1"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name

  min_instances = 2
  max_instances = 10
  machine_type  = "e2-micro"
}

# Memorystore Redis
resource "google_redis_instance" "cloudrun_cache" {
  name           = "cloudrun-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 2
  region         = "us-central1"

  location_id             = "us-central1-a"
  alternative_location_id = "us-central1-b"

  authorized_network = google_compute_network.vpc.id
  auth_enabled       = true
  redis_version      = "REDIS_7_0"
}

# Store auth string in Secret Manager
resource "google_secret_manager_secret" "redis_auth" {
  secret_id = "redis-auth"
  replication { auto {} }
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = google_redis_instance.cloudrun_cache.auth_string
}

# Cloud Run service
resource "google_cloud_run_v2_service" "app" {
  name     = "my-service"
  location = "us-central1"

  template {
    # VPC connector approach
    vpc_access {
      connector = google_vpc_access_connector.redis_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "gcr.io/my-project/my-service:latest"

      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cloudrun_cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = "6379"
      }
      env {
        name = "REDIS_AUTH"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_auth.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
```

## Application Code for Cloud Run

```python
# main.py - Flask app on Cloud Run connecting to Memorystore
import os
import redis
from flask import Flask, jsonify

app = Flask(__name__)

# Initialize Redis client - reused across requests (connection pooling)
redis_client = redis.Redis(
    host=os.environ['REDIS_HOST'],
    port=int(os.environ.get('REDIS_PORT', 6379)),
    password=os.environ.get('REDIS_AUTH'),
    decode_responses=True,
    socket_timeout=2,
    socket_connect_timeout=2,
    retry_on_timeout=True,
    health_check_interval=30
)

@app.route('/health')
def health():
    try:
        redis_client.ping()
        return jsonify({'status': 'ok', 'redis': 'connected'})
    except redis.exceptions.ConnectionError:
        return jsonify({'status': 'degraded', 'redis': 'disconnected'}), 503

@app.route('/cache/<key>')
def get_cache(key):
    value = redis_client.get(f"app:{key}")
    if value:
        return jsonify({'key': key, 'value': value, 'cached': True})
    return jsonify({'key': key, 'value': None, 'cached': False}), 404

@app.route('/cache/<key>/<value>', methods=['POST'])
def set_cache(key, value):
    redis_client.set(f"app:{key}", value, ex=3600)
    return jsonify({'key': key, 'value': value, 'ttl': 3600})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
```

```javascript
// Node.js Express on Cloud Run
const express = require('express');
const Redis = require('ioredis');

const app = express();

// Reuse connection across requests
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_AUTH,
  enableOfflineQueue: false,
  connectTimeout: 2000,
  commandTimeout: 2000,
  retryStrategy: (times) => (times > 5 ? null : Math.min(times * 100, 1000))
});

redis.on('error', (err) => console.error('Redis connection error:', err));

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', redis: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}`));
```

## Granting Secret Manager Access to Cloud Run

```bash
# Get the Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe my-service \
  --region=us-central1 \
  --format="value(spec.template.spec.serviceAccountName)")

# Grant access to the Redis auth secret
gcloud secrets add-iam-policy-binding redis-auth \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project
```

## Testing the Connection

```bash
# Deploy a test revision and check logs
gcloud run services update-traffic my-service \
  --to-latest \
  --region=us-central1

# Tail the logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=my-service" \
  --project=my-project \
  --freshness=5m \
  --format="value(textPayload)" | head -50

# Test the health endpoint
SERVICE_URL=$(gcloud run services describe my-service \
  --region=us-central1 \
  --format="value(status.url)")

curl "$SERVICE_URL/health"
```

## Summary

Cloud Run cannot access Memorystore directly without VPC routing because Memorystore has no public endpoint. Use either a Serverless VPC Access Connector or Direct VPC Egress to route Cloud Run traffic through your VPC. Store the Redis auth string in Secret Manager and inject it as an environment variable using Cloud Run's secrets integration. Reuse the Redis connection object at module/service level rather than creating a new connection per request, since Cloud Run instances handle multiple requests.
