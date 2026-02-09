# How to Implement Automated Performance Gate Checks in GitHub Actions Using OpenTelemetry Metric Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GitHub Actions, Performance Gates, CI/CD, Automation

Description: Implement automated performance gate checks in GitHub Actions that query OpenTelemetry metrics and fail builds when thresholds are exceeded.

Performance gates are checkpoints in your deployment pipeline that block a release if performance metrics do not meet defined criteria. Instead of relying on manual review of dashboards after deployment, you can make GitHub Actions query your OpenTelemetry metrics backend and automatically pass or fail the build. This post walks through implementing that end to end.

## The Performance Gate Workflow

The overall flow works like this: your CI pipeline deploys to a staging environment, runs a representative workload, waits for metrics to stabilize, queries the metrics backend, and then compares results against thresholds. If any threshold is breached, the workflow fails and the deployment does not proceed.

## Defining Thresholds in a Config File

Keep your performance thresholds version-controlled alongside your code:

```yaml
# .github/perf-thresholds.yaml
gates:
  - name: "API Response Time"
    metric: "http_request_duration_seconds"
    query_template: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service_name="api-service", deployment_env="staging"}[5m])) by (le))'
    max_value: 0.5  # P95 must be under 500ms
    unit: "seconds"

  - name: "Error Rate"
    metric: "http_errors_total"
    query_template: 'sum(rate(http_errors_total{service_name="api-service", deployment_env="staging"}[5m])) / sum(rate(http_requests_total{service_name="api-service", deployment_env="staging"}[5m]))'
    max_value: 0.01  # error rate must be under 1%
    unit: "ratio"

  - name: "Database Query P95"
    metric: "db_query_duration_seconds"
    query_template: 'histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{service_name="api-service"}[5m])) by (le))'
    max_value: 0.1  # P95 must be under 100ms
    unit: "seconds"

  - name: "Memory Usage"
    metric: "process_resident_memory_bytes"
    query_template: 'max(process_resident_memory_bytes{service_name="api-service", deployment_env="staging"})'
    max_value: 536870912  # must be under 512MB
    unit: "bytes"
```

## The Performance Gate Check Script

Write a Python script that reads the thresholds and queries Prometheus:

```python
# scripts/perf_gate_check.py
import yaml
import requests
import sys
import os
import time

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://prometheus:9090")
THRESHOLDS_FILE = os.environ.get("THRESHOLDS_FILE", ".github/perf-thresholds.yaml")

def load_thresholds():
    with open(THRESHOLDS_FILE) as f:
        config = yaml.safe_load(f)
    return config["gates"]

def query_metric(query):
    """Execute a PromQL query and return the scalar result."""
    resp = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if data["status"] != "success":
        raise Exception(f"Query failed: {data.get('error', 'unknown error')}")

    results = data.get("data", {}).get("result", [])
    if not results:
        return None

    return float(results[0]["value"][1])

def format_value(value, unit):
    """Format a metric value for human-readable output."""
    if unit == "seconds":
        return f"{value * 1000:.1f}ms"
    elif unit == "bytes":
        return f"{value / 1024 / 1024:.1f}MB"
    elif unit == "ratio":
        return f"{value * 100:.2f}%"
    return f"{value:.4f}"

def run_gates():
    gates = load_thresholds()
    results = []
    all_passed = True

    print("=" * 60)
    print("PERFORMANCE GATE CHECK")
    print("=" * 60)

    for gate in gates:
        name = gate["name"]
        query = gate["query_template"]
        max_val = gate["max_value"]
        unit = gate["unit"]

        actual = query_metric(query)

        if actual is None:
            print(f"  [SKIP] {name}: no data available")
            results.append({"name": name, "status": "skip"})
            continue

        passed = actual <= max_val
        status = "PASS" if passed else "FAIL"

        if not passed:
            all_passed = False

        actual_str = format_value(actual, unit)
        max_str = format_value(max_val, unit)
        print(f"  [{status}] {name}: {actual_str} (threshold: {max_str})")

        results.append({
            "name": name,
            "status": status,
            "actual": actual,
            "threshold": max_val,
        })

    print("=" * 60)
    return all_passed, results

def write_github_summary(results):
    """Write results to GitHub Actions step summary."""
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_file:
        return

    with open(summary_file, "a") as f:
        f.write("## Performance Gate Results\n\n")
        f.write("| Gate | Status | Value | Threshold |\n")
        f.write("|------|--------|-------|----------|\n")
        for r in results:
            status_icon = "Pass" if r["status"] == "PASS" else "Fail" if r["status"] == "FAIL" else "Skip"
            f.write(f"| {r['name']} | {status_icon} | {r.get('actual', 'N/A')} | {r.get('threshold', 'N/A')} |\n")

if __name__ == "__main__":
    # Wait for metrics to stabilize after deployment
    wait_time = int(os.environ.get("STABILIZATION_WAIT_SECONDS", "120"))
    print(f"Waiting {wait_time}s for metrics to stabilize...")
    time.sleep(wait_time)

    passed, results = run_gates()
    write_github_summary(results)

    if passed:
        print("\nAll performance gates PASSED")
        sys.exit(0)
    else:
        print("\nPerformance gates FAILED - blocking deployment")
        sys.exit(1)
```

## GitHub Actions Workflow

Here is the complete workflow that ties everything together:

```yaml
# .github/workflows/deploy-with-perf-gates.yml
name: Deploy with Performance Gates

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          kubectl set image deployment/api-service \
            api-service=myregistry/api-service:${{ github.sha }} \
            --namespace staging
          kubectl rollout status deployment/api-service --namespace staging --timeout=300s

      - name: Run load generator
        run: |
          # Send representative traffic to staging for 3 minutes
          k6 run --duration 3m --vus 20 load-tests/staging-smoke.js
        env:
          BASE_URL: https://staging.myapp.com

      - name: Performance gate check
        run: python scripts/perf_gate_check.py
        env:
          PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}
          THRESHOLDS_FILE: .github/perf-thresholds.yaml
          STABILIZATION_WAIT_SECONDS: 60

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/api-service \
            api-service=myregistry/api-service:${{ github.sha }} \
            --namespace production
```

## Handling Flaky Gates

Performance metrics have natural variance. A gate that passes 95% of the time but fails 5% due to noise will frustrate your team. To handle this, add retry logic with multiple samples:

```python
# Retry logic for flaky metrics
def query_with_retries(query, max_retries=3, delay_seconds=30):
    """Query a metric multiple times and return the median to reduce noise."""
    values = []
    for attempt in range(max_retries):
        val = query_metric(query)
        if val is not None:
            values.append(val)
        if attempt < max_retries - 1:
            time.sleep(delay_seconds)

    if not values:
        return None

    # Use the median to reduce the impact of outlier measurements
    values.sort()
    mid = len(values) // 2
    return values[mid]
```

## Posting Results as PR Comments

For pull request workflows, post the gate results directly on the PR:

```yaml
      - name: Post results to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('perf-results.json'));
            const body = results.map(r =>
              `| ${r.name} | ${r.status} | ${r.actual} | ${r.threshold} |`
            ).join('\n');

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Performance Gate Results\n\n| Gate | Status | Value | Threshold |\n|------|--------|-------|----------|\n${body}`
            });
```

## Wrapping Up

Performance gates in GitHub Actions bring automated quality control to your deployment pipeline. By querying OpenTelemetry metrics and comparing against defined thresholds, you catch performance regressions before they reach production. Keep your thresholds version-controlled, add retry logic for noisy metrics, and post results directly on PRs so developers get immediate feedback on the performance impact of their changes.
