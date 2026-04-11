# How to Use CMS.INITBYPROB in Redis for Probability-Based CMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Count-Min Sketch, Probabilistic Data Structure

Description: Learn how to use CMS.INITBYPROB in Redis to create a Count-Min Sketch by specifying error rate and confidence probability instead of raw dimensions.

---

`CMS.INITBYPROB` creates a Count-Min Sketch (CMS) in Redis by specifying the desired accuracy in probabilistic terms rather than raw width and depth parameters. You define the acceptable error rate and the probability of exceeding that error, and Redis automatically calculates the optimal sketch dimensions. This is more intuitive than `CMS.INITBYDIM` when you're working from statistical requirements.

## Basic Syntax

```text
CMS.INITBYPROB key error probability
```

- `error` - Maximum overcount as a fraction of total stream count (e.g., `0.001` = 0.1%)
- `probability` - Desired probability for inflated count, i.e., the chance of exceeding the error bound (e.g., `0.001` = 0.1% chance of error). Lower values mean higher confidence.

## Creating a Count-Min Sketch by Probability

```bash
# Error rate: 0.1%, Probability of exceeding error: 0.1%
127.0.0.1:6379> CMS.INITBYPROB pageviews 0.001 0.001
OK

# Check dimensions that were auto-computed
127.0.0.1:6379> CMS.INFO pageviews
1) width
2) (integer) 2000
3) depth
4) (integer) 10
5) count
6) (integer) 0
```

Redis computed width=2000 and depth=10 from the error/probability parameters.

## How the Math Works

- `width = ceil(2 / error)`
- `depth = ceil(log2(1 / probability))` where probability is the failure probability

```python
import math

def cms_dimensions(error: float, probability: float) -> tuple:
    width = math.ceil(2 / error)
    depth = math.ceil(math.log2(1 / probability))
    return width, depth

# Example: 0.1% error, 0.1% failure probability
w, d = cms_dimensions(0.001, 0.001)
print(f"width={w}, depth={d}")  # width=2000, depth=10
```

## Python Example: Creating Sketches for Different Use Cases

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def create_cms_by_prob(key: str, error: float, probability: float) -> None:
    """Create a CMS sketch with the given accuracy requirements."""
    try:
        r.execute_command("CMS.INITBYPROB", key, error, probability)
        info = r.execute_command("CMS.INFO", key)
        info_dict = {info[i]: info[i + 1] for i in range(0, len(info), 2)}
        print(f"Created '{key}': width={info_dict['width']}, "
              f"depth={info_dict['depth']}")
    except redis.ResponseError as e:
        print(f"Error: {e}")

# High accuracy for fraud detection (0.01% error, 0.01% failure probability)
create_cms_by_prob("fraud:events", error=0.0001, probability=0.0001)

# Moderate accuracy for trending topics (1% error, 5% failure probability)
create_cms_by_prob("trending:hashtags", error=0.01, probability=0.05)

# Light sketch for quick analytics (5% error, 10% failure probability)
create_cms_by_prob("quick:stats", error=0.05, probability=0.10)
```

## CMS.INITBYPROB vs CMS.INITBYDIM

| Approach | Command | When to Use |
|---|---|---|
| Probabilistic spec | `CMS.INITBYPROB` | You have accuracy requirements in statistical terms |
| Explicit dimensions | `CMS.INITBYDIM` | You know the exact width/depth you want |

```bash
# These two are roughly equivalent:
# By probability (0.1% error, 0.1% failure probability)
127.0.0.1:6379> CMS.INITBYPROB my:sketch 0.001 0.001

# By explicit dimensions
127.0.0.1:6379> CMS.INITBYDIM my:sketch 2000 10
```

## Tracking Item Frequencies After Creation

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Create sketch with 0.1% error and 1% failure probability
r.execute_command("CMS.INITBYPROB", "api:calls", 0.001, 0.01)

# Record API endpoint hits
endpoints = ["/api/users", "/api/products", "/api/users", "/api/orders", "/api/users"]
for endpoint in endpoints:
    r.execute_command("CMS.INCRBY", "api:calls", endpoint, 1)

# Query frequencies
for ep in set(endpoints):
    freq = r.execute_command("CMS.QUERY", "api:calls", ep)
    print(f"{ep}: ~{freq[0]} calls")
```

## Summary

`CMS.INITBYPROB` lets you create a Count-Min Sketch by specifying statistical accuracy requirements directly. Instead of choosing width and depth manually, you provide an error rate and a failure probability, and Redis computes the optimal structure. This approach bridges the gap between statistical design and Redis configuration, making it easier to provision sketches that meet concrete accuracy goals.
