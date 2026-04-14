# How to Use Dapr with Multi-Cluster Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Cluster, Service Mesh, Istio, Federation

Description: Learn how to combine Dapr with a multi-cluster service mesh to enable Dapr service invocation and pub/sub across Kubernetes clusters with secure cross-cluster connectivity.

---

Dapr is natively single-cluster - by default, service invocation resolves app IDs within the same cluster. To invoke Dapr services across clusters, you need a multi-cluster service mesh or gateway layer to provide cross-cluster connectivity.

## Architecture Overview

In a multi-cluster Dapr setup, service mesh handles cross-cluster network routing while Dapr handles application-level building blocks:

```text
Cluster A                          Cluster B
[order-service]                    [inventory-service]
[Dapr Sidecar] ---> East-West GW <--- East-West GW <--- [Dapr Sidecar]
                  (mTLS + routing)
```

## Option 1: Istio Multi-Primary Setup

Install Istio in multi-primary mode across two clusters:

```bash
# Cluster A
istioctl install --set profile=default \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network-a

# Cluster B
istioctl install --set profile=default \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-b \
  --set values.global.network=network-b

# Enable endpoint discovery between clusters
istioctl create-remote-secret \
  --name=cluster-b \
  --kubeconfig=cluster-b.kubeconfig | kubectl apply -f - --kubeconfig=cluster-a.kubeconfig
```

## Installing Dapr on Both Clusters

```bash
# Cluster A
KUBECONFIG=cluster-a.kubeconfig dapr init -k

# Cluster B
KUBECONFIG=cluster-b.kubeconfig dapr init -k
```

## Cross-Cluster Service Discovery

With Istio multi-cluster, services in cluster A can reach services in cluster B via the ServiceEntry or by using the Istio-managed DNS. Dapr uses Kubernetes DNS for service invocation name resolution.

Create a ServiceEntry in cluster A to expose cluster B's inventory service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: inventory-service-remote
  namespace: production
spec:
  hosts:
    - inventory-service.production.svc.cluster-b.local
  location: MESH_INTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: "east-west-gateway.cluster-b.example.com"
```

## Dapr Pub/Sub Across Clusters

Pub/sub naturally spans clusters when both clusters share the same message broker:

```yaml
# Same Kafka configuration deployed in both clusters
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka.shared-infra.example.com:9092"
```

Both clusters publish to and consume from the same Kafka cluster, enabling event-driven communication without service mesh routing.

## Shared State Store

For stateful services, use a shared external state store accessible from both clusters:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.shared-infra.example.com:6379"
```

## Observability Across Clusters

Configure a shared Zipkin or Jaeger instance to collect traces from both clusters:

```yaml
# Dapr Configuration in both clusters
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger.monitoring.example.com:9411/api/v2/spans"
```

## Summary

Multi-cluster Dapr deployments combine a service mesh (Istio multi-primary or similar) for cross-cluster network routing with shared Dapr components (Kafka for pub/sub, external Redis for state) that are accessible from all clusters. Service invocation across clusters requires explicit service discovery configuration while pub/sub and state sharing work naturally with shared backends.
