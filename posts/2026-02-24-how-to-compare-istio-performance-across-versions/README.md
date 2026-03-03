# How to Compare Istio Performance Across Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, Performance, Upgrade, Kubernetes

Description: How to systematically compare Istio performance between versions to understand the impact of upgrades on latency, throughput, and resource usage.

---

Every Istio release brings new features, bug fixes, and performance changes. Some versions improve performance significantly, while others might introduce regressions for specific workloads. Before upgrading Istio in production, you should run performance comparisons between your current version and the target version to avoid surprises.

This post covers how to set up a reproducible performance comparison framework for Istio versions.

## Why Version Comparison Matters

The Istio team puts effort into performance optimization with each release, but changes to protocol handling, telemetry pipelines, or xDS delivery can affect performance in unexpected ways. A version that improves latency for small messages might regress for large payloads. A version that reduces idle memory might use more CPU under load.

The only way to know how a version change affects your specific workloads is to test it.

## Setting Up Side-by-Side Environments

The cleanest approach is to run two separate clusters (or at least two separate namespaces with different Istio revisions) and benchmark both with the same workload.

### Using Istio Revision Labels

Istio supports running multiple control planes simultaneously using revisions. This is the best way to compare versions on the same cluster.

Install the current version with a revision tag:

```bash
istioctl install --revision=1-20 -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  revision: "1-20"
  values:
    global:
      meshID: mesh1
EOF
```

Install the new version with a different revision:

```bash
istioctl install --revision=1-21 -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  revision: "1-21"
  values:
    global:
      meshID: mesh1
EOF
```

Create separate namespaces for each version:

```bash
kubectl create namespace bench-v120
kubectl label namespace bench-v120 istio.io/rev=1-20

kubectl create namespace bench-v121
kubectl label namespace bench-v121 istio.io/rev=1-21
```

Deploy identical workloads to both namespaces:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
spec:
  replicas: 3
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
          args: ["server"]
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "1"
              memory: 256Mi
            limits:
              cpu: "2"
              memory: 512Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: load-generator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: load-gen
  template:
    metadata:
      labels:
        app: load-gen
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          args: ["server"]
          resources:
            requests:
              cpu: "1"
            limits:
              cpu: "2"
```

```bash
kubectl apply -f workload.yaml -n bench-v120
kubectl apply -f workload.yaml -n bench-v121
```

Verify that each namespace is using the correct Istio version:

```bash
istioctl proxy-status -n bench-v120
istioctl proxy-status -n bench-v121
```

## The Benchmark Suite

Create a comprehensive benchmark script that tests multiple dimensions:

```bash
#!/bin/bash

VERSIONS=("v120:bench-v120" "v121:bench-v121")
RESULTS_DIR="/tmp/istio-compare-$(date +%Y%m%d)"
mkdir -p "$RESULTS_DIR"

for entry in "${VERSIONS[@]}"; do
  VERSION="${entry%%:*}"
  NS="${entry##*:}"

  echo "========================================="
  echo "Benchmarking Istio $VERSION (namespace: $NS)"
  echo "========================================="

  # Test 1: Latency at moderate load
  echo "--- Latency Test (500 QPS, 16 connections) ---"
  kubectl exec -n "$NS" deploy/load-generator -c fortio -- \
    fortio load -c 16 -qps 500 -t 60s \
    -json "/tmp/${VERSION}-latency.json" \
    http://echo-server.${NS}:8080/echo

  kubectl cp "${NS}/$(kubectl get pod -n "$NS" -l app=load-gen \
    -o jsonpath='{.items[0].metadata.name}'):/tmp/${VERSION}-latency.json" \
    "${RESULTS_DIR}/${VERSION}-latency.json" -c fortio

  # Test 2: Max throughput
  echo "--- Throughput Test (max QPS, 64 connections) ---"
  kubectl exec -n "$NS" deploy/load-generator -c fortio -- \
    fortio load -c 64 -qps 0 -t 60s \
    -json "/tmp/${VERSION}-throughput.json" \
    http://echo-server.${NS}:8080/echo

  kubectl cp "${NS}/$(kubectl get pod -n "$NS" -l app=load-gen \
    -o jsonpath='{.items[0].metadata.name}'):/tmp/${VERSION}-throughput.json" \
    "${RESULTS_DIR}/${VERSION}-throughput.json" -c fortio

  # Test 3: Large payload
  echo "--- Large Payload Test (100KB, 8 connections) ---"
  kubectl exec -n "$NS" deploy/load-generator -c fortio -- \
    fortio load -c 8 -qps 100 -t 60s -payload-size 102400 \
    -json "/tmp/${VERSION}-large-payload.json" \
    http://echo-server.${NS}:8080/echo

  kubectl cp "${NS}/$(kubectl get pod -n "$NS" -l app=load-gen \
    -o jsonpath='{.items[0].metadata.name}'):/tmp/${VERSION}-large-payload.json" \
    "${RESULTS_DIR}/${VERSION}-large-payload.json" -c fortio

  # Test 4: Connection churn (no keepalive)
  echo "--- Connection Churn Test (new connection per request) ---"
  kubectl exec -n "$NS" deploy/load-generator -c fortio -- \
    fortio load -c 8 -qps 100 -t 60s -keepalive=false \
    -json "/tmp/${VERSION}-churn.json" \
    http://echo-server.${NS}:8080/echo

  kubectl cp "${NS}/$(kubectl get pod -n "$NS" -l app=load-gen \
    -o jsonpath='{.items[0].metadata.name}'):/tmp/${VERSION}-churn.json" \
    "${RESULTS_DIR}/${VERSION}-churn.json" -c fortio

  echo "Completed $VERSION benchmarks"
  sleep 10  # Cool down between versions
done

echo "Results saved to $RESULTS_DIR"
```

## Comparing Results

Parse the Fortio JSON output to create a comparison table:

```bash
#!/bin/bash

RESULTS_DIR="/tmp/istio-compare-$(date +%Y%m%d)"

echo "# Istio Version Performance Comparison"
echo ""
echo "Date: $(date)"
echo ""

for test in latency throughput large-payload churn; do
  echo "## $test"
  echo ""
  echo "| Metric | v1.20 | v1.21 | Change |"
  echo "|--------|-------|-------|--------|"

  V120="${RESULTS_DIR}/v120-${test}.json"
  V121="${RESULTS_DIR}/v121-${test}.json"

  if [ -f "$V120" ] && [ -f "$V121" ]; then
    # QPS
    QPS_120=$(jq '.ActualQPS' "$V120")
    QPS_121=$(jq '.ActualQPS' "$V121")
    QPS_CHANGE=$(echo "scale=1; ($QPS_121 - $QPS_120) / $QPS_120 * 100" | bc)
    echo "| QPS | $QPS_120 | $QPS_121 | ${QPS_CHANGE}% |"

    # P50 latency
    P50_120=$(jq '[.DurationHistogram.Percentiles[] | select(.Percentile == 50)] | .[0].Value * 1000' "$V120")
    P50_121=$(jq '[.DurationHistogram.Percentiles[] | select(.Percentile == 50)] | .[0].Value * 1000' "$V121")
    P50_CHANGE=$(echo "scale=1; ($P50_121 - $P50_120) / $P50_120 * 100" | bc)
    echo "| P50 (ms) | $P50_120 | $P50_121 | ${P50_CHANGE}% |"

    # P99 latency
    P99_120=$(jq '[.DurationHistogram.Percentiles[] | select(.Percentile == 99)] | .[0].Value * 1000' "$V120")
    P99_121=$(jq '[.DurationHistogram.Percentiles[] | select(.Percentile == 99)] | .[0].Value * 1000' "$V121")
    P99_CHANGE=$(echo "scale=1; ($P99_121 - $P99_120) / $P99_120 * 100" | bc)
    echo "| P99 (ms) | $P99_120 | $P99_121 | ${P99_CHANGE}% |"
  fi

  echo ""
done
```

## Measuring Resource Usage Differences

Collect resource usage during the benchmarks:

```bash
#!/bin/bash

for NS in bench-v120 bench-v121; do
  echo "=== $NS ==="

  # Memory usage
  echo "Memory:"
  kubectl top pods -n "$NS" --containers | grep istio-proxy

  # CPU usage
  echo "CPU:"
  kubectl top pods -n "$NS" --containers | grep istio-proxy

  # Envoy version
  echo "Envoy version:"
  kubectl exec -n "$NS" deploy/echo-server -c istio-proxy -- pilot-agent version 2>/dev/null
done
```

For a more detailed comparison, use Prometheus:

```promql
# Compare average CPU usage between versions
avg(rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="bench-v120"
}[5m]))

avg(rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="bench-v121"
}[5m]))

# Compare memory
avg(container_memory_working_set_bytes{
  container="istio-proxy",
  namespace="bench-v120"
})

avg(container_memory_working_set_bytes{
  container="istio-proxy",
  namespace="bench-v121"
})
```

## Control Plane Performance Comparison

Don't just compare data plane performance. The control plane (istiod) also changes between versions:

```promql
# xDS push time per revision
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket{revision="1-20"}[5m])) by (le))
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket{revision="1-21"}[5m])) by (le))

# Memory usage per istiod instance
container_memory_working_set_bytes{
  pod=~"istiod-1-20.*",
  container="discovery"
}

container_memory_working_set_bytes{
  pod=~"istiod-1-21.*",
  container="discovery"
}
```

## Testing Configuration Push Performance

Measure how quickly each version pushes configuration changes. Add a new service and time how long it takes for proxies to receive the update:

```bash
# Time the configuration push for v1.20
START=$(date +%s%N)
kubectl create -n bench-v120 service clusterip timing-test --tcp=9999:9999
# Wait until the proxy sees the new cluster
while ! kubectl exec -n bench-v120 deploy/echo-server -c istio-proxy -- \
  pilot-agent request GET /clusters 2>/dev/null | grep -q timing-test; do
  sleep 0.1
done
END=$(date +%s%N)
echo "v1.20 push time: $(( (END - START) / 1000000 )) ms"

# Clean up and repeat for v1.21
kubectl delete -n bench-v120 service timing-test

START=$(date +%s%N)
kubectl create -n bench-v121 service clusterip timing-test --tcp=9999:9999
while ! kubectl exec -n bench-v121 deploy/echo-server -c istio-proxy -- \
  pilot-agent request GET /clusters 2>/dev/null | grep -q timing-test; do
  sleep 0.1
done
END=$(date +%s%N)
echo "v1.21 push time: $(( (END - START) / 1000000 )) ms"
kubectl delete -n bench-v121 service timing-test
```

## Automating Version Comparison

For ongoing tracking, automate the comparison as part of your upgrade workflow:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-version-benchmark
  namespace: bench
spec:
  template:
    spec:
      containers:
        - name: benchmark
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - /scripts/run-benchmarks.sh
          volumeMounts:
            - name: scripts
              mountPath: /scripts
            - name: results
              mountPath: /results
      volumes:
        - name: scripts
          configMap:
            name: benchmark-scripts
            defaultMode: 0755
        - name: results
          persistentVolumeClaim:
            claimName: benchmark-results
      restartPolicy: Never
```

## Making the Upgrade Decision

After collecting all the data, create a summary report:

```text
Istio Version Comparison: 1.20.3 -> 1.21.0
============================================

Data Plane Performance:
- P50 latency: -5% (improved)
- P99 latency: +2% (slight regression)
- Max throughput: +8% (improved)
- Connection churn: -3% (improved)

Resource Usage:
- Sidecar memory (idle): -10% (improved)
- Sidecar memory (under load): -5% (improved)
- Sidecar CPU (under load): +3% (slight regression)

Control Plane:
- Config push time: -15% (improved)
- istiod memory: -8% (improved)

Recommendation: Upgrade. The improvements in throughput
and memory justify the minor regressions in P99 latency
and CPU usage.
```

A clear comparison report makes the upgrade decision data-driven instead of based on guesswork. Keep these reports for historical reference so you can track performance trends across multiple versions.

Run these comparisons every time you plan to upgrade Istio. The time invested in benchmarking is a fraction of the time you'd spend debugging a performance regression that slipped into production unnoticed.
