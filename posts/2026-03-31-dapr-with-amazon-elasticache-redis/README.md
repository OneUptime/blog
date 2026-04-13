# How to Use Dapr with Amazon ElastiCache Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, ElastiCache, Redis, State Management, Caching

Description: Configure Dapr state management and pub/sub to use Amazon ElastiCache Redis, enabling fast in-memory storage and messaging for EKS and ECS workloads.

---

Amazon ElastiCache for Redis is a managed in-memory data store that serves as an excellent Dapr state store and pub/sub backend. It provides sub-millisecond latency, automatic failover with cluster mode, and encryption in transit.

## Create an ElastiCache Cluster

```bash
# Create a subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name dapr-redis-subnet \
  --cache-subnet-group-description "Subnet group for Dapr Redis" \
  --subnet-ids subnet-0a1b2c3d subnet-0e4f5a6b \
  --region us-east-1

# Create Redis cluster with replication
aws elasticache create-replication-group \
  --replication-group-id dapr-redis \
  --replication-group-description "Dapr Redis cluster" \
  --cache-node-type cache.r7g.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-clusters 2 \
  --cache-subnet-group-name dapr-redis-subnet \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "YOUR_AUTH_TOKEN_HERE" \
  --region us-east-1

# Get the primary endpoint
aws elasticache describe-replication-groups \
  --replication-group-id dapr-redis \
  --query "ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint"
```

## Configure Dapr State Store with ElastiCache

```bash
# Store Redis auth token as Kubernetes secret
kubectl create secret generic elasticache-secret \
  --from-literal=password="YOUR_AUTH_TOKEN_HERE" \
  --namespace default
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "dapr-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379"
  - name: redisPassword
    secretKeyRef:
      name: elasticache-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
  - name: ttlInSeconds
    value: "3600"
```

## Configure Dapr Pub/Sub with ElastiCache

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redispubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "dapr-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379"
  - name: redisPassword
    secretKeyRef:
      name: elasticache-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{appID}"
```

## Use the State Store

```python
import requests

BASE_URL = "http://localhost:3500/v1.0/state/statestore"

def cache_user_session(session_id: str, user_data: dict, ttl_seconds: int = 3600):
    requests.post(BASE_URL, json=[{
        "key": f"session:{session_id}",
        "value": user_data,
        "metadata": {"ttlInSeconds": str(ttl_seconds)}
    }]).raise_for_status()

def get_user_session(session_id: str) -> dict:
    resp = requests.get(f"{BASE_URL}/session:{session_id}")
    if resp.status_code == 204:
        return None
    resp.raise_for_status()
    return resp.json()

def invalidate_session(session_id: str):
    requests.delete(f"{BASE_URL}/session:{session_id}").raise_for_status()

# Usage
cache_user_session("sess-abc123", {"userId": "user-1", "role": "admin"}, ttl_seconds=1800)
session = get_user_session("sess-abc123")
print(session)
```

## Publish and Subscribe via ElastiCache

```python
# Publisher
import requests

requests.post(
    "http://localhost:3500/v1.0/publish/redispubsub/notifications",
    json={"userId": "user-1", "message": "Your order has shipped"},
    headers={"Content-Type": "application/json"}
).raise_for_status()
```

```python
# Subscriber
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "redispubsub",
        "topic": "notifications",
        "route": "/notifications"
    }])

@app.route('/notifications', methods=['POST'])
def handle_notification():
    notification = request.json.get('data', {})
    print(f"Sending push to {notification['userId']}: {notification['message']}")
    return jsonify({"status": "SUCCESS"})
```

## Summary

Amazon ElastiCache Redis integrates with Dapr as both a state store and pub/sub backend, providing sub-millisecond latency with automatic failover. The ElastiCache auth token is stored as a Kubernetes Secret and referenced in the Dapr component, while TLS encryption ensures data security in transit. For session caching, feature flags, and real-time messaging, ElastiCache Redis with Dapr provides an operationally simple, high-performance solution.
