# How to Connect Memorystore Redis to GKE Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memorystore, GKE, Kubernetes, Google Cloud

Description: Learn how to connect Google Kubernetes Engine workloads to Cloud Memorystore for Redis securely using VPC networking and Kubernetes Secrets.

---

## Prerequisites and Architecture

Memorystore for Redis uses private VPC networking - there is no public endpoint. GKE clusters on the same VPC (or a peered VPC) can connect to Memorystore directly via the instance's private IP.

Architecture:
```text
GKE Cluster (10.0.0.0/14)
  Pod CIDR: 10.4.0.0/14
  Service CIDR: 10.8.0.0/14
         |
         | VPC networking (same VPC or peered)
         |
Memorystore Redis
  Private IP: 10.100.0.3
  Port: 6379 (TLS uses the same port)
```

## Creating Memorystore in the Same VPC as GKE

```bash
# Get the GKE cluster's VPC network
GKE_NETWORK=$(gcloud container clusters describe my-gke-cluster \
  --region=us-central1 \
  --format="value(network)")

echo "GKE Network: $GKE_NETWORK"

# Create Memorystore in the same VPC
gcloud redis instances create gke-redis \
  --size=5 \
  --region=us-central1 \
  --zone=us-central1-a \
  --alternative-zone=us-central1-b \
  --tier=standard \
  --redis-version=redis_7_0 \
  --auth-enabled \
  --network="projects/my-project/global/networks/$GKE_NETWORK" \
  --project=my-project

# Get the Redis instance IP
REDIS_IP=$(gcloud redis instances describe gke-redis \
  --region=us-central1 \
  --format="value(host)")

REDIS_AUTH=$(gcloud redis instances get-auth-string gke-redis \
  --region=us-central1 \
  --format="value(authString)")

echo "Redis IP: $REDIS_IP"
```

## Storing Redis Credentials in Kubernetes Secrets

```bash
# Create a secret with Redis connection details
kubectl create secret generic redis-credentials \
  --from-literal=host="$REDIS_IP" \
  --from-literal=port="6379" \
  --from-literal=auth="$REDIS_AUTH" \
  --namespace=production

# Verify the secret
kubectl get secret redis-credentials -n production -o jsonpath='{.data}' | \
  python3 -c "import sys,json,base64; d=json.load(sys.stdin); \
  [print(k,'=',base64.b64decode(v).decode()) for k,v in d.items()]"
```

## Referencing Redis Credentials in Deployments

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: gcr.io/my-project/my-app:latest
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
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: auth
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

## Using External Secrets Operator with Secret Manager

For production, store secrets in Google Secret Manager and sync to Kubernetes using External Secrets Operator.

```bash
# Store Redis credentials in Secret Manager
gcloud secrets create redis-host --replication-policy="automatic" --project=my-project
echo -n "$REDIS_IP" | gcloud secrets versions add redis-host --data-file=-

gcloud secrets create redis-auth --replication-policy="automatic" --project=my-project
echo -n "$REDIS_AUTH" | gcloud secrets versions add redis-auth --data-file=-
```

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redis-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-store
    kind: SecretStore
  target:
    name: redis-credentials
    creationPolicy: Owner
  data:
    - secretKey: host
      remoteRef:
        key: redis-host
    - secretKey: auth
      remoteRef:
        key: redis-auth
```

## Application Code in Kubernetes

```python
# app.py - connecting to Memorystore from a GKE pod
import os
import redis

def create_redis_client():
    host = os.environ['REDIS_HOST']
    port = int(os.environ.get('REDIS_PORT', '6379'))
    password = os.environ.get('REDIS_PASSWORD')

    return redis.Redis(
        host=host,
        port=port,
        password=password,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
        retry_on_timeout=True,
        health_check_interval=30
    )

# Initialize at module level - connection pool is reused across requests
redis_client = create_redis_client()
```

```javascript
// app.js - Node.js connecting to Memorystore from GKE
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 10) return null;  // Stop retrying after 10 attempts
    return Math.min(times * 200, 5000);
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;  // Reconnect after failover
    }
  }
});
```

## NetworkPolicy: Restricting Redis Access to Authorized Pods

```yaml
# network-policy.yaml - Only allow specific pods to reach Redis
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-redis-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      redis-access: "true"  # Only pods with this label can reach Redis
  egress:
    - to:
        - ipBlock:
            cidr: "10.100.0.3/32"  # Memorystore private IP
      ports:
        - protocol: TCP
          port: 6379
  policyTypes:
    - Egress
```

```yaml
# Apply label to authorized deployments
# In your deployment spec:
spec:
  template:
    metadata:
      labels:
        app: my-app
        redis-access: "true"  # Grant Redis access
```

## Testing Connectivity from a Pod

```bash
# Run a temporary pod to test Redis connectivity
kubectl run redis-test \
  --image=redis:7 \
  --rm -it \
  --restart=Never \
  --namespace=production \
  -- redis-cli -h $REDIS_IP -a $REDIS_AUTH ping

# Or use a more interactive debug pod
kubectl run debug \
  --image=redis:7 \
  --rm -it \
  --restart=Never \
  --namespace=production \
  -- /bin/bash

# Inside the pod:
# redis-cli -h 10.100.0.3 -a "your-auth-string" ping
# redis-cli -h 10.100.0.3 -a "your-auth-string" info server
```

## Memorystore Terraform + GKE Integration

```hcl
# Ensure Memorystore is in the same network as GKE
data "google_container_cluster" "gke" {
  name     = "my-gke-cluster"
  location = "us-central1"
  project  = var.project_id
}

resource "google_redis_instance" "gke_cache" {
  name           = "gke-redis-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = "us-central1"

  location_id             = "us-central1-a"
  alternative_location_id = "us-central1-b"

  authorized_network = data.google_container_cluster.gke.network
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  auth_enabled            = true
  transit_encryption_mode = "DISABLED"  # Or SERVER_AUTHENTICATION for TLS

  redis_version = "REDIS_7_0"
}

# Store in Secret Manager
resource "google_secret_manager_secret" "redis_host" {
  secret_id = "redis-host"
  replication { auto {} }
}

resource "google_secret_manager_secret_version" "redis_host" {
  secret      = google_secret_manager_secret.redis_host.id
  secret_data = google_redis_instance.gke_cache.host
}
```

## Summary

Connecting GKE workloads to Memorystore Redis requires both resources to be in the same VPC (or peered VPCs). Store the Redis private IP and auth string in Kubernetes Secrets (preferably synced from Google Secret Manager via External Secrets Operator) and inject them as environment variables into your pods. Apply NetworkPolicies to restrict Redis access to only the pods that need it, and test connectivity using a temporary debug pod with redis-cli before deploying your application.
