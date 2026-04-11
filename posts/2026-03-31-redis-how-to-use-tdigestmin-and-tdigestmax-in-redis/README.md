# How to Use TDIGEST.MIN and TDIGEST.MAX in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Min Max, Statistical Analysis

Description: Learn how to use TDIGEST.MIN and TDIGEST.MAX in Redis to retrieve the minimum and maximum observed values from a T-Digest structure.

---

## What Are TDIGEST.MIN and TDIGEST.MAX?

`TDIGEST.MIN` and `TDIGEST.MAX` return the minimum and maximum values that have been added to a T-Digest structure. Unlike the probabilistic estimates returned by `TDIGEST.QUANTILE` or `TDIGEST.CDF`, these commands return exact values because the minimum and maximum are always tracked precisely in a T-Digest.

This makes them useful for detecting outliers, validating data ranges, and setting alert thresholds.

## Syntax

```text
TDIGEST.MIN key
TDIGEST.MAX key
```

## Basic Usage

```bash
TDIGEST.CREATE latency COMPRESSION 200
TDIGEST.ADD latency 45 12 88 23 350 19 67 500 8 120

TDIGEST.MIN latency
# Returns: "8"

TDIGEST.MAX latency
# Returns: "500"
```

## Comparing MIN/MAX to Percentiles

The min and max are exact whereas quantile estimates are approximate:

```bash
TDIGEST.CREATE response_times COMPRESSION 200
TDIGEST.ADD response_times 10 20 30 40 50 60 70 80 90 100 5000

# Exact values
TDIGEST.MIN response_times    # -> "10"
TDIGEST.MAX response_times    # -> "5000"

# Quantile estimates
TDIGEST.QUANTILE response_times 0.0    # -> "10"  (same as MIN)
TDIGEST.QUANTILE response_times 1.0    # -> "5000" (same as MAX)
```

## Detecting Outliers with MIN and MAX

Use min/max to validate that incoming data falls within expected ranges:

```bash
# After collecting temperature sensor data
TDIGEST.CREATE sensors:temp COMPRESSION 100
TDIGEST.ADD sensors:temp 20.1 19.8 21.3 20.5 22.1 19.9 20.7 21.0 18.5 -50.0 85.0

TDIGEST.MIN sensors:temp
# Returns: "-50" - clearly an outlier or sensor fault

TDIGEST.MAX sensors:temp
# Returns: "85" - another outlier
```

## Python Example: Range Validation Dashboard

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_range_stats(key: str) -> dict:
    """Get min, max, and percentile range for a T-Digest."""
    min_val = r.execute_command("TDIGEST.MIN", key)
    max_val = r.execute_command("TDIGEST.MAX", key)
    p1, p99 = r.execute_command("TDIGEST.QUANTILE", key, "0.01", "0.99")

    return {
        "min": float(min_val) if min_val else None,
        "max": float(max_val) if max_val else None,
        "p1": float(p1) if p1 else None,
        "p99": float(p99) if p99 else None,
        "outlier_floor": float(min_val) < float(p1) if min_val and p1 else False,
        "outlier_ceiling": float(max_val) > float(p99) if max_val and p99 else False
    }

# Initialize and add data
r.execute_command("TDIGEST.CREATE", "cpu:usage", "COMPRESSION", 150)
cpu_readings = [45, 48, 52, 47, 50, 55, 49, 51, 46, 53, 48, 52, 50, 49, 47, 2, 98]
r.execute_command("TDIGEST.ADD", "cpu:usage", *[str(v) for v in cpu_readings])

stats = get_range_stats("cpu:usage")
print(f"Min: {stats['min']}%  Max: {stats['max']}%")
print(f"p1: {stats['p1']}%   p99: {stats['p99']}%")
print(f"Low outlier detected: {stats['outlier_floor']}")
print(f"High outlier detected: {stats['outlier_ceiling']}")
```

## Alerting on Extreme Values

Combine min/max with application-level thresholds for alerting:

```bash
# Store thresholds as separate Redis keys
SET alert:latency:max_threshold 2000
SET alert:latency:min_threshold 1

# Check current min/max
TDIGEST.MIN api:latency
TDIGEST.MAX api:latency

# In your application, compare these to the thresholds
```

```python
def check_range_alert(key: str, min_threshold: float, max_threshold: float) -> list:
    alerts = []
    min_val = r.execute_command("TDIGEST.MIN", key)
    max_val = r.execute_command("TDIGEST.MAX", key)

    if min_val and float(min_val) < min_threshold:
        alerts.append(f"MIN {float(min_val)} is below threshold {min_threshold}")

    if max_val and float(max_val) > max_threshold:
        alerts.append(f"MAX {float(max_val)} exceeds threshold {max_threshold}")

    return alerts

alerts = check_range_alert("api:latency", 1, 5000)
for alert in alerts:
    print(f"ALERT: {alert}")
```

## Querying Both Together

For efficiency, query both in a pipeline:

```python
with r.pipeline() as pipe:
    pipe.execute_command("TDIGEST.MIN", "api:latency")
    pipe.execute_command("TDIGEST.MAX", "api:latency")
    results = pipe.execute()

min_latency = float(results[0]) if results[0] else None
max_latency = float(results[1]) if results[1] else None
print(f"Latency range: {min_latency}ms to {max_latency}ms")
```

## Edge Cases

```bash
# Empty T-Digest
TDIGEST.CREATE empty COMPRESSION 100
TDIGEST.MIN empty    # Returns: "nan"
TDIGEST.MAX empty    # Returns: "nan"

# Single element
TDIGEST.ADD empty 42.5
TDIGEST.MIN empty    # Returns: "42.5"
TDIGEST.MAX empty    # Returns: "42.5"
```

## Summary

`TDIGEST.MIN` and `TDIGEST.MAX` provide exact minimum and maximum values from a Redis T-Digest, unlike probabilistic estimates from other T-Digest commands. They are useful for detecting outliers, validating data ranges, and setting alert thresholds. For empty structures, both return nan. Use them alongside `TDIGEST.QUANTILE` to build a complete picture of your data distribution from the extreme values to the center.
