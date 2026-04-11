# How to Use TDIGEST.BYRANK in Redis for Value by Rank

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Rank, Percentile, Probabilistic Data Structure

Description: Learn how to use TDIGEST.BYRANK in Redis to retrieve the estimated value at a specific rank position within a T-Digest distribution.

---

## What Is TDIGEST.BYRANK?

`TDIGEST.BYRANK` returns the estimated value at a given rank within a T-Digest. The rank is a 0-based integer position, where rank 0 corresponds to the minimum value and rank N-1 corresponds to the maximum (where N is the total number of samples).

This is the inverse of `TDIGEST.RANK`: while RANK tells you where a value falls, BYRANK tells you what value is at a specific position.

## Syntax

```text
TDIGEST.BYRANK key rank [rank ...]
```

- `rank` - 0-based integer rank position(s) to query
- Returns the estimated value at each rank

## Basic Usage

```bash
TDIGEST.CREATE scores COMPRESSION 200
TDIGEST.ADD scores 10 20 30 40 50 60 70 80 90 100

# Get value at rank 0 (minimum)
TDIGEST.BYRANK scores 0
# Returns: "10"

# Get value at rank 4 (5th lowest, middle of 10 items)
TDIGEST.BYRANK scores 4
# Returns: approximately "50"

# Get value at rank 9 (maximum, last item)
TDIGEST.BYRANK scores 9
# Returns: "100"

# Query multiple ranks at once
TDIGEST.BYRANK scores 0 4 9
```

## BYRANK vs QUANTILE

These commands are related but have different interfaces:

```bash
TDIGEST.CREATE latency COMPRESSION 200
TDIGEST.ADD latency 10 20 30 40 50 60 70 80 90 100

# QUANTILE uses fractional 0.0-1.0 scale
TDIGEST.QUANTILE latency 0.5
# Returns: ~50 (median)

# BYRANK uses absolute 0-based position
# For 10 samples, rank 4 is also approximately the median
TDIGEST.BYRANK latency 4
# Returns: ~50

# They are equivalent:
# rank = round(quantile * (total_samples - 1))
# For quantile 0.5 and 10 samples: rank = round(0.5 * 9) = 4 or 5
```

## Leaderboard Example

Use BYRANK to find the score at a specific leaderboard position:

```bash
TDIGEST.CREATE game:scores COMPRESSION 500
# Add 10 player scores
TDIGEST.ADD game:scores 1200 3400 5600 7800 2300 4500 6700 8900 1100 9100

# What score is at rank 0 (lowest)?
TDIGEST.BYRANK game:scores 0

# What score is at rank 5 (middle of 10)?
TDIGEST.BYRANK game:scores 5

# What score is at rank 9 (highest)?
TDIGEST.BYRANK game:scores 9
```

## Python Example: Distribution Analysis

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def analyze_distribution(key: str, num_buckets: int = 10) -> list:
    """Get evenly spaced values across the distribution."""
    info = r.execute_command("TDIGEST.INFO", key)
    info_dict = dict(zip(info[::2], info[1::2]))
    total = int(float(info_dict.get("Observations", 0)))
    if total == 0:
        return []

    # Generate evenly spaced rank positions
    ranks = [int(i * (total - 1) / (num_buckets - 1)) for i in range(num_buckets)]

    values = r.execute_command("TDIGEST.BYRANK", key, *[str(r_) for r_ in ranks])

    result = []
    for rank, value in zip(ranks, values):
        percentile = rank / (total - 1) * 100 if total > 1 else 0
        result.append({
            "rank": rank,
            "percentile": f"p{percentile:.0f}",
            "value": float(value) if value else None
        })
    return result

# Setup
r.execute_command("TDIGEST.CREATE", "api:latency", "COMPRESSION", 200)
import random
samples = [random.expovariate(0.02) for _ in range(500)]
r.execute_command("TDIGEST.ADD", "api:latency", *[str(round(s, 2)) for s in samples])

# Get distribution shape
buckets = analyze_distribution("api:latency", 10)
for b in buckets:
    print(f"  {b['percentile']:>4}: {b['value']:.1f}ms (rank {b['rank']})")
```

## Handling Edge Cases

```bash
# Rank beyond total samples
TDIGEST.CREATE small COMPRESSION 100
TDIGEST.ADD small 10 20 30

# Rank 0 = min
TDIGEST.BYRANK small 0   # Returns: "10"

# Rank at last position (total-1)
TDIGEST.BYRANK small 2   # Returns: "30"

# Rank beyond range - returns +inf
TDIGEST.BYRANK small 10  # Returns: "inf"

# Rank -1 (negative) - returns -inf
TDIGEST.BYRANK small -1  # Returns: "-inf"
```

## Using BYRANK for Bucket Boundaries

```python
def get_histogram_boundaries(key: str, num_buckets: int) -> list:
    """Generate bucket boundaries for a histogram based on actual data distribution."""
    info = r.execute_command("TDIGEST.INFO", key)
    info_dict = dict(zip(info[::2], info[1::2]))
    total = int(float(info_dict.get("Observations", 0)))
    if total < num_buckets:
        return []

    # Ranks that split data into equal-frequency buckets
    ranks = [int(i * total / num_buckets) for i in range(1, num_buckets)]
    values = r.execute_command("TDIGEST.BYRANK", key, *[str(r_) for r_ in ranks])
    return [float(v) for v in values if v is not None]

boundaries = get_histogram_boundaries("api:latency", 5)
print(f"Equal-frequency bucket boundaries: {[f'{b:.1f}ms' for b in boundaries]}")
```

## Summary

`TDIGEST.BYRANK` retrieves the estimated value at a 0-based rank position within a Redis T-Digest. It is the inverse of `TDIGEST.RANK` and complements `TDIGEST.QUANTILE` by accepting absolute rank positions rather than fractional percentiles. Use it for leaderboard queries, building histograms with equal-frequency buckets, and distribution analysis. Out-of-range ranks return positive or negative infinity.
