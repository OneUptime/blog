# How to Connect Memorystore Redis to Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GCP, Cloud Function, Memorystore, Serverless

Description: Learn how to connect GCP Cloud Functions to Memorystore for Redis using VPC Connector for low-latency serverless caching and rate limiting workloads.

---

Cloud Functions (1st and 2nd gen) connect to Memorystore for Redis through a VPC connector since Memorystore instances are only accessible within a VPC. Without the connector, your function cannot reach the Redis instance.

## Step 1: Create a VPC Connector

```bash
gcloud compute networks vpc-access connectors create redis-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28
```

## Step 2: Deploy a Cloud Function with VPC Connector

```bash
gcloud functions deploy cache-function \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=handle_request \
  --trigger-http \
  --allow-unauthenticated \
  --vpc-connector=redis-connector \
  --egress-settings=private-ranges-only \
  --set-env-vars="REDIS_HOST=10.0.0.3,REDIS_PORT=6379"
```

## Python Function with Connection Reuse

```python
import redis
import os
import json
import functions_framework

# Module-level client - reused across warm invocations
_redis_client = None

def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.environ["REDIS_HOST"],
            port=int(os.environ.get("REDIS_PORT", 6379)),
            socket_connect_timeout=2,
            socket_timeout=2,
            decode_responses=True,
        )
    return _redis_client

@functions_framework.http
def handle_request(request):
    r = get_redis()
    user_id = request.args.get("user_id", "unknown")
    cache_key = f"user:{user_id}:data"

    cached = r.get(cache_key)
    if cached:
        return json.dumps({"source": "cache", "data": json.loads(cached)})

    # Simulate expensive operation
    data = {"id": user_id, "balance": 1000}
    r.setex(cache_key, 300, json.dumps(data))
    return json.dumps({"source": "compute", "data": data})
```

## requirements.txt

```text
functions-framework==3.5.0
redis==5.0.1
```

## Terraform: Cloud Function with VPC Connector

```hcl
resource "google_vpc_access_connector" "redis" {
  name          = "redis-connector"
  region        = "us-central1"
  network       = "default"
  ip_cidr_range = "10.8.0.0/28"
}

resource "google_cloudfunctions2_function" "cache_fn" {
  name     = "cache-function"
  location = "us-central1"

  build_config {
    runtime     = "python312"
    entry_point = "handle_request"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory = "256M"
    environment_variables = {
      REDIS_HOST = google_redis_instance.main.host
      REDIS_PORT = tostring(google_redis_instance.main.port)
    }
    vpc_connector = google_vpc_access_connector.redis.id
    vpc_connector_egress_settings = "PRIVATE_RANGES_ONLY"
  }
}
```

## Getting the Memorystore Host

```bash
gcloud redis instances describe my-redis \
  --region=us-central1 \
  --format="value(host)"
```

## Summary

Cloud Functions connect to Memorystore Redis via a VPC Access Connector that bridges the serverless environment to your VPC. Deploy with `--vpc-connector` and `--egress-settings=private-ranges-only` to route only private traffic through the connector. Initialize the Redis client at module level to reuse connections across warm invocations and minimize per-request overhead.
