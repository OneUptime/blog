# How to Interpret Dapr Performance Test Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Testing, Analysis, Latency

Description: Learn how to interpret Dapr performance test output including latency percentiles, throughput metrics, and error rates to make informed optimization decisions.

---

## Overview

Raw load test output contains a wealth of information, but understanding what the numbers mean and which ones matter most for Dapr applications requires context. This guide explains how to read and act on performance test results.

## Reading hey Output

A typical `hey` output for Dapr service invocation:

```text
Summary:
  Total:        30.0124 secs
  Slowest:      0.8423 secs
  Fastest:      0.0012 secs
  Average:      0.0089 secs
  Requests/sec: 11218.43

  Total data:   1234567 bytes
  Size/request: 123 bytes

Response time histogram:
  0.001 [1]      |
  0.085 [99821]  |■■■■■■■■■■■■■■■■■■■■
  0.169 [156]    |
  0.253 [14]     |
  0.338 [5]      |
  0.422 [2]      |
  0.506 [1]      |

Latency distribution:
  10% in 0.0045 secs
  25% in 0.0058 secs
  50% in 0.0079 secs
  75% in 0.0102 secs
  90% in 0.0134 secs
  95% in 0.0167 secs
  99% in 0.0289 secs

Status code distribution:
  [200] 99995 responses
  [429] 3 responses
  [503] 2 responses
```

## What Each Metric Means

**P50 (median)**: Half of requests complete within this time. Reflects typical user experience.

**P95**: 95% of requests complete within this time. Useful for SLO definitions.

**P99**: 99% of requests complete within this time. Reveals tail latency issues.

**Slowest**: The worst single request. Often caused by JVM GC pauses, connection establishment, or cold starts - usually not representative.

**Requests/sec**: Sustained throughput. Divide by replica count for per-instance throughput.

## Evaluating Results for Dapr

```python
def evaluate_dapr_results(results: dict) -> dict:
    recommendations = []

    # Check P99 latency
    if results['p99_ms'] > 100:
        recommendations.append(
            f"P99 {results['p99_ms']}ms is high. "
            "Consider switching to gRPC or increasing sidecar CPU."
        )

    # Check error rate
    error_rate = results['errors'] / results['total_requests']
    if error_rate > 0.001:
        recommendations.append(
            f"Error rate {error_rate:.2%} exceeds 0.1%. "
            "Check for rate limiting (429) or sidecar crashes (503)."
        )

    # Check throughput
    if results['rps'] < results['target_rps'] * 0.9:
        recommendations.append(
            f"Achieved {results['rps']:.0f} RPS vs target "
            f"{results['target_rps']}. Scale replicas or optimize sidecar settings."
        )

    return {"pass": len(recommendations) == 0, "issues": recommendations}
```

## Identifying Common Patterns

**High tail latency (P99 >> P50)**: Connection pool exhaustion, GC pauses, or timeouts. Increase connection pools and check GC logs.

**Flat throughput curve**: Sidecar CPU or memory is the bottleneck. Increase resource limits or add replicas.

**Periodic latency spikes**: mTLS certificate rotation or Dapr component health checks. Correlate with sidecar logs.

**Rate-limit errors (429)**: `app-max-concurrency` too low or middleware rate limits exceeded. Increase limits or add replicas.

## Comparing Before and After Optimization

```bash
# Before: baseline measurement
hey -n 50000 -c 100 http://localhost:3500/v1.0/invoke/svc/method/test \
  2>&1 | tee before.txt

# Apply optimization (e.g., switch to gRPC)
# ...

# After: post-optimization measurement
hey -n 50000 -c 100 http://localhost:3500/v1.0/invoke/svc/method/test \
  2>&1 | tee after.txt

# Compare
diff <(grep "in 0" before.txt) <(grep "in 0" after.txt)
```

## Summary

Interpreting Dapr performance results means focusing on P99 latency for SLO compliance, throughput for capacity planning, and error rates for reliability assessment. High tail latency points to connection or GC issues, flat throughput curves indicate resource bottlenecks, and periodic spikes correlate with Dapr background operations. Always compare against a baseline to quantify the impact of optimizations.
