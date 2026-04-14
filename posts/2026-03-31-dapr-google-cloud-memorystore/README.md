# How to Use Dapr with Google Cloud Memorystore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Google Cloud, Memorystore, Redis, GKE

Description: Configure Dapr state store and pub/sub components with Google Cloud Memorystore for Redis on GKE, including VPC peering, AUTH token configuration, and in-transit encryption.

---

## Overview

Google Cloud Memorystore for Redis is a fully managed Redis service on GCP. When running Dapr on GKE, Memorystore is a natural choice for the Redis state store and pub/sub backends due to its automatic failover, managed patching, and VPC-native networking.

## Creating a Memorystore Instance

Create a Memorystore Redis instance with AUTH enabled:

```bash
gcloud redis instances create dapr-redis \
  --size=5 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --enable-auth \
  --transit-encryption-mode=server-authentication \
  --tier=standard
```

Get the connection details:

```bash
gcloud redis instances describe dapr-redis \
  --region=us-central1 \
  --format="get(host,port)"

# Get the AUTH string separately
gcloud redis instances get-auth-string dapr-redis \
  --region=us-central1
```

## Configuring Dapr State Store

Create the Dapr component with Memorystore connection details:

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
    value: 10.0.0.3:6379
  - name: redisPassword
    secretKeyRef:
      name: memorystore-secret
      key: authString
  - name: enableTLS
    value: "true"
```

Store the AUTH string:

```bash
AUTH_STRING=$(gcloud redis instances get-auth-string dapr-redis \
  --region=us-central1 --format="get(authString)")

kubectl create secret generic memorystore-secret \
  --from-literal=authString="$AUTH_STRING"
```

## VPC Native Networking for GKE

Memorystore only accepts connections from within its authorized VPC. Ensure your GKE cluster is in the same VPC:

```bash
# Create a GKE cluster in the same VPC as Memorystore
gcloud container clusters create dapr-cluster \
  --region=us-central1 \
  --network=my-vpc \
  --subnetwork=my-subnet \
  --enable-ip-alias

# Verify connectivity from a GKE pod
kubectl run redis-test --image=redis:7 --rm -it -- \
  redis-cli -h 10.0.0.3 -p 6379 -a "$AUTH_STRING" --tls \
  --cacert /etc/ssl/certs/ca-certificates.crt ping
```

## Pub/Sub with Memorystore

Configure Redis Streams pub/sub on Memorystore:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: 10.0.0.3:6379
  - name: redisPassword
    secretKeyRef:
      name: memorystore-secret
      key: authString
  - name: enableTLS
    value: "true"
  - name: consumerID
    value: "{uuid}"
```

## Monitoring Memorystore with Cloud Monitoring

Set up alerts for Redis memory usage:

```bash
# Create memorystore-alert.json
cat <<EOF > memorystore-alert.json
{
  "displayName": "Memorystore High Memory",
  "conditions": [{
    "displayName": "Memory usage over 80%",
    "conditionThreshold": {
      "filter": "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 0.8
    }
  }]
}
EOF

gcloud monitoring policies create \
  --policy-from-file=memorystore-alert.json
```

## Summary

Google Cloud Memorystore integrates with Dapr's Redis state store and pub/sub components with minimal configuration when running on GKE. Always enable AUTH tokens and in-transit encryption for production instances, ensure your GKE cluster has VPC-native networking in the same network as Memorystore, and monitor Redis memory usage via Cloud Monitoring to prevent out-of-memory evictions that could lose Dapr state.
