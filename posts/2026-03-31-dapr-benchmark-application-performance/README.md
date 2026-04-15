# How to Benchmark Dapr Application Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Benchmark, Performance, Testing, Latency

Description: Learn how to benchmark Dapr application performance using load testing tools to measure throughput, latency, and sidecar overhead.

---

## Overview

Benchmarking Dapr applications involves measuring both direct application performance and the overhead introduced by the Dapr sidecar. By comparing baseline (without Dapr) to Dapr-enabled measurements, you can quantify overhead and set performance SLOs.

## Setting Up the Test Environment

Use a dedicated namespace for benchmarking:

```bash
kubectl create namespace dapr-bench
kubectl label namespace dapr-bench dapr.io/enabled=true
```

Deploy a simple benchmark target service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bench-target
  namespace: dapr-bench
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bench-target
  template:
    metadata:
      labels:
        app: bench-target
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "bench-target"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: bench-target
        image: hashicorp/http-echo:latest
        args: ["-listen=:8080", "-text=ok"]
        ports:
        - containerPort: 8080
```

## Benchmarking with hey

Install and run `hey` for HTTP load testing:

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Benchmark direct service (no Dapr)
hey -n 10000 -c 100 http://bench-target.dapr-bench.svc:8080/

# Benchmark via Dapr service invocation
hey -n 10000 -c 100 \
  http://localhost:3500/v1.0/invoke/bench-target/method/
```

## Using wrk for Advanced Benchmarks

```bash
# Install wrk
brew install wrk

# Run wrk benchmark
wrk -t8 -c200 -d60s --latency \
  http://localhost:3500/v1.0/invoke/bench-target/method/
```

## Measuring State Store Performance

```python
import time
from dapr.clients import DaprClient

def bench_state_store(iterations=10000):
    times = []
    with DaprClient() as client:
        for i in range(iterations):
            start = time.perf_counter()
            client.save_state("statestore", f"bench:{i}", f"value:{i}")
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)

    times.sort()
    print(f"P50: {times[len(times)//2]:.2f}ms")
    print(f"P95: {times[int(len(times)*0.95)]:.2f}ms")
    print(f"P99: {times[int(len(times)*0.99)]:.2f}ms")
    print(f"Throughput: {iterations / sum(times) * 1000:.0f} ops/sec")

bench_state_store()
```

## Interpreting Results

Typical Dapr sidecar overhead targets:
- Service invocation: P99 < 5ms added latency
- State store reads: P99 < 2ms added latency
- Pub/sub publish: P99 < 10ms added latency

If overhead exceeds these targets, investigate network configuration, sidecar resource limits, and whether tracing is adding serialization overhead.

## Automating Benchmarks in CI

```yaml
# .github/workflows/bench.yml
- name: Run Dapr benchmarks
  run: |
    hey -n 5000 -c 50 -o csv \
      http://localhost:3500/v1.0/invoke/bench-target/method/ \
      > results.csv
    python analyze_bench.py results.csv
```

## Summary

Benchmarking Dapr requires measuring both baseline application performance and Dapr sidecar overhead separately. Use tools like `hey` and `wrk` for HTTP load testing, write targeted micro-benchmarks for state store and pub/sub operations, and automate benchmarks in CI to detect performance regressions before they reach production.
