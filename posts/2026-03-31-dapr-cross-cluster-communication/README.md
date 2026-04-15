# How to Configure Dapr for Cross-Cluster Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Cluster, Service Invocation, Networking, Federation

Description: Learn how to configure Dapr services to communicate across Kubernetes clusters using service mesh federation, external DNS, and pub/sub bridging.

---

## Cross-Cluster Communication Patterns

Dapr does not natively support direct cross-cluster service invocation out of the box. Cross-cluster communication is achieved through one of three patterns: pub/sub bridging with a shared message broker, external HTTP/gRPC endpoints exposed via ingress, or a service mesh (Istio, Linkerd) that federates clusters at the network layer.

## Pattern 1 - Shared Message Broker (Recommended)

The simplest approach is a shared pub/sub component that both clusters connect to:

```yaml
# Applied in both cluster-a and cluster-b
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cross-cluster-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.shared-infra.example.com:9092"
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-creds
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-creds
      key: password
```

Cluster A publishes, Cluster B subscribes:

```python
# Cluster A service - publishes order events
def publish_cross_cluster_event(order: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="cross-cluster-pubsub",
            topic_name="cross-cluster.orders",
            data=json.dumps(order),
            publish_metadata={"sourceCluster": "cluster-a"}
        )
```

## Pattern 2 - Ingress-Exposed Service Invocation

Expose a service via ingress in Cluster B and call it from Cluster A using Dapr output bindings:

```yaml
# Cluster A - HTTP output binding to Cluster B ingress
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cluster-b-inventory
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://inventory.cluster-b.example.com"
  - name: MTLSRootCA
    secretKeyRef:
      name: cluster-b-ca
      key: ca.crt
```

```python
from dapr.clients import DaprClient
import json

def check_remote_inventory(product_id: str) -> dict:
    with DaprClient() as client:
        response = client.invoke_binding(
            binding_name="cluster-b-inventory",
            operation="get",
            data=json.dumps({"productId": product_id}),
            binding_metadata={"path": f"/inventory/{product_id}"}
        )
        return json.loads(response.data)
```

## Pattern 3 - Istio Multi-Cluster Federation

With Istio multi-cluster, Dapr service invocation works transparently across clusters using the standard app-id syntax:

```yaml
# ServiceEntry exposes Cluster B service to Cluster A
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: cluster-b-inventory
  namespace: orders
spec:
  hosts:
  - "inventory-service.cluster-b.global"
  location: MESH_INTERNAL
  ports:
  - number: 3500
    name: dapr-http
    protocol: HTTP
  resolution: DNS
  endpoints:
  - address: inventory.cluster-b.internal
    ports:
      dapr-http: 3500
```

## Observability Across Clusters

Correlate traces across clusters by propagating the W3C traceparent header:

```yaml
# Zipkin federation - configure both clusters to report to the same collector
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger.observability.example.com:9411/api/v2/spans"
```

## Summary

Cross-cluster Dapr communication is best achieved with a shared message broker for async patterns, or ingress-exposed bindings for synchronous calls. Service mesh federation (Istio multi-cluster) enables transparent service invocation across clusters while preserving Dapr's mTLS and observability features. Always propagate trace context headers across cluster boundaries to maintain end-to-end distributed tracing visibility.
