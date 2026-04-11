# How to Use TDIGEST.TRIMMED_MEAN in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Trimmed Mean, Statistical Analysis, Outlier Removal

Description: Learn how to use TDIGEST.TRIMMED_MEAN in Redis to compute the average of a T-Digest while excluding extreme outliers from both tails.

---

## What Is TDIGEST.TRIMMED_MEAN?

`TDIGEST.TRIMMED_MEAN` computes the mean (average) of values in a T-Digest, excluding a specified fraction of values from the low and high ends of the distribution. This produces a robust average that is not skewed by extreme outliers.

For example, a trimmed mean at (0.05, 0.95) computes the average of the middle 90% of values, discarding the bottom 5% and top 5%.

## Syntax

```text
TDIGEST.TRIMMED_MEAN key low_cut_quantile high_cut_quantile
```

- `low_cut_quantile` - quantile below which values are excluded (0.0 to 1.0). Use 0.0 for no low cut.
- `high_cut_quantile` - quantile at or above which values are excluded (0.0 to 1.0). Use 1.0 for no high cut.
- `low_cut_quantile` must be less than `high_cut_quantile`

## Basic Usage

```bash
TDIGEST.CREATE latency COMPRESSION 200
TDIGEST.ADD latency 10 12 15 18 20 22 25 28 30 35 1000 2000

# Full mean would be skewed by 1000 and 2000
# Trimmed mean removes top 10% and bottom 10%
TDIGEST.TRIMMED_MEAN latency 0.1 0.9
# Returns a value near 22 (average of middle 80%)

# No trimming - same as regular mean
TDIGEST.TRIMMED_MEAN latency 0.0 1.0

# Trim 5% from each end
TDIGEST.TRIMMED_MEAN latency 0.05 0.95
```

## Comparing Regular Mean vs Trimmed Mean

The difference is most visible with outliers:

```bash
TDIGEST.CREATE response_times COMPRESSION 200

# Normal responses: 10-50ms
# One outlier: 10000ms (network error)
TDIGEST.ADD response_times 12 18 22 25 19 15 23 20 17 21 24 10000

# Trimmed mean (remove bottom 5%, top 5%)
TDIGEST.TRIMMED_MEAN response_times 0.05 0.95
# Returns: ~19.8ms (realistic average)

# The regular mean would be inflated by the 10000ms outlier
# TDIGEST.QUANTILE response_times 0.5 gives median: ~20ms
```

## API Latency Monitoring Example

```bash
# Build up realistic latency data with occasional spikes
TDIGEST.CREATE api:checkout:latency COMPRESSION 200
TDIGEST.ADD api:checkout:latency 45 52 38 61 44 55 48 67 39 71
TDIGEST.ADD api:checkout:latency 88 92 101 87 95 110 89 94 88 77
TDIGEST.ADD api:checkout:latency 99 490 512 480 503 495 1200 980 2500 45

# Different trimming levels
TDIGEST.TRIMMED_MEAN api:checkout:latency 0.0 1.0    # All values, no trim
TDIGEST.TRIMMED_MEAN api:checkout:latency 0.05 0.95  # Trim 5% each side
TDIGEST.TRIMMED_MEAN api:checkout:latency 0.10 0.90  # Trim 10% each side
TDIGEST.TRIMMED_MEAN api:checkout:latency 0.25 0.75  # IQR mean (middle 50%)
```

## Python Example: Latency Dashboard

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_latency_stats(key: str) -> dict:
    """Compute multiple statistics for a latency T-Digest."""

    # Quantiles
    quantiles = r.execute_command("TDIGEST.QUANTILE", key, "0.5", "0.95", "0.99")

    # Trimmed means at different levels
    mean_all = r.execute_command("TDIGEST.TRIMMED_MEAN", key, "0.0", "1.0")
    mean_90pct = r.execute_command("TDIGEST.TRIMMED_MEAN", key, "0.05", "0.95")
    mean_iqr = r.execute_command("TDIGEST.TRIMMED_MEAN", key, "0.25", "0.75")

    return {
        "p50": float(quantiles[0]) if quantiles[0] else 0,
        "p95": float(quantiles[1]) if quantiles[1] else 0,
        "p99": float(quantiles[2]) if quantiles[2] else 0,
        "mean_all": float(mean_all) if mean_all else 0,
        "mean_trimmed_90": float(mean_90pct) if mean_90pct else 0,
        "mean_iqr": float(mean_iqr) if mean_iqr else 0,
    }

# Setup
r.execute_command("TDIGEST.CREATE", "api:latency", "COMPRESSION", 200)
latencies = [45, 52, 38, 61, 44, 55, 48, 67, 39, 71, 88, 92, 490, 1200, 2500]
r.execute_command("TDIGEST.ADD", "api:latency", *[str(v) for v in latencies])

stats = get_latency_stats("api:latency")
print(f"p50: {stats['p50']:.1f}ms")
print(f"p95: {stats['p95']:.1f}ms")
print(f"p99: {stats['p99']:.1f}ms")
print(f"Mean (all):        {stats['mean_all']:.1f}ms")
print(f"Mean (trimmed 90%): {stats['mean_trimmed_90']:.1f}ms")
print(f"IQR Mean:          {stats['mean_iqr']:.1f}ms")
```

## Common Trimming Strategies

| Cut Level | Fraction | Use Case |
|-----------|----------|----------|
| 5% each side | (0.05, 0.95) | Standard robust average |
| 10% each side | (0.10, 0.90) | Moderate outlier removal |
| IQR mean | (0.25, 0.75) | Only middle 50% - very robust |
| 1% each side | (0.01, 0.99) | Minimal trimming, removes only extremes |

## Trimmed Mean for A/B Testing

```bash
# Compare two service versions without outlier skew
TDIGEST.CREATE version_a COMPRESSION 200
TDIGEST.CREATE version_b COMPRESSION 200

TDIGEST.ADD version_a 45 52 38 61 44 55 48 67 500 1200
TDIGEST.ADD version_b 38 42 35 48 40 45 44 50 52 39

# Compare trimmed means (5% each end)
TDIGEST.TRIMMED_MEAN version_a 0.05 0.95
TDIGEST.TRIMMED_MEAN version_b 0.05 0.95
# Clean comparison without high outliers skewing results
```

## Error Cases

```bash
# low_cut_quantile greater than high_cut_quantile
TDIGEST.TRIMMED_MEAN latency 0.9 0.1
# (error) ERR invalid parameters

# Quantile out of range [0..1]
TDIGEST.TRIMMED_MEAN latency -0.1 0.9
# (error) ERR invalid parameters

# Empty T-Digest
TDIGEST.CREATE empty COMPRESSION 100
TDIGEST.TRIMMED_MEAN empty 0.1 0.9
# Returns: nan
```

## Summary

`TDIGEST.TRIMMED_MEAN` computes a robust average that excludes extreme values from both ends of the distribution. It is ideal for latency monitoring where occasional spikes would distort the mean, A/B test comparisons, and any scenario where outlier-resistant averages are needed. The trimming fractions are flexible - use (0.05, 0.95) as a sensible default that removes the most extreme 10% while preserving 90% of the data.
