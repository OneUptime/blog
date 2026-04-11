# How to Use TDIGEST.CDF in Redis for Cumulative Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Cumulative Distribution Function, Statistics

Description: Learn how to use TDIGEST.CDF in Redis to compute the fraction of values below a given threshold, enabling SLA compliance and anomaly detection.

---

## What Is TDIGEST.CDF?

`TDIGEST.CDF` computes the Cumulative Distribution Function (CDF) for a T-Digest structure. Given a value, it returns an estimation of the fraction of observations smaller than that value (plus half the observations equal to it).

This is the inverse of `TDIGEST.QUANTILE`: while QUANTILE asks "what value is at percentile X?", CDF asks "what percentile does value X correspond to?"

## Syntax

```text
TDIGEST.CDF key value [value ...]
```

Returns a floating-point number between 0.0 and 1.0 for each input value.

## Basic Usage

```bash
TDIGEST.CREATE response_times COMPRESSION 200
TDIGEST.ADD response_times 10 20 30 40 50 60 70 80 90 100 200 500 1000

# What fraction of requests are under 100ms?
TDIGEST.CDF response_times 100
# Returns: 0.769... (about 76.9% of requests are <= 100ms)

# What fraction are under 50ms?
TDIGEST.CDF response_times 50
# Returns: about 0.385 (38.5% under 50ms)

# Query multiple thresholds at once
TDIGEST.CDF response_times 50 100 200 500
```

## SLA Compliance Monitoring

CDF is perfect for checking what percentage of requests meet a given SLA threshold:

```bash
TDIGEST.CREATE checkout:latency COMPRESSION 200
TDIGEST.ADD checkout:latency 45 52 38 61 44 55 48 67 39 71 88 92 101 87 95
TDIGEST.ADD checkout:latency 110 89 94 88 77 99 490 512 480 503 495 1200 980

# What percentage of checkout requests complete in under 200ms?
TDIGEST.CDF checkout:latency 200
# 0.75 = 75% - SLA requires 95%, so we're below target

# Check multiple thresholds
TDIGEST.CDF checkout:latency 100 200 500 1000
# 1) "0.68"  - 68% under 100ms
# 2) "0.75"  - 75% under 200ms
# 3) "0.86"  - 86% under 500ms
# 4) "0.96"  - 96% under 1000ms
```

## Anomaly Detection with CDF

Use CDF to detect if a new measurement is unusual:

```bash
# Historical baseline stored in T-Digest
TDIGEST.CREATE baseline:cpu_usage COMPRESSION 150
TDIGEST.ADD baseline:cpu_usage 45 48 52 47 50 55 49 51 46 53 48 52 50 49 47

# Current CPU reading: 95%
TDIGEST.CDF baseline:cpu_usage 95
# Returns: 1.0 (100th percentile - extreme outlier)

# Threshold: flag if value is above the 95th historical percentile
TDIGEST.CDF baseline:cpu_usage 60
# Returns: 1.0 - 60% CPU is above all historical observations (max was 55%)
```

## Python Example: Real-Time Anomaly Detection

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def is_anomaly(metric_key: str, current_value: float, threshold: float = 0.95) -> bool:
    """Return True if current_value is above the threshold percentile historically."""
    result = r.execute_command("TDIGEST.CDF", metric_key, str(current_value))
    if result is None or result[0] is None:
        return False
    cdf_value = float(result[0])
    return cdf_value >= threshold

def record_and_check(metric_key: str, value: float) -> dict:
    """Add a value and check if it is anomalous."""
    r.execute_command("TDIGEST.ADD", metric_key, str(value))
    cdf = float(r.execute_command("TDIGEST.CDF", metric_key, str(value))[0])
    return {
        "value": value,
        "cdf": cdf,
        "percentile": f"p{cdf * 100:.1f}",
        "is_anomaly": cdf >= 0.99
    }

# Initialize baseline
r.execute_command("TDIGEST.CREATE", "api:error_rate", "COMPRESSION", 150)
for rate in [0.1, 0.2, 0.15, 0.3, 0.12, 0.18, 0.25, 0.22, 0.19, 0.11]:
    r.execute_command("TDIGEST.ADD", "api:error_rate", str(rate))

# Check a new reading
result = record_and_check("api:error_rate", 5.0)
print(f"Error rate {result['value']}% is at {result['percentile']}")
print(f"Anomaly: {result['is_anomaly']}")
```

## JavaScript Example: Histogram Approximation

```javascript
const { createClient } = require("redis");

async function buildCDFHistogram(key, thresholds) {
    const client = createClient();
    await client.connect();

    const results = await client.sendCommand([
        "TDIGEST.CDF",
        key,
        ...thresholds.map(String)
    ]);

    const histogram = thresholds.map((threshold, idx) => ({
        threshold,
        cumulative_fraction: parseFloat(results[idx]),
        percentage: `${(parseFloat(results[idx]) * 100).toFixed(1)}%`
    }));

    await client.disconnect();
    return histogram;
}

(async () => {
    const thresholds = [50, 100, 200, 500, 1000, 2000];
    const cdf = await buildCDFHistogram("api:latency", thresholds);
    console.table(cdf);
})();
```

## Comparing CDF vs QUANTILE

```bash
# These are inverse operations:

# QUANTILE: "What value is at p95?"
TDIGEST.QUANTILE latency 0.95
# Returns: 450 (ms)

# CDF: "What percentile is 450ms at?"
TDIGEST.CDF latency 450
# Returns: ~0.95 (95th percentile)
```

## Edge Cases

```bash
# Value below all samples
TDIGEST.CDF latency -1
# Returns: 0.0

# Value above all samples
TDIGEST.CDF latency 999999
# Returns: 1.0

# Empty T-Digest
TDIGEST.CREATE empty COMPRESSION 100
TDIGEST.CDF empty 100
# Returns: nan - no data
```

## Summary

`TDIGEST.CDF` returns the fraction of samples below a given value, making it the inverse of `TDIGEST.QUANTILE`. It is ideal for SLA compliance reporting ("what percentage of requests met the 200ms target?"), anomaly detection (checking if a new value is statistically unusual), and building approximate histograms. Multiple thresholds can be queried in a single command for efficiency.
