# How to Use TDIGEST.RANK in Redis for Rank Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Rank Estimation, Probabilistic Data Structure

Description: Learn how to use TDIGEST.RANK in Redis to estimate the rank (position) of a value within the observed distribution of a T-Digest.

---

## What Is TDIGEST.RANK?

`TDIGEST.RANK` returns the estimated rank of one or more values within a T-Digest. The rank is the number of elements in the sketch that are smaller than the queried value. This is similar to `TDIGEST.CDF` but returns an absolute count instead of a fraction.

If your T-Digest contains 1,000 samples and a value has rank 950, it means approximately 950 of those samples are below that value.

## Syntax

```text
TDIGEST.RANK key value [value ...]
```

Returns an integer for each input value representing its estimated rank within the observed data.

## Basic Usage

```bash
TDIGEST.CREATE scores COMPRESSION 200
TDIGEST.ADD scores 10 20 30 40 50 60 70 80 90 100

# What is the rank of 50?
TDIGEST.RANK scores 50
# Returns: (integer) 4 - approximately 4 values are < 50

# Query multiple values
TDIGEST.RANK scores 25 50 75
# 1) (integer) 2   - ~2 values < 25
# 2) (integer) 4   - ~4 values < 50
# 3) (integer) 7   - ~7 values < 75
```

## CDF vs RANK

| Command | Returns | Example |
|---------|---------|---------|
| TDIGEST.CDF | Fraction (0.0 to 1.0) | 0.95 |
| TDIGEST.RANK | Absolute count | 950 |

```bash
# These are approximately equivalent for a 1000-sample digest:
TDIGEST.CDF latency 200    # -> 0.95 (95%)
TDIGEST.RANK latency 200   # -> 950  (950 out of 1000)
```

## Leaderboard Position Example

Use TDIGEST.RANK to estimate a user's position in a large dataset:

```bash
TDIGEST.CREATE game:scores COMPRESSION 500
# Add 10,000 player scores
TDIGEST.ADD game:scores 1500 2100 3400 5000 7200 4500 2800 6100 3900 1800
# ... (many more scores added)

# Where does a score of 5500 rank?
TDIGEST.RANK game:scores 5500
# Returns: (integer) 8200
# About 8,200 players scored < 5500 out of all players
```

## Python Example: User Score Ranking

```python
import redis
import random

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Create a score distribution
r.execute_command("TDIGEST.CREATE", "game:leaderboard", "COMPRESSION", 500)

# Simulate 1000 player scores (normal distribution around 5000)
scores = [max(100, int(random.normalvariate(5000, 1500))) for _ in range(1000)]
chunk_size = 100
for i in range(0, len(scores), chunk_size):
    r.execute_command("TDIGEST.ADD", "game:leaderboard", *[str(s) for s in scores[i:i+chunk_size]])

def get_player_rank(score: int) -> dict:
    rank = r.execute_command("TDIGEST.RANK", "game:leaderboard", str(score))
    total = len(scores)
    percentile = (rank[0] / total) * 100
    return {
        "score": score,
        "rank": rank[0],
        "total": total,
        "percentile": f"top {100 - percentile:.1f}%"
    }

# Check where a specific score falls
print(get_player_rank(7000))
# {'score': 7000, 'rank': 920, 'total': 1000, 'percentile': 'top 8.0%'}
```

## Rank for Out-of-Range Values

If the queried value is below all elements in the digest, TDIGEST.RANK returns 0:

```bash
TDIGEST.ADD scores 50 60 70 80 90

# Value below all samples
TDIGEST.RANK scores 10
# Returns: (integer) 0

# Value above all samples
TDIGEST.RANK scores 100
# Returns: (integer) 5 (all elements are < 100)
```

## Comparing Multiple Values for Relative Ordering

```bash
TDIGEST.CREATE api:latency COMPRESSION 200
TDIGEST.ADD api:latency 12 18 23 45 67 88 110 250 340 490 1200 980

# Compare two latency values to see which is more common
TDIGEST.RANK api:latency 100 200
# 1) (integer) 6   - 6 samples < 100ms
# 2) (integer) 7   - 7 samples < 200ms
# So 1 sample is between 100ms and 200ms
```

## Combining RANK with TDIGEST.INFO

Get total count from INFO and combine with RANK to compute percentile:

```bash
TDIGEST.INFO api:latency
# Use "Merged weight" + "Unmerged weight" for total samples

TDIGEST.RANK api:latency 200
# rank / merged_weight = CDF value
```

```python
def get_percentile_for_value(key: str, value: float) -> float:
    info = r.execute_command("TDIGEST.INFO", key)
    info_dict = dict(zip(info[::2], info[1::2]))
    total = float(info_dict.get("Merged weight", 0)) + float(info_dict.get("Unmerged weight", 0))
    if total == 0:
        return 0.0
    rank = r.execute_command("TDIGEST.RANK", key, str(value))
    return (rank[0] / total) * 100

pct = get_percentile_for_value("api:latency", 200)
print(f"200ms is at the {pct:.1f}th percentile")
```

## Summary

`TDIGEST.RANK` returns the estimated count of values below a queried value in a Redis T-Digest, providing an absolute rank rather than a fraction. It is useful for leaderboard position estimation, comparing relative positions of multiple values, and computing custom percentile metrics. For fractional percentile queries, use `TDIGEST.CDF` instead.
