# How to Use Fortio for Istio Load Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fortio, Load Testing, Performance, Kubernetes

Description: A complete guide to using Fortio for load testing your Istio service mesh, including deployment, configuration, and result analysis.

---

Fortio started as Istio's own load testing tool. It was originally developed as part of the Istio project and later spun off into its own standalone project. Because of that heritage, it works exceptionally well for testing services running inside an Istio mesh. It is lightweight, easy to deploy in Kubernetes, and produces clean, actionable output.

Here is how to set it up and use it effectively.

## Installing Fortio

You have several options for running Fortio. The most common for Istio testing is deploying it directly in your Kubernetes cluster.

### Deploy in Kubernetes

```bash
kubectl create namespace load-test
kubectl label namespace load-test istio-injection=enabled

kubectl apply -n load-test -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: fortio
spec:
  selector:
    app: fortio
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  - port: 8079
    targetPort: 8079
    name: grpc
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fortio
  template:
    metadata:
      labels:
        app: fortio
    spec:
      containers:
      - name: fortio
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
        - containerPort: 8079
EOF
```

### Install Locally

For quick tests from outside the cluster:

```bash
# macOS
brew install fortio

# Linux
go install fortio.org/fortio@latest

# Docker
docker run fortio/fortio load http://target-url
```

## Basic Load Testing

The simplest Fortio command hits a URL with a specified number of connections and duration:

```bash
FORTIO_POD=$(kubectl get pod -n load-test -l app=fortio -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n load-test $FORTIO_POD -- fortio load \
  http://my-service.my-namespace.svc.cluster.local:8080/api/health
```

Without any flags, Fortio runs 4 connections for 5 seconds at 8 QPS. That is good for a quick sanity check, but for real benchmarking you want to control these parameters.

## Key Fortio Flags

Here are the flags you will use most often:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -c 64 \          # concurrent connections
  -qps 1000 \      # target queries per second (0 = max)
  -t 120s \         # test duration
  -r 0.001 \        # resolution of histogram in seconds
  -json /tmp/results.json \  # save results to JSON
  -labels "test=baseline" \  # label for the test run
  http://my-service.my-namespace.svc.cluster.local:8080/endpoint
```

The `-qps 0` flag is especially important. It tells Fortio to send as fast as possible, which gives you the maximum throughput the service can handle. For latency testing, you typically want to set a specific QPS target below the service's maximum capacity to see realistic latency distribution.

## Testing Different Scenarios

### Max Throughput Test

Find the ceiling of what your service can handle:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -json /tmp/max-throughput.json \
  http://my-service.my-namespace.svc.cluster.local:8080/api/data
```

### Fixed Rate Latency Test

Measure latency at a realistic request rate:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -c 16 \
  -qps 500 \
  -t 120s \
  -json /tmp/latency-500qps.json \
  http://my-service.my-namespace.svc.cluster.local:8080/api/data
```

### Connection Churn Test

Test how the mesh handles constant new connections (worst case for mTLS):

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -keepalive=false \
  -json /tmp/no-keepalive.json \
  http://my-service.my-namespace.svc.cluster.local:8080/api/data
```

### POST Requests with Payload

Test write endpoints with a request body:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -content-type "application/json" \
  -payload '{"name":"test","value":42}' \
  http://my-service.my-namespace.svc.cluster.local:8080/api/items
```

## Using the Fortio Web UI

Fortio comes with a web UI that makes it easy to run tests and compare results. Port-forward to access it:

```bash
kubectl port-forward -n load-test svc/fortio 8080:8080
```

Then open http://localhost:8080/fortio/ in your browser. The UI lets you:

- Configure and launch load tests visually
- View real-time histogram charts
- Browse saved test results
- Compare multiple test runs side by side

## gRPC Load Testing

Fortio supports gRPC natively, which is great for testing gRPC services in the mesh:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -grpc \
  -c 16 \
  -qps 0 \
  -t 60s \
  -json /tmp/grpc-test.json \
  my-grpc-service.my-namespace.svc.cluster.local:8079
```

For gRPC health check pinging:

```bash
kubectl exec -n load-test $FORTIO_POD -- fortio load \
  -grpc \
  -ping \
  -c 8 \
  -t 30s \
  my-grpc-service.my-namespace.svc.cluster.local:8079
```

## Comparing Test Results

Fortio can serve a report page that compares multiple JSON result files:

```bash
# Copy results out of the pod
kubectl cp load-test/$FORTIO_POD:/tmp/baseline.json ./baseline.json
kubectl cp load-test/$FORTIO_POD:/tmp/with-policy.json ./with-policy.json

# Start local report server
fortio report -data-dir .
```

Open http://localhost:8080/ and select multiple results to see overlaid latency histograms. This is extremely useful for before/after comparisons when you change Istio configuration.

## Automating Tests with Scripts

For repeatable benchmarking, create a script:

```bash
#!/bin/bash
NAMESPACE="load-test"
TARGET="http://my-service.my-namespace.svc.cluster.local:8080/api/data"
FORTIO_POD=$(kubectl get pod -n $NAMESPACE -l app=fortio -o jsonpath='{.items[0].metadata.name}')
DURATION="60s"

for CONNS in 1 4 16 64 128; do
  for QPS in 100 500 0; do
    LABEL="c${CONNS}-q${QPS}"
    echo "Running test: $LABEL"

    kubectl exec -n $NAMESPACE $FORTIO_POD -- fortio load \
      -c $CONNS \
      -qps $QPS \
      -t $DURATION \
      -labels "$LABEL" \
      -json /tmp/${LABEL}.json \
      $TARGET

    # Cool down between tests
    sleep 10
  done
done
```

This gives you a matrix of results across different concurrency levels and request rates.

## Reading Fortio Output

A typical Fortio output looks like this:

```
Sockets used: 32 (for perfect keepalive, would be 32)
Uniform: false, Jitter: false
Code 200 : 89432 (100.0 %)
Response Header Sizes : count 89432 avg 234 +/- 0.5 min 234 max 235
Response Body/Total Sizes : count 89432 avg 612 +/- 1.2 min 610 max 615
All done 89432 calls (plus 32 warmup) 5.721 ms avg, 2810.2 qps
```

Key things to look at:
- **Error rate**: The "Code 200" line shows success rate. Any non-200 codes indicate issues.
- **Avg latency**: The "ms avg" at the bottom is the mean latency.
- **QPS**: Actual achieved queries per second.
- **Socket reuse**: "for perfect keepalive, would be 32" tells you if connections are being reused properly.

The histogram section shows percentile distribution:

```
# target 50% 4.5
# target 75% 6.2
# target 90% 8.1
# target 99% 14.3
# target 99.9% 22.7
```

Pay special attention to p99 and p99.9 for understanding tail latency, which is often what matters most in production.

## Tips for Reliable Results

1. Always run tests for at least 60 seconds. Shorter tests are too noisy.
2. Run 3-5 iterations and take the median.
3. Give 10-15 seconds of cooldown between tests.
4. Monitor cluster resource utilization during tests to make sure you are not hitting CPU or memory limits.
5. Pin Fortio and your test services to specific nodes with node affinity if you want maximum reproducibility.

## Cleanup

```bash
kubectl delete namespace load-test
```

Fortio is the go-to tool for Istio performance testing because it was built for exactly this purpose. It handles HTTP/1.1, HTTP/2, and gRPC, produces clean JSON output for automation, and includes a useful web UI for visual analysis. Combined with Istio's built-in telemetry, it gives you a complete picture of how your mesh is performing.
