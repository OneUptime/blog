# How to Load Test Services Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Testing, Performance, Kubernetes, Service Mesh

Description: How to properly load test services running behind Istio, including tool selection, accounting for sidecar overhead, and interpreting results accurately.

---

Load testing services that run behind Istio is different from testing bare Kubernetes services. The Envoy sidecar proxy adds latency, consumes resources, and introduces connection pooling behavior that affects your results. If you do not account for these factors, your load tests will give you misleading numbers.

This guide covers how to run meaningful load tests against Istio-proxied services, what tools to use, and how to interpret the results correctly.

## Understanding the Istio Overhead

In Istio sidecar mode, service-to-service requests typically go through two Envoy proxies: one on the client side and one on the server side. Each proxy handles mutual TLS, policy checks, telemetry collection, and routing. This adds measurable latency, but the amount varies depending on request rate, payload size, protocol, proxy resources, the number of policies applied, and whether you have access logging enabled.

Before load testing your application, establish a baseline by measuring the sidecar overhead:

```bash
# From inside the mesh (goes through both sidecars)

kubectl exec -n default deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" http://httpbin:8000/status/200

# Compare with a client that does not have a sidecar
kubectl run curl-no-sidecar -n default --image=curlimages/curl --restart=Never \
  --labels=sidecar.istio.io/inject=false --command -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  http://httpbin:8000/status/200
```

## Choosing a Load Testing Tool

Several tools work well for load testing through Istio. Here are the most practical options.

**Fortio** is developed by the Istio team and is designed specifically for this use case:

```bash
kubectl apply -n default -f https://raw.githubusercontent.com/istio/istio/master/samples/httpbin/sample-client/fortio-deploy.yaml
```

Run a basic load test with Fortio:

```bash
kubectl exec -n default deploy/fortio-deploy -c fortio -- \
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
kubectl label namespace default istio-injection=enabled --overwrite
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
kubectl exec -n default deploy/fortio-deploy -c fortio -- \
  fortio load -c 100 -qps 0 -t 30s http://httpbin:8000/status/200
```

Using 100 concurrent connections with no rate limit (-qps 0 means maximum QPS) can hit the maxConnections limit of 50, depending on protocol and connection reuse. Check the results for 503 responses and Envoy overflow metrics, which indicate that Envoy rejected requests because a circuit breaker limit was reached.

## Monitoring During Load Tests

Istio generates metrics that are critical during load testing. Query them through Prometheus:

```bash
# Request rate
istio_requests_total{destination_service="httpbin.default.svc.cluster.local"}

# Request duration histogram
istio_request_duration_milliseconds_bucket{destination_service="httpbin.default.svc.cluster.local"}

# Connection pool overflow, if Envoy cluster stats are enabled
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
# Step from 10 QPS to 500 QPS over three one-minute runs
kubectl exec -n default deploy/fortio-deploy -c fortio -- \
  fortio load -c 20 -qps 10 -t 60s http://httpbin:8000/status/200

kubectl exec -n default deploy/fortio-deploy -c fortio -- \
  fortio load -c 20 -qps 100 -t 60s http://httpbin:8000/status/200

kubectl exec -n default deploy/fortio-deploy -c fortio -- \
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
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}')
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
