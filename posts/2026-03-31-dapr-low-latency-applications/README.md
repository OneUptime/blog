# How to Configure Dapr for Low Latency Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Latency, Performance, Optimization, gRPC

Description: Learn how to tune Dapr configuration to minimize sidecar-introduced latency for real-time and latency-sensitive microservice applications.

---

## Overview

Dapr adds a sidecar proxy to every service, which introduces some latency. For latency-sensitive applications such as real-time APIs, trading systems, or gaming backends, you need to minimize this overhead through protocol choice, connection reuse, and resource guarantees.

## Use gRPC Instead of HTTP

gRPC uses HTTP/2 with binary serialization, which is significantly faster than HTTP/1.1 JSON:

```yaml
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

Invoke services via gRPC client:

```go
import dapr "github.com/dapr/go-sdk/client"

client, _ := dapr.NewClient()
resp, err := client.InvokeMethod(ctx, "target-service", "process", "post")
```

## Use Unix Domain Sockets

For services co-located on the same node, Unix Domain Sockets (UDS) eliminate TCP overhead:

```yaml
annotations:
  dapr.io/unix-domain-socket-path: "/tmp/dapr-sockets"
```

In your application, connect via the socket path:

```python
import os
socket_path = os.getenv("DAPR_UNIX_DOMAIN_SOCKET_PATH", "")
if socket_path:
    dapr_address = f"unix://{socket_path}/dapr-grpc.socket"
```

## Guarantee Sidecar CPU with QoS

Prevent CPU throttling by using Guaranteed QoS for the sidecar:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "1000m"
  dapr.io/sidecar-cpu-limit: "1000m"   # Request == Limit = Guaranteed QoS
  dapr.io/sidecar-memory-request: "128Mi"
  dapr.io/sidecar-memory-limit: "128Mi"
```

## Disable Unnecessary Features

Disable tracing sampling if you don't need distributed traces:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: lowlatency-config
spec:
  tracing:
    samplingRate: "0"   # Disable tracing for minimum overhead
```

Disable metrics if not needed:

```yaml
annotations:
  dapr.io/enable-metrics: "false"
```

## Collocate Sidecars on Low-Latency Nodes

Use node affinity to schedule latency-sensitive pods on nodes with fast networking:

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-type
            operator: In
            values:
            - low-latency
```

## Measure Baseline Latency

Benchmark your Dapr latency overhead:

```bash
# Measure service invocation latency with wrk
wrk -t4 -c100 -d30s \
  http://localhost:3500/v1.0/invoke/target-service/method/ping
```

Compare against direct app-to-app calls to quantify Dapr overhead and identify optimization opportunities.

## Summary

Low-latency Dapr deployments benefit from gRPC over HTTP, Unix domain sockets for co-located services, Guaranteed QoS CPU allocation, and disabling unnecessary observability features. Measure latency at each stage to ensure your optimizations have the expected effect before deploying to production.
