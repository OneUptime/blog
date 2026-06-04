# Validation Summary: How to Build Auto-Scaling WebSocket Servers with KEDA and Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- WebSocket
- Node.js
- ws
- Express
- prom-client
- Kubernetes Deployments, Services, Ingress, and pod lifecycle hooks
- KEDA ScaledObject and Prometheus scaler
- Prometheus, PromQL, ServiceMonitor, and PrometheusRule
- ingress-nginx
- Redis pub/sub with ioredis

## Sources Consulted
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- KEDA ScaledObject specification: https://keda.sh/docs/2.15/reference/scaledobject-spec/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Prometheus Operator ServiceMonitor getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ws official repository and API documentation: https://github.com/websockets/ws
- prom-client package documentation: https://www.npmjs.com/package/prom-client
- Prometheus PromQL basics and operators documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The ServiceMonitor selected Services with label `app: websocket-server`, but the Service did not define that metadata label. Added `metadata.labels.app: websocket-server` to the Service so Prometheus Operator can discover it.
- The KEDA Prometheus triggers used `metricName`, which is not part of the current KEDA Prometheus scaler metadata. Removed those fields and kept the required `serverAddress`, `query`, and `threshold` metadata.
- The Prometheus scaler queries divided by `count(up{job="websocket-server"})`, which depends on a generated `job` label that may not match the ServiceMonitor setup. Changed the divisor to `count(websocket_active_connections)` so the per-pod calculation uses the scraped WebSocket metric series directly.
- The ingress example combined `nginx.ingress.kubernetes.io/upstream-hash-by` with `nginx.ingress.kubernetes.io/load-balance: least_conn`; ingress-nginx documents both annotations, and hashing overrides the load-balancing algorithm for the upstream. Removed the hash annotation so the least-connections example behaves as described.
- The ingress example included `nginx.ingress.kubernetes.io/websocket-services`, which is not an ingress-nginx annotation. Removed it; ingress-nginx WebSocket behavior is configured through standard proxy settings such as read/send timeouts.
- The explanation implied existing WebSocket connections need load-balancer affinity to stay attached. Clarified that an established WebSocket remains on its selected backend for the life of the TCP connection, while reconnects need affinity if they should return to the same pod.

## Review Notes
The examples are intentionally simplified. Production deployments should also include readiness checks, client-side reconnect behavior, shutdown coordination, and authentication/authorization around WebSocket messages.
