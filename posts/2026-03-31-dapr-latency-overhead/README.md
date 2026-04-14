# How to Understand Dapr Latency Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Latency, Overhead, Performance, Sidecar

Description: Learn how to measure and understand the latency overhead that Dapr's sidecar proxy introduces and how to minimize it for performance-sensitive services.

---

## Overview

Dapr's sidecar architecture adds network hops to every request. Understanding where this latency comes from and how to measure it helps you make informed architecture decisions and optimize the most impactful areas.

## Sources of Dapr Latency Overhead

Dapr latency comes from several sources:

1. **Loopback network hop**: App to sidecar via localhost (typically 0.1-0.5ms)
2. **mTLS handshake**: Certificate validation on first connection (amortized via keep-alive)
3. **Request serialization**: HTTP/JSON or gRPC/Protobuf marshaling
4. **Sidecar routing logic**: Service discovery lookup, middleware execution
5. **Distributed tracing**: Span creation and export (if enabled)

## Measuring Baseline Overhead

Compare direct pod-to-pod calls with Dapr-mediated calls:

```bash
# Direct HTTP call (pod-to-pod, no Dapr)
kubectl exec -it client-pod -- \
  curl -w "@curl-format.txt" -o /dev/null -s \
  http://server-service:8080/api/ping

# Via Dapr service invocation
kubectl exec -it client-pod -c app -- \
  curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:3500/v1.0/invoke/server/method/api/ping
```

Where `curl-format.txt` captures timing:

```text
time_namelookup:  %{time_namelookup}s\n
time_connect:     %{time_connect}s\n
time_appconnect:  %{time_appconnect}s\n
time_total:       %{time_total}s\n
```

## Using Distributed Traces to Find Hot Paths

Enable Zipkin tracing to visualize where time is spent:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: traceconfig
spec:
  tracing:
    samplingRate: "1"  # 100% sampling for profiling
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

View traces in Zipkin UI to see sidecar processing time vs. application time.

## Dapr Latency by Operation Type

Typical overhead values (actual values vary by hardware and network):

| Operation | Typical Overhead |
|---|---|
| Service invocation (HTTP) | 1-3ms |
| Service invocation (gRPC) | 0.5-2ms |
| State store read | 0.5-1ms |
| State store write | 0.5-1ms |
| Pub/sub publish | 1-5ms |

## Reducing Overhead with Keep-Alive

Enable HTTP keep-alive between your app and the Dapr sidecar:

```python
import requests
from requests.adapters import HTTPAdapter

session = requests.Session()
adapter = HTTPAdapter(
    pool_connections=10,
    pool_maxsize=100,
    max_retries=3
)
session.mount("http://", adapter)

# Reuse connection
response = session.post(
    "http://localhost:3500/v1.0/invoke/target/method/process",
    json={"data": "value"}
)
```

## Profiling the Sidecar

Enable pprof profiling on the sidecar to identify CPU hot paths:

```yaml
annotations:
  dapr.io/enable-profiling: "true"
```

The sidecar exposes pprof on port 7777 by default:

```bash
go tool pprof http://localhost:7777/debug/pprof/profile?seconds=30
```

## Summary

Dapr sidecar latency overhead typically ranges from 0.5ms to 5ms depending on operation type and configuration. The main contributors are the loopback network hop, mTLS overhead on new connections, and optional observability features. Use connection pooling, gRPC instead of HTTP, and selective tracing to keep overhead minimal for latency-sensitive services.
