# How to Load Test Services Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Testing, Performance, Kubernetes, Service Mesh

Description: How to properly load test services running behind Istio, including tool selection, accounting for sidecar overhead, and interpreting results accurately.

---

Load testing services that run behind Istio is different from testing bare Kubernetes services. The Envoy sidecar proxy adds latency, consumes resources, and introduces connection pooling behavior that affects your results. If you do not account for these factors, your load tests will give you misleading numbers.

This guide covers how to run meaningful load tests against Istio-proxied services, what tools to use, and how to interpret the results correctly.

## Understanding the Istio Overhead

Every request in an Istio mesh goes through two Envoy proxies: one on the client side and one on the server side. Each proxy handles TLS termination, policy checks, telemetry collection, and routing. This typically adds 1-3ms of latency per hop, but it can vary depending on the number of policies applied and whether you have access logging enabled.

Before load testing your application, establish a baseline by measuring the sidecar overhead:

```bash
# From inside the mesh (goes through both sidecars)
kubectl exec -n default deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" http://httpbin:8000/status/200

# Bypass the sidecar on the client side
kubectl exec -n default deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  --resolve httpbin:8000:$(kubectl get pod -l app=httpbin -o jsonpath='{.items[0].status.podIP}') \
  http://httpbin:8000/status/200
```

## Choosing a Load Testing Tool

Several tools work well for load testing through Istio. Here are the most practical options.

**Fortio** is developed by the Istio team and is designed specifically for this use case:

```bash
kubectl apply -n default -f https://raw.githubusercontent.com/fortio/fortio/master/docs/fortio-deployment.yaml
```

Run a basic load test with Fortio:

```bash
kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 8 -qps 100 -t 30s http://httpbin:8000/status/200
```

This sends 100 queries per second using 8 connections for 30 seconds. Fortio gives you a histogram of response times and percentile breakdowns.

**k6** is another solid choice with good scripting capabilities:

```bash
kubectl run k6 -n default --image=grafana/k6 --restart=Never \
  --command -- sleep infinity
```

Create a test script:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://httpbin.default.svc.cluster.local:8000/status/200');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(0.1);
}
```

## Running Load Tests from Inside the Mesh

For accurate results, your load generator should run inside the mesh with sidecar injection. This way, traffic flows through the full proxy chain just like real service-to-service communication.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: load-generator
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: load-generator
  template:
    metadata:
      labels:
        app: load-generator
    spec:
      containers:
      - name: fortio
        image: fortio/fortio
        ports:
        - containerPort: 8080
```

Make sure the namespace has sidecar injection enabled:

```bash
kubectl label namespace default istio-injection=enabled
```

## Testing Connection Pool Limits

Istio's DestinationRules let you set connection pool limits. Load testing helps you find the right values:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: default
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
```

Now run a load test that exceeds these limits:

```bash
kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 100 -qps 0 -t 30s http://httpbin:8000/status/200
```

Using 100 concurrent connections with no rate limit (-qps 0 means unlimited) should hit the maxConnections limit of 50. Check the results for 503 responses, which indicate that Envoy rejected connections due to the pool being full.

## Monitoring During Load Tests

Istio generates metrics that are critical during load testing. Query them through Prometheus:

```bash
# Request rate
istio_requests_total{destination_service="httpbin.default.svc.cluster.local"}

# Request duration histogram
istio_request_duration_milliseconds_bucket{destination_service="httpbin.default.svc.cluster.local"}

# Connection pool overflow
envoy_cluster_upstream_cx_overflow{cluster_name="outbound|8000||httpbin.default.svc.cluster.local"}
```

You can port-forward Prometheus and Grafana to watch these metrics in real time during your test:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
kubectl port-forward -n istio-system svc/grafana 3000:3000 &
```

## Load Testing with Realistic Traffic Patterns

Constant-rate load tests are useful for finding limits, but real traffic is bursty. Use a ramp-up pattern:

```bash
# Start at 10 QPS, ramp to 500 over 5 minutes
kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 20 -qps 10 -t 60s http://httpbin:8000/status/200

kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 20 -qps 100 -t 60s http://httpbin:8000/status/200

kubectl exec -n default deploy/fortio -c fortio -- \
  fortio load -c 20 -qps 500 -t 60s http://httpbin:8000/status/200
```

## Accounting for Sidecar Resources

The Envoy sidecar consumes CPU and memory. Under heavy load, the sidecar can become the bottleneck. Check sidecar resource usage during your load test:

```bash
kubectl top pod -n default -l app=httpbin --containers
```

If the `istio-proxy` container is hitting its resource limits, you need to increase them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Load Testing Through the Ingress Gateway

For testing end-to-end latency including the ingress path, send load from outside the cluster:

```bash
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')

fortio load -c 50 -qps 200 -t 120s \
  -H "Host: httpbin.example.com" \
  http://${INGRESS_HOST}:${INGRESS_PORT}/status/200
```

## Interpreting Results

When analyzing load test results, focus on these metrics:

- **P99 latency**: The 99th percentile response time. This is more important than average latency.
- **Error rate**: Any 5xx responses indicate either application issues or proxy overload.
- **Overflow count**: The number of requests rejected by connection pool limits.
- **CPU/memory**: Resource utilization of both application containers and sidecars.

A good load test report looks like this:

```text
Target QPS: 200
Actual QPS: 198.5
Duration: 120s
Total requests: 23,820
Success rate: 99.97%
P50 latency: 12ms
P90 latency: 28ms
P99 latency: 85ms
Connection pool overflows: 0
Sidecar CPU peak: 120m
```

## Wrapping Up

Load testing through Istio requires more thought than testing plain HTTP services. Account for the sidecar overhead, test your connection pool limits, monitor proxy resources, and run your load generator from inside the mesh for accurate numbers. The combination of Fortio for generating load and Istio's built-in Prometheus metrics for monitoring gives you everything you need to understand how your services perform under pressure.
