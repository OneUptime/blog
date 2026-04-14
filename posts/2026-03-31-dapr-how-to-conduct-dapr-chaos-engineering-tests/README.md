# How to Conduct Dapr Chaos Engineering Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Chaos Engineering, Resilience, Testing, Kubernetes

Description: Learn how to run chaos engineering tests against Dapr-enabled microservices to validate resiliency policies and failure recovery behavior.

---

## Overview

Chaos engineering validates that your Dapr-based microservices handle failures gracefully. By intentionally injecting faults - killing sidecars, blocking network traffic, or corrupting state stores - you can verify that your Resiliency policies, circuit breakers, and retry logic work as expected in production-like conditions.

## Prerequisites

- Dapr installed on Kubernetes (v1.10+)
- Chaos Mesh or LitmusChaos installed
- `kubectl` and `dapr` CLI configured

Install Chaos Mesh:

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-testing \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

## Define Dapr Resiliency Policies

Before running chaos tests, configure Dapr Resiliency so your app can recover:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: default
spec:
  policies:
    retries:
      retryThree:
        policy: exponential
        maxRetries: 3
        maxInterval: 10s
    circuitBreakers:
      cbPolicy:
        maxRequests: 1
        interval: 5s
        timeout: 30s
        trip: consecutiveFailures >= 3
    timeouts:
      generalTimeout: 5s
  targets:
    apps:
      order-service:
        retry: retryThree
        circuitBreaker: cbPolicy
        timeout: generalTimeout
```

Apply the policy:

```bash
kubectl apply -f resiliency.yaml
```

## Test 1 - Kill the Dapr Sidecar

This test validates that your app handles sidecar restarts gracefully:

```yaml
# dapr-sidecar-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-dapr-sidecar
  namespace: default
spec:
  action: container-kill
  mode: one
  selector:
    namespaces:
    - default
    labelSelectors:
      app: checkout-service
  containerNames:
  - daprd
  duration: "60s"
```

Apply and observe:

```bash
kubectl apply -f dapr-sidecar-kill.yaml

# Watch sidecar restart
kubectl get pods -w -l app=checkout-service

# Check application logs for error handling
kubectl logs -f deployment/checkout-service -c checkout-service
```

## Test 2 - Network Partition Between Services

Simulate a network partition to test Dapr circuit breakers:

```yaml
# network-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: partition-order-service
  namespace: default
spec:
  action: partition
  mode: all
  selector:
    namespaces:
    - default
    labelSelectors:
      app: checkout-service
  direction: to
  target:
    mode: all
    selector:
      namespaces:
      - default
      labelSelectors:
        app: order-service
  duration: "120s"
```

```bash
kubectl apply -f network-partition.yaml

# Send test requests and observe circuit breaker behavior
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://checkout-service:3000/checkout
  sleep 1
done
```

## Test 3 - Inject Latency into Service Calls

Test timeout handling by injecting delay:

```yaml
# latency-injection.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-order-service
  namespace: default
spec:
  action: delay
  mode: all
  selector:
    namespaces:
    - default
    labelSelectors:
      app: order-service
  delay:
    latency: "8000ms"
    correlation: "100"
    jitter: "0ms"
  duration: "90s"
```

This should trigger Dapr's 5-second timeout defined in the Resiliency policy.

## Test 4 - Redis State Store Failure

Simulate state store unavailability using pod failure:

```yaml
# redis-failure.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-redis
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
    - default
    labelSelectors:
      app: redis
  duration: "60s"
```

Observe how your app handles state store errors:

```bash
kubectl apply -f redis-failure.yaml
kubectl logs -f deployment/checkout-service -c daprd | grep -E "(state|error|retry)"
```

## Measuring Test Results

Use Dapr metrics to measure the impact of chaos tests:

```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring

# Query Dapr service invocation error rate
# In Prometheus UI, run:
# rate(dapr_http_server_request_count{status=~"5.."}[1m])
```

Write a test validation script:

```bash
#!/bin/bash
# chaos-validate.sh
ENDPOINT="http://checkout-service:3000/health"
PASS=0
FAIL=0

for i in {1..100}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)
  if [ "$HTTP_CODE" -eq 200 ]; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
  sleep 0.5
done

echo "Pass: $PASS, Fail: $FAIL"
echo "Success rate: $(echo "scale=2; $PASS / ($PASS + $FAIL) * 100" | bc)%"
```

## Automating Chaos Tests in CI/CD

Integrate chaos tests into your pipeline:

```yaml
# .github/workflows/chaos.yml
name: Chaos Tests
on:
  schedule:
  - cron: '0 2 * * *'
jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
    - name: Apply chaos experiment
      run: kubectl apply -f chaos/network-partition.yaml
    - name: Wait for experiment duration
      run: sleep 130
    - name: Validate service health
      run: bash chaos/chaos-validate.sh
    - name: Cleanup chaos experiment
      run: kubectl delete -f chaos/network-partition.yaml
```

## Summary

Dapr chaos engineering tests validate that Resiliency policies, circuit breakers, and timeout configurations actually protect your application under real failure conditions. By using tools like Chaos Mesh to kill sidecars, inject latency, and partition networks, you can systematically verify your system's fault tolerance. Automating these tests as part of your CI/CD pipeline ensures that resiliency properties are maintained as your codebase evolves.
