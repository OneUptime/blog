# How to Measure Istio Latency Overhead

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, Performance, Monitoring, Service Mesh

Description: How to accurately measure the latency that Istio sidecar proxies add to your requests with practical tools and techniques.

---

Everyone who runs Istio asks the same question: "How much latency does it add?" The answer depends on many factors - payload size, protocol, connection reuse, mTLS, telemetry settings, and more. Instead of relying on generic benchmarks from blog posts, you should measure the overhead in your own environment with your own workloads. Here is how to do that accurately.

## Understanding the Latency Components

A request between two meshed services goes through four proxy hops:

1. Client application to client-side Envoy (loopback, very fast)
2. Client-side Envoy processing (route matching, load balancing, TLS initiation)
3. Network transit
4. Server-side Envoy processing (TLS termination, policy checks)
5. Server-side Envoy to server application (loopback)

The network transit time is the same with or without the mesh. The mesh overhead is in steps 1-2 and 4-5. To measure just the mesh overhead, you need to isolate it from the application and network time.

## Method 1: Compare Meshed vs Non-Meshed

The simplest approach is running the same test with and without the mesh:

```bash
# Deploy a test service in a non-meshed namespace
kubectl create ns latency-test-no-mesh
kubectl label ns latency-test-no-mesh istio-injection=disabled

# Deploy in a meshed namespace
kubectl create ns latency-test-mesh
kubectl label ns latency-test-mesh istio-injection=enabled
```

Deploy identical services in both:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
      - name: echo
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: echo-server
spec:
  ports:
  - name: http
    port: 8080
  selector:
    app: echo-server
```

Run latency tests with fixed QPS to avoid saturating the system:

```bash
# Non-meshed baseline
kubectl exec deploy/fortio-client -n latency-test-no-mesh -- fortio load \
  -c 8 -qps 500 -t 120s -json /tmp/baseline.json \
  http://echo-server:8080/echo?size=256

# Meshed
kubectl exec deploy/fortio-client -n latency-test-mesh -- fortio load \
  -c 8 -qps 500 -t 120s -json /tmp/meshed.json \
  http://echo-server:8080/echo?size=256
```

The difference in latency percentiles between the two runs is your mesh overhead.

## Method 2: Use Envoy Access Logs

Envoy access logs contain timing information that lets you break down where time is spent:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: "/dev/stdout"
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
```

The key fields are:

- `%DURATION%` - Total time the request took from Envoy's perspective (in ms)
- `%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%` - Time the upstream took to respond

The difference between DURATION and X-ENVOY-UPSTREAM-SERVICE-TIME is the time Envoy spent processing the request.

```bash
# Get access logs from the sidecar
kubectl logs deploy/my-app -c istio-proxy | tail -20
```

## Method 3: Use Istio Telemetry Metrics

Istio exports request duration metrics that you can query from Prometheus:

```bash
# Server-side latency (includes server Envoy overhead + application time)
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service="echo-server.latency-test-mesh.svc.cluster.local"}[5m])) by (le))

# Client-side latency (includes both Envoy proxies + network + application)
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", destination_service="echo-server.latency-test-mesh.svc.cluster.local"}[5m])) by (le))
```

The difference between client-side and server-side latency at each percentile roughly corresponds to the client-side Envoy overhead plus network time. Comparing the server-side metric to the actual application response time gives you the server-side Envoy overhead.

## Method 4: Distributed Tracing

If you have tracing enabled, the trace spans show exactly where time is spent:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100
```

With 100% sampling (only for testing, not production), every request generates a trace. Each trace shows the time spent in each Envoy proxy and the application.

```bash
# If using Jaeger
kubectl port-forward svc/tracing -n istio-system 16686:80
# Open http://localhost:16686 and search for your service
```

The trace will show spans like:
- `echo-server.latency-test-mesh.svc.cluster.local:8080` (total server time)
- Sub-spans for the Envoy proxy processing

## Measuring mTLS Overhead Specifically

To isolate just the mTLS overhead from the total proxy overhead:

```bash
# Test with mTLS STRICT
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: test-strict
  namespace: latency-test-mesh
spec:
  mtls:
    mode: STRICT
EOF

# Run benchmark
kubectl exec deploy/fortio-client -n latency-test-mesh -- fortio load \
  -c 8 -qps 500 -t 60s http://echo-server:8080/echo

# Switch to DISABLE
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: test-disabled
  namespace: latency-test-mesh
spec:
  mtls:
    mode: DISABLE
EOF

# Run same benchmark
kubectl exec deploy/fortio-client -n latency-test-mesh -- fortio load \
  -c 8 -qps 500 -t 60s http://echo-server:8080/echo
```

The latency difference is the mTLS overhead.

## Factors That Affect Latency

**Connection reuse**: The first request on a new connection pays the TLS handshake cost. Subsequent requests on the same connection are much faster. Use persistent connections to amortize the handshake cost:

```bash
# Test with connection reuse (default)
fortio load -c 8 -qps 500 -t 60s http://echo-server:8080/echo

# Test without connection reuse (worst case)
fortio load -c 8 -qps 500 -t 60s -keepalive=false http://echo-server:8080/echo
```

**Payload size**: Larger payloads mean more data to encrypt and decrypt. Test with various sizes to understand the relationship.

**Configuration complexity**: More VirtualService rules mean more route matching time. If your latency is higher than expected, check the configuration size:

```bash
istioctl proxy-config route deploy/echo-server -n latency-test-mesh | wc -l
```

## Building a Latency Dashboard

Create a Grafana dashboard that tracks mesh latency over time:

```bash
# Key Prometheus queries for the dashboard

# p50 mesh overhead
histogram_quantile(0.5, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le, destination_service))
-
histogram_quantile(0.5, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))

# p99 mesh overhead
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le, destination_service))
-
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))
```

Track these metrics continuously to detect latency regressions when you update Istio or change configurations. Knowing your baseline mesh overhead makes it much easier to troubleshoot performance issues because you can quickly tell if the problem is in the mesh or in the application.
