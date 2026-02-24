# How to Conduct Istio Capacity Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Performance Testing, Load Testing, Capacity Planning

Description: A hands-on guide to conducting capacity tests on your Istio service mesh including load generation, metric collection, and bottleneck identification.

---

You can do all the spreadsheet math in the world to estimate Istio resource requirements, but nothing replaces actually testing your mesh under load. Capacity testing tells you where your real bottlenecks are, validates your resource calculations, and gives you confidence that your production mesh can handle the traffic you expect.

This guide walks through how to set up and run meaningful capacity tests for Istio.

## Setting Up a Test Environment

Ideally, run capacity tests in an environment that mirrors production as closely as possible. At minimum, you need:

- Same Kubernetes version
- Same Istio version and configuration
- Same node types (or close to them)
- Representative application workloads (even if synthetic)

If you cannot replicate your full production environment, focus on matching the most critical aspects: network plugin, node sizes, and Istio configuration.

## Deploying Test Workloads

Use a synthetic workload that generates controllable traffic patterns. The `fortio` load testing tool, originally developed at Google for Istio testing, is an excellent choice:

```bash
# Deploy fortio server (acts as an upstream service)
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio-server
  namespace: test
spec:
  replicas: 5
  selector:
    matchLabels:
      app: fortio-server
  template:
    metadata:
      labels:
        app: fortio-server
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          ports:
            - containerPort: 8080
          args:
            - server
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "2000m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: fortio-server
  namespace: test
spec:
  ports:
    - port: 8080
      targetPort: 8080
  selector:
    app: fortio-server
EOF
```

Deploy a load generator:

```bash
# Deploy fortio client for load generation
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio-client
  namespace: test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fortio-client
  template:
    metadata:
      labels:
        app: fortio-client
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          resources:
            requests:
              cpu: "1000m"
              memory: "256Mi"
            limits:
              cpu: "4000m"
              memory: "512Mi"
EOF
```

## Creating Realistic Mesh Topology

Real meshes have multiple services with dependencies. Create a chain of services to test multi-hop scenarios:

```bash
# Deploy a service chain: client -> frontend -> backend -> database-mock
for svc in frontend backend database-mock; do
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc}
  namespace: test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${svc}
  template:
    metadata:
      labels:
        app: ${svc}
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          ports:
            - containerPort: 8080
          args:
            - server
---
apiVersion: v1
kind: Service
metadata:
  name: ${svc}
  namespace: test
spec:
  ports:
    - port: 8080
  selector:
    app: ${svc}
EOF
done
```

## Running Baseline Tests (Without Istio)

Before testing with the mesh, establish a baseline without sidecar injection:

```bash
# Disable sidecar injection for the test namespace
kubectl label namespace test istio-injection-

# Restart pods to remove sidecars
kubectl rollout restart deployment -n test

# Run baseline load test
kubectl exec -n test deploy/fortio-client -c fortio -- \
  fortio load -c 64 -qps 0 -t 60s -json /tmp/baseline.json \
  http://fortio-server:8080/echo?size=1024
```

Record these baseline numbers:
- Max RPS achieved
- P50, P90, P99 latency
- CPU usage of application pods
- Memory usage of application pods

## Running Tests With Istio

Enable the mesh and repeat the tests:

```bash
# Enable sidecar injection
kubectl label namespace test istio-injection=enabled

# Restart pods to inject sidecars
kubectl rollout restart deployment -n test

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app -n test --timeout=120s

# Run the same load test
kubectl exec -n test deploy/fortio-client -c fortio -- \
  fortio load -c 64 -qps 0 -t 60s -json /tmp/with-mesh.json \
  http://fortio-server:8080/echo?size=1024
```

## Test Scenarios to Run

### Scenario 1: Throughput Test

Find the maximum requests per second your mesh can handle:

```bash
# Gradually increase connections
for connections in 8 16 32 64 128 256 512; do
  echo "Testing with $connections connections"
  kubectl exec -n test deploy/fortio-client -c fortio -- \
    fortio load -c $connections -qps 0 -t 30s \
    http://fortio-server:8080/echo?size=1024
  sleep 10
done
```

### Scenario 2: Latency Under Load

Test latency at a fixed RPS to understand the latency overhead of the mesh:

```bash
# Test at specific RPS levels
for qps in 100 500 1000 2000 5000; do
  echo "Testing at $qps QPS"
  kubectl exec -n test deploy/fortio-client -c fortio -- \
    fortio load -c 32 -qps $qps -t 60s \
    http://fortio-server:8080/echo?size=1024
  sleep 10
done
```

### Scenario 3: Config Push Under Load

Test what happens to latency when configuration changes occur during load:

```bash
# Start a sustained load test in one terminal
kubectl exec -n test deploy/fortio-client -c fortio -- \
  fortio load -c 32 -qps 1000 -t 300s \
  http://fortio-server:8080/echo?size=1024

# In another terminal, apply configuration changes during the test
for i in $(seq 1 10); do
  kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-vs-$i
  namespace: test
spec:
  hosts:
    - fortio-server
  http:
    - route:
        - destination:
            host: fortio-server
            port:
              number: 8080
EOF
  sleep 15
done
```

### Scenario 4: Scale-up Test

Test how the mesh handles rapid scaling:

```bash
# Start load test
kubectl exec -n test deploy/fortio-client -c fortio -- \
  fortio load -c 32 -qps 1000 -t 300s \
  http://fortio-server:8080/echo?size=1024 &

# Scale up the server deployment during the test
sleep 30
kubectl scale deployment fortio-server -n test --replicas=10
sleep 60
kubectl scale deployment fortio-server -n test --replicas=20
sleep 60
kubectl scale deployment fortio-server -n test --replicas=5
```

## Collecting Metrics During Tests

Monitor resource usage throughout the test:

```bash
# Watch sidecar resource usage
watch -n 5 'kubectl top pods --containers -n test | grep istio-proxy'

# Watch istiod resource usage
watch -n 5 'kubectl top pods -n istio-system -l app=istiod'

# Watch node resource usage
watch -n 5 'kubectl top nodes'
```

Use Prometheus queries to capture detailed metrics:

```promql
# Sidecar CPU during test
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy", namespace="test"}[1m])) by (pod)

# Sidecar memory during test
container_memory_working_set_bytes{container="istio-proxy", namespace="test"}

# Request success rate
sum(rate(istio_requests_total{namespace="test", response_code="200"}[1m]))
/ sum(rate(istio_requests_total{namespace="test"}[1m]))

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{namespace="test"}[1m])) by (le))
```

## Analyzing Results

After running your tests, compile the results into a comparison table:

```
| Metric              | No Mesh  | With Mesh | Overhead |
|---------------------|----------|-----------|----------|
| Max RPS             | 45,000   | 38,000    | -15.5%   |
| P50 Latency         | 1.2ms    | 1.8ms     | +0.6ms   |
| P99 Latency         | 4.5ms    | 7.2ms     | +2.7ms   |
| CPU (app pods)      | 2000m    | 2000m     | 0%       |
| CPU (sidecars)      | N/A      | 1500m     | +1500m   |
| Memory (app pods)   | 1024Mi   | 1024Mi    | 0%       |
| Memory (sidecars)   | N/A      | 640Mi     | +640Mi   |
```

## Identifying Bottlenecks

Look for these common bottlenecks:

1. **CPU throttling on sidecars**: Check `container_cpu_cfs_throttled_periods_total`
2. **istiod push latency spikes**: Check `pilot_xds_push_time`
3. **Connection pool exhaustion**: Check Envoy `upstream_cx_overflow` stat
4. **Memory pressure**: Check if any sidecars are approaching OOM

```bash
# Check for CPU throttling
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "cfs_throttled"

# Check Envoy connection stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx"
```

## Documenting Capacity Limits

After testing, document the capacity limits you found:

- Maximum RPS the mesh can sustain with acceptable latency
- Maximum number of pods before control plane degrades
- Resource requirements at each scale point
- Configuration that performs best at each scale level

Use these documented limits as the basis for your production capacity plan and autoscaling thresholds. Run capacity tests again whenever you upgrade Istio versions, change mesh configuration, or significantly change your workload patterns.
