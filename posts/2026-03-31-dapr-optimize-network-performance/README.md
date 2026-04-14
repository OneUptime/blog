# How to Optimize Dapr Network Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Network, Performance, mTLS, Optimization

Description: Learn how to optimize Dapr network performance by tuning mTLS settings, connection pooling, HTTP/2, and network policies in Kubernetes.

---

## Overview

Dapr's network stack involves multiple layers: the loopback connection between app and sidecar, mTLS connections between sidecars, and connections to external components. Optimizing each layer reduces overall request latency and increases sustainable throughput.

## App-to-Sidecar Connection Optimization

The connection between your application and its Dapr sidecar uses localhost. Minimize overhead here:

```python
# Python: Use a persistent session with connection pooling
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

dapr_session = requests.Session()
adapter = HTTPAdapter(
    pool_connections=1,        # Only 1 destination (localhost)
    pool_maxsize=50,           # 50 concurrent connections
    max_retries=Retry(total=3, backoff_factor=0.1)
)
dapr_session.mount("http://localhost:3500", adapter)

# Reuse the session for all Dapr calls
def invoke_service(app_id: str, method: str, data: dict):
    return dapr_session.post(
        f"http://localhost:3500/v1.0/invoke/{app_id}/method/{method}",
        json=data
    )
```

## Use HTTP/2 for Sidecar-to-Sidecar Communication

HTTP/2 (used by gRPC) multiplexes multiple streams over one connection, reducing connection overhead:

```yaml
# Enable gRPC for app protocol to use HTTP/2
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

For HTTP apps that want HTTP/2, enable it explicitly:

```yaml
annotations:
  dapr.io/app-protocol: "h2c"   # HTTP/2 cleartext
  dapr.io/app-port: "8080"
```

## Tune mTLS for Performance

Reduce mTLS handshake frequency by extending certificate TTL:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.mtls.workloadCertTTL=24h  # Default: 24h, increase if rotation is expensive
```

Reduce per-request overhead by keeping the HTTP middleware pipeline minimal:

```yaml
# Minimal middleware configuration for reduced per-request overhead
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: network-config
spec:
  httpPipeline:
    handlers: []   # No middleware = less per-request overhead
```

## Kubernetes Network Policy Optimization

Allow direct pod-to-pod communication for Dapr sidecars:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dapr-sidecar-traffic
spec:
  podSelector:
    matchLabels:
      dapr.io/enabled: "true"
  ingress:
  - from:
    - podSelector:
        matchLabels:
          dapr.io/enabled: "true"
    ports:
    - port: 3500    # HTTP API
    - port: 50001   # gRPC API
    - port: 50002   # internal gRPC
```

## Node-Local Traffic with Topology-Aware Routing

For latency-critical paths, prefer routing to pods on the same node:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  annotations:
    service.kubernetes.io/topology-mode: "Auto"
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
```

## Measure Network Latency Components

Break down where time is spent:

```bash
# Measure loopback latency (app to sidecar)
kubectl exec -it <pod> -c app -- \
  curl -w "TCP connect: %{time_connect}s, First byte: %{time_starttransfer}s\n" \
  -o /dev/null -s http://localhost:3500/v1.0/metadata

# Measure inter-sidecar latency
kubectl exec -it <pod> -c daprd -- \
  curl -w "Total: %{time_total}s\n" \
  -o /dev/null -s http://target-sidecar:3500/v1.0/metadata
```

## Summary

Optimizing Dapr network performance involves using persistent HTTP connection pools for app-to-sidecar communication, switching to gRPC/HTTP2 for sidecar-to-sidecar multiplexing, extending mTLS certificate TTL to reduce rotation frequency, and using topology-aware routing to prefer node-local pod communication. Measure each layer separately to identify where the most latency reduction is possible.
