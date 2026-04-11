# How to Use TDIGEST.QUANTILE in Redis for Percentile Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Percentile, Quantile, Performance Monitoring

Description: Learn how to use TDIGEST.QUANTILE in Redis to query p50, p95, and p99 percentiles from a T-Digest for latency and performance monitoring.

---

## What Is TDIGEST.QUANTILE?

`TDIGEST.QUANTILE` queries a T-Digest structure to return the value at a given quantile (percentile). A quantile of 0.95 corresponds to the 95th percentile (p95), meaning 95% of observed values are at or below the returned estimate.

This is the primary command for percentile-based SLA monitoring, alerting, and dashboards.

## Syntax

```text
TDIGEST.QUANTILE key quantile [quantile ...]
```

- `key` - the T-Digest structure name
- `quantile` - one or more values between 0.0 and 1.0

## Basic Usage

```bash
# Create and populate a T-Digest
TDIGEST.CREATE latency COMPRESSION 200
TDIGEST.ADD latency 12 18 23 45 67 88 110 250 340 490 1200 15 20 22 30

# Query single percentile
TDIGEST.QUANTILE latency 0.5
# (p50 - median)

# Query multiple percentiles at once
TDIGEST.QUANTILE latency 0.5 0.75 0.90 0.95 0.99 0.999
```

## Understanding Quantile Values

| Quantile | Percentile | Meaning |
|----------|-----------|---------|
| 0.5 | p50 | Median - half of requests are faster |
| 0.75 | p75 | 75% of requests are faster |
| 0.90 | p90 | 90% of requests are faster |
| 0.95 | p95 | 95% of requests are faster |
| 0.99 | p99 | 99% of requests are faster |
| 0.999 | p99.9 | 99.9% of requests are faster |

```bash
# SLA monitoring query
TDIGEST.QUANTILE api:response_time 0.50 0.95 0.99
# 1) "22.5"    (p50: 22.5ms)
# 2) "245.8"   (p95: 245.8ms)
# 3) "890.3"   (p99: 890.3ms)
```

## Real-World Latency Monitoring Example

Build a typical SLA dashboard query:

```bash
# Add realistic latency samples (milliseconds)
TDIGEST.CREATE checkout:latency COMPRESSION 200
TDIGEST.ADD checkout:latency 15 18 22 19 25 17 21 20 23 16
TDIGEST.ADD checkout:latency 28 35 42 38 31 45 55 48 62 70
TDIGEST.ADD checkout:latency 88 95 102 180 250 320 450 520 980 1500

# Check SLA compliance
TDIGEST.QUANTILE checkout:latency 0.5 0.95 0.99

# Check if p99 < 1000ms SLA
# If result > 1000, SLA is breached
```

## Python Example: SLA Monitoring Service

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def check_sla(service_name: str, sla_thresholds: dict) -> dict:
    """Check if a service is meeting its SLA thresholds."""
    key = f"latency:{service_name}"

    quantiles = sorted(sla_thresholds.keys())
    results = r.execute_command("TDIGEST.QUANTILE", key, *[str(q) for q in quantiles])

    report = {}
    for quantile, value in zip(quantiles, results):
        threshold = sla_thresholds[quantile]
        actual = float(value) if value else 0.0
        percentile_name = f"p{int(quantile * 100)}"
        report[percentile_name] = {
            "actual_ms": actual,
            "threshold_ms": threshold,
            "passing": actual <= threshold
        }

    return report

# Define SLA thresholds
sla = {
    0.50: 50,   # p50 < 50ms
    0.95: 200,  # p95 < 200ms
    0.99: 500   # p99 < 500ms
}

result = check_sla("checkout", sla)
for metric, data in result.items():
    status = "PASS" if data["passing"] else "FAIL"
    print(f"{metric}: {data['actual_ms']:.1f}ms (threshold: {data['threshold_ms']}ms) - {status}")
```

## Node.js Example: Dashboard Metrics

```javascript
const { createClient } = require("redis");

async function getLatencyPercentiles(serviceName) {
    const client = createClient();
    await client.connect();

    const key = `latency:${serviceName}`;
    const quantiles = ["0.5", "0.75", "0.90", "0.95", "0.99", "0.999"];

    const results = await client.sendCommand([
        "TDIGEST.QUANTILE", key, ...quantiles
    ]);

    const metrics = {};
    quantiles.forEach((q, idx) => {
        const pname = `p${Math.round(parseFloat(q) * 1000) / 10}`;
        metrics[pname] = parseFloat(results[idx]);
    });

    await client.disconnect();
    return metrics;
}

const metrics = await getLatencyPercentiles("api-gateway");
console.log("Latency percentiles:", metrics);
```

## Querying Edge Cases

```bash
# Query minimum (0th percentile)
TDIGEST.QUANTILE latency 0.0
# Returns the minimum observed value

# Query maximum (100th percentile)
TDIGEST.QUANTILE latency 1.0
# Returns the maximum observed value

# Query empty T-Digest
TDIGEST.CREATE empty_digest COMPRESSION 100
TDIGEST.QUANTILE empty_digest 0.5
# Returns: (nan) - no data yet
```

## Accuracy Notes

T-Digest is designed to be most accurate at extreme percentiles (near 0 and 1), so p99 and p99.9 estimates have lower error than p50. With `COMPRESSION 200`:

- p99 error: typically well under 1%
- p99.9 error: typically under 1%
- p50 error: typically under 1-2%

For extreme percentile tracking (p99, p99.9), T-Digest provides excellent accuracy. Higher compression values improve accuracy across all percentiles at the cost of more memory.

## Summary

`TDIGEST.QUANTILE` is the core query command for Redis T-Digest percentile analysis. You can query multiple percentiles in a single command, making it efficient for dashboards and SLA monitoring. The command supports quantiles from 0.0 to 1.0, returns nan for empty structures, and provides accurate estimates especially for tail percentiles like p99 and p99.9.
