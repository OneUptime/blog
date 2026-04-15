# How to Configure Dapr for Multi-Cluster Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Multi-Cluster, Federation, Service Mesh

Description: Configure Dapr across multiple Kubernetes clusters for cross-cluster service invocation using name resolution, pub/sub, and service mesh integration.

---

## Multi-Cluster Dapr Architecture

Dapr does not have native multi-cluster federation, but you can achieve cross-cluster communication through:
1. A shared pub/sub broker (Kafka, Redis Cluster, Azure Service Bus)
2. Consul name resolution for cross-cluster service discovery
3. Service mesh integration (Istio, Linkerd) for cross-cluster routing

## Approach 1: Shared Pub/Sub Broker

The simplest pattern - both clusters publish/subscribe to a shared Kafka or Redis:

```yaml
# Deployed in both cluster-a and cluster-b
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.shared-infra.example.com:9092"
  - name: consumerGroup
    value: "dapr-cluster-a"  # Different per cluster
  - name: authType
    value: "mtls"
  - name: caCert
    secretKeyRef:
      name: kafka-tls
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: kafka-tls
      key: client.crt
  - name: clientKey
    secretKeyRef:
      name: kafka-tls
      key: client.key
```

```bash
kubectl apply -f shared-pubsub.yaml  # Apply to both clusters
```

## Approach 2: Shared State Store

Use a globally accessible state store (e.g., Redis Enterprise with geo-replication):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: global-statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-global.example.com:6379"
  - name: enableTLS
    value: "true"
```

## Approach 3: Cross-Cluster via Ingress

Expose a Dapr service through Kubernetes Ingress in cluster-b, and invoke it from cluster-a using an HTTP output binding:

```yaml
# In cluster-a: HTTP binding pointing to cluster-b ingress
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cluster-b-api
  namespace: default
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://cluster-b.example.com/dapr-invoke"
```

```python
# Invoke cluster-b service from cluster-a
import requests
import os

def call_cluster_b(method: str, data: dict):
    url = f"http://localhost:{os.getenv('DAPR_HTTP_PORT', '3500')}/v1.0/bindings/cluster-b-api"
    response = requests.post(url, json={
        "data": data,
        "operation": "post",
        "metadata": {"path": f"/v1.0/invoke/remote-service/method/{method}"}
    })
    return response.json()
```

## Approach 4: Istio Multi-Cluster with Dapr

If both clusters use Istio, configure cluster federation and let Dapr use Istio for cross-cluster routing:

```bash
# Install Istio multi-cluster (primary-remote model)
istioctl install --set profile=minimal \
  --set values.pilot.env.EXTERNAL_ISTIOD=true -y

# Dapr sidecars use Istio service mesh for transparent cross-cluster routing
# Configure Dapr to use gRPC for service invocation
```

## Testing Cross-Cluster Pub/Sub

```bash
# In cluster-a: publish a message
curl -X POST http://localhost:3500/v1.0/publish/pubsub/cross-cluster-topic \
  -H "Content-Type: application/json" \
  -d '{"message": "hello from cluster-a"}'

# In cluster-b: verify the subscription received the message
kubectl logs -l app=subscriber -c subscriber -n default | grep "cross-cluster"
```

## Summary

Multi-cluster Dapr deployments are best achieved through a shared pub/sub broker or state store that both clusters access, enabling event-driven communication without direct cluster-to-cluster networking. For synchronous cross-cluster service invocation, use HTTP output bindings pointed at the remote cluster's ingress, or leverage a service mesh like Istio for transparent routing.
