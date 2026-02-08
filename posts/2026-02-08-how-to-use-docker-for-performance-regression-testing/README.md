# How to Use Docker for Performance Regression Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance Testing, Regression Testing, Benchmarking, CI/CD, Monitoring, DevOps

Description: Detect performance regressions automatically by running reproducible benchmark tests in Docker containers.

---

Performance regressions sneak into codebases silently. A new feature adds 50ms to API response times. A dependency upgrade doubles memory usage. An ORM query change turns a 10ms lookup into a 200ms full table scan. None of these show up in unit tests. You only notice when users complain or your monitoring alerts fire. Performance regression testing catches these problems at build time, before they reach production.

Docker makes performance regression testing practical by providing identical execution environments for every benchmark run. The results are comparable across builds because the hardware abstraction is consistent.

## The Performance Regression Testing Approach

The process has four steps: establish a baseline, run benchmarks on new code, compare results against the baseline, and fail the build if performance degrades beyond a threshold. Docker ensures that the benchmark environment is identical every time, removing environmental noise from the measurements.

## Setting Up the Benchmark Environment

Create a controlled Docker environment for running performance benchmarks.

```yaml
# docker-compose.benchmark.yml - Performance benchmarking environment
version: "3.8"

services:
  # Database with deterministic configuration
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=bench
      - POSTGRES_PASSWORD=bench
      - POSTGRES_DB=benchmark
    # Fixed resource limits for reproducible results
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bench -d benchmark"]
      interval: 2s
      timeout: 2s
      retries: 10
    # Disable WAL for faster writes during benchmarks
    command:
      - "postgres"
      - "-c"
      - "fsync=off"
      - "-c"
      - "synchronous_commit=off"

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 2s
      retries: 10

  # Application under test with fixed resource limits
  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://bench:bench@postgres:5432/benchmark
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 3s
      timeout: 3s
      retries: 15

  # Benchmark runner
  benchmark:
    build:
      context: ./benchmarks
      dockerfile: Dockerfile
    environment:
      - TARGET_URL=http://api:3000
      - RESULTS_DIR=/results
    depends_on:
      api:
        condition: service_healthy
    volumes:
      - ./benchmark-results:/results
```

The fixed resource limits are essential. Without them, benchmark results vary depending on what else is running on the host machine.

## Writing Benchmark Tests

Create a benchmark suite that measures key performance indicators.

```python
# benchmarks/run_benchmarks.py - Performance benchmark suite
import requests
import time
import json
import statistics
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

TARGET_URL = os.environ.get("TARGET_URL", "http://localhost:3000")
RESULTS_DIR = os.environ.get("RESULTS_DIR", "./results")

def benchmark_endpoint(url, method="GET", body=None, iterations=100):
    """Run a benchmark against a single endpoint and collect timing data."""
    latencies = []
    errors = 0

    for _ in range(iterations):
        try:
            start = time.perf_counter()
            if method == "GET":
                resp = requests.get(url, timeout=10)
            elif method == "POST":
                resp = requests.post(url, json=body, timeout=10)
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms

            if resp.status_code < 400:
                latencies.append(elapsed)
            else:
                errors += 1
        except Exception:
            errors += 1

    if not latencies:
        return {"error": "All requests failed"}

    latencies.sort()
    return {
        "count": len(latencies),
        "errors": errors,
        "mean_ms": round(statistics.mean(latencies), 2),
        "median_ms": round(statistics.median(latencies), 2),
        "p95_ms": round(latencies[int(len(latencies) * 0.95)], 2),
        "p99_ms": round(latencies[int(len(latencies) * 0.99)], 2),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
        "stddev_ms": round(statistics.stdev(latencies), 2) if len(latencies) > 1 else 0
    }

def benchmark_throughput(url, duration_seconds=10, concurrency=10):
    """Measure maximum throughput under concurrent load."""
    completed = 0
    errors = 0
    start_time = time.time()

    def make_request():
        nonlocal completed, errors
        while time.time() - start_time < duration_seconds:
            try:
                resp = requests.get(url, timeout=10)
                if resp.status_code < 400:
                    completed += 1
                else:
                    errors += 1
            except Exception:
                errors += 1

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request) for _ in range(concurrency)]
        for f in as_completed(futures):
            f.result()

    elapsed = time.time() - start_time
    return {
        "total_requests": completed,
        "errors": errors,
        "duration_seconds": round(elapsed, 2),
        "requests_per_second": round(completed / elapsed, 2)
    }

# Define the benchmark suite
benchmarks = {
    "health_check": {
        "url": f"{TARGET_URL}/health",
        "method": "GET",
        "iterations": 200
    },
    "list_users": {
        "url": f"{TARGET_URL}/api/users",
        "method": "GET",
        "iterations": 100
    },
    "create_user": {
        "url": f"{TARGET_URL}/api/users",
        "method": "POST",
        "body": {"name": "Bench User", "email": "bench@example.com"},
        "iterations": 50
    },
    "search_users": {
        "url": f"{TARGET_URL}/api/users?search=test",
        "method": "GET",
        "iterations": 100
    }
}

# Run benchmarks
print("Running performance benchmarks...")
print("=" * 60)

results = {}
for name, config in benchmarks.items():
    print(f"\nBenchmarking: {name}")
    result = benchmark_endpoint(
        config["url"],
        method=config.get("method", "GET"),
        body=config.get("body"),
        iterations=config.get("iterations", 100)
    )
    results[name] = result
    print(f"  Mean: {result.get('mean_ms', 'N/A')}ms | P95: {result.get('p95_ms', 'N/A')}ms | P99: {result.get('p99_ms', 'N/A')}ms")

# Throughput test
print(f"\nRunning throughput test...")
throughput = benchmark_throughput(f"{TARGET_URL}/health", duration_seconds=10, concurrency=20)
results["throughput"] = throughput
print(f"  Throughput: {throughput['requests_per_second']} req/s")

# Save results
os.makedirs(RESULTS_DIR, exist_ok=True)
results_file = os.path.join(RESULTS_DIR, "benchmark-results.json")
with open(results_file, "w") as f:
    json.dump(results, f, indent=2)

print(f"\nResults saved to: {results_file}")
```

## Comparing Against Baselines

The comparison script is the heart of the regression detection system. It loads the baseline, compares it to the current results, and fails if performance degrades beyond the threshold.

```python
# benchmarks/compare.py - Compare benchmark results against baseline
import json
import sys
import os

RESULTS_DIR = os.environ.get("RESULTS_DIR", "./results")
THRESHOLD_PERCENT = float(os.environ.get("REGRESSION_THRESHOLD", "15"))

def load_json(path):
    with open(path) as f:
        return json.load(f)

def compare_results(baseline, current, threshold_pct):
    """Compare current results against baseline and detect regressions."""
    regressions = []
    improvements = []
    stable = []

    for endpoint, baseline_data in baseline.items():
        if endpoint not in current:
            continue
        if endpoint == "throughput":
            continue

        current_data = current[endpoint]
        if "error" in current_data or "error" in baseline_data:
            continue

        # Compare P95 latency
        baseline_p95 = baseline_data["p95_ms"]
        current_p95 = current_data["p95_ms"]

        if baseline_p95 == 0:
            continue

        change_pct = ((current_p95 - baseline_p95) / baseline_p95) * 100

        result = {
            "endpoint": endpoint,
            "baseline_p95_ms": baseline_p95,
            "current_p95_ms": current_p95,
            "change_percent": round(change_pct, 1)
        }

        if change_pct > threshold_pct:
            regressions.append(result)
        elif change_pct < -threshold_pct:
            improvements.append(result)
        else:
            stable.append(result)

    return regressions, improvements, stable

# Load results
baseline_path = os.path.join(RESULTS_DIR, "baseline.json")
current_path = os.path.join(RESULTS_DIR, "benchmark-results.json")

if not os.path.exists(baseline_path):
    print("No baseline found. Saving current results as baseline.")
    import shutil
    shutil.copy(current_path, baseline_path)
    sys.exit(0)

baseline = load_json(baseline_path)
current = load_json(current_path)

regressions, improvements, stable = compare_results(baseline, current, THRESHOLD_PERCENT)

print("Performance Regression Report")
print("=" * 60)
print(f"Threshold: {THRESHOLD_PERCENT}% degradation\n")

if stable:
    print("Stable endpoints:")
    for r in stable:
        print(f"  {r['endpoint']}: {r['baseline_p95_ms']}ms -> {r['current_p95_ms']}ms ({r['change_percent']:+.1f}%)")

if improvements:
    print("\nPerformance improvements:")
    for r in improvements:
        print(f"  {r['endpoint']}: {r['baseline_p95_ms']}ms -> {r['current_p95_ms']}ms ({r['change_percent']:+.1f}%)")

if regressions:
    print("\nPERFORMANCE REGRESSIONS DETECTED:")
    for r in regressions:
        print(f"  {r['endpoint']}: {r['baseline_p95_ms']}ms -> {r['current_p95_ms']}ms ({r['change_percent']:+.1f}%)")
    print(f"\nFAILED: {len(regressions)} endpoint(s) degraded beyond {THRESHOLD_PERCENT}% threshold")
    sys.exit(1)
else:
    print("\nPASSED: No performance regressions detected")
    sys.exit(0)
```

## Dockerfile for the Benchmark Runner

```dockerfile
# benchmarks/Dockerfile - Benchmark runner container
FROM python:3.12-slim

WORKDIR /benchmarks

RUN pip install --no-cache-dir requests

COPY run_benchmarks.py compare.py ./

# Run benchmarks then compare against baseline
CMD python run_benchmarks.py && python compare.py
```

## Running the Full Pipeline

```bash
# Run benchmarks
docker compose -f docker-compose.benchmark.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from benchmark

# The first run creates a baseline. Subsequent runs compare against it.

# Clean up
docker compose -f docker-compose.benchmark.yml down -v
```

## Updating the Baseline

When you intentionally change performance characteristics (adding a new feature that legitimately increases response time), update the baseline.

```bash
# Copy current results as the new baseline
cp benchmark-results/benchmark-results.json benchmark-results/baseline.json
```

## CI/CD Integration

```yaml
# .github/workflows/perf-regression.yml - Performance regression testing
name: Performance Regression Test

on:
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Download baseline
        uses: actions/download-artifact@v4
        with:
          name: performance-baseline
          path: benchmark-results/
        continue-on-error: true  # No baseline on first run

      - name: Run performance benchmarks
        run: |
          docker compose -f docker-compose.benchmark.yml up \
            --build \
            --abort-on-container-exit \
            --exit-code-from benchmark
        env:
          REGRESSION_THRESHOLD: "15"

      - name: Save baseline for future runs
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: performance-baseline
          path: benchmark-results/baseline.json

      - name: Upload benchmark results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: benchmark-results
          path: benchmark-results/

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.benchmark.yml down -v
```

## Reducing Noise in Benchmarks

Performance benchmarks are inherently noisy. Reduce variance by running multiple iterations, using fixed CPU/memory limits in Docker, warming up the application before measuring, and using statistical measures (P95, P99) instead of averages.

```python
# Add a warmup phase before collecting measurements
def warmup(url, requests_count=50):
    """Send warmup requests to stabilize JIT, caches, and connection pools."""
    for _ in range(requests_count):
        try:
            requests.get(url, timeout=5)
        except Exception:
            pass
    time.sleep(1)  # Let things settle

warmup(f"{TARGET_URL}/health")
```

## Wrapping Up

Performance regression testing in Docker catches slowdowns before they reach production. The fixed resource limits and identical environments make results comparable across builds. Start with a few critical endpoints, establish baselines, and set reasonable thresholds. The 15% default is a good starting point - tight enough to catch real regressions, loose enough to avoid false positives from measurement noise. Over time, you will build confidence in your application's performance characteristics and catch regressions the day they are introduced.
