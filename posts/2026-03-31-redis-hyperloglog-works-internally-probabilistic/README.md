# How Redis HyperLogLog Works Internally (Probabilistic Counting)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, Probabilistic, Cardinality, Internal

Description: Learn how Redis HyperLogLog uses probabilistic counting to estimate set cardinality using only 12KB of memory, with at most 0.81% standard error.

---

Redis HyperLogLog (HLL) is a probabilistic data structure that estimates the number of unique elements in a set using a fixed 12KB of memory - regardless of how many billions of items you add. The tradeoff: results have a standard error of about 0.81%.

## The Core Idea: Counting Leading Zeros

HyperLogLog works by hashing each element and observing the position of the leftmost 1 bit in the hash. Intuitively, if you see a hash starting with 10 zero bits, you've probably seen at least 2^10 = 1024 unique elements.

Redis splits elements into 16,384 registers (2^14 = 16384). Each register tracks the maximum number of leading zeros seen for elements assigned to it. The cardinality estimate is a harmonic mean across all registers.

## Fixed 12KB Memory

```bash
PFADD visitors user1 user2 user3
MEMORY USAGE visitors
# Returns: ~12304 bytes (12 KB) for a dense HLL
```

A sparse representation is used initially and switches to the dense 12KB structure when the cardinality grows large enough.

```bash
# Sparse HLL for few elements
PFADD tiny_set a b c
OBJECT ENCODING tiny_set
# Returns: "raw" (HLL is always stored as a string)

# Check the internal header
GETRANGE tiny_set 0 3
# First 4 bytes: "HYLL" magic header
```

## Basic Usage

```bash
# Add elements
PFADD page_views "user:1001" "user:1002" "user:1003"
PFADD page_views "user:1001"   # Duplicate - not counted again

# Get cardinality estimate
PFCOUNT page_views
# Returns approximate count with ~0.81% standard error

# Merge multiple HLLs
PFADD mobile_views "user:2001" "user:2002"
PFMERGE all_views page_views mobile_views
PFCOUNT all_views
```

## Practical Example: Unique Visitor Tracking

```python
import redis
from datetime import date

r = redis.Redis()

def track_visit(user_id, page):
    today = date.today().isoformat()
    key = f"uvcount:{page}:{today}"
    r.pfadd(key, user_id)
    r.expire(key, 86400 * 7)  # Keep 7 days

def get_daily_unique_visitors(page, day):
    key = f"uvcount:{page}:{day}"
    return r.pfcount(key)

# Track visits
track_visit("user_123", "/home")
track_visit("user_456", "/home")
track_visit("user_123", "/home")  # Same user, won't double count

print("Unique visitors:", get_daily_unique_visitors("/home", date.today().isoformat()))
```

## Memory vs Accuracy Comparison

| Structure | 1M unique items | Error rate |
|-----------|----------------|------------|
| HyperLogLog | 12 KB | ~0.81% |
| Set (string members) | ~64 MB | 0% |
| Bitmap (1M user IDs) | 125 KB | 0% |

## PFMERGE for Cross-Dimension Counting

```bash
# Daily HLLs
PFADD uv:2024-01-15 u1 u2 u3 u4
PFADD uv:2024-01-16 u2 u3 u5 u6

# Weekly unique visitors (merged, still 12KB)
PFMERGE uv:week:2024-03 uv:2024-01-15 uv:2024-01-16
PFCOUNT uv:week:2024-03
# Returns: ~6 (4 + 4 - 2 shared = 6 unique)
```

## Error Rate in Practice

```python
import redis, random

r = redis.Redis()
r.delete("hll_test")

actual = set()
for i in range(100000):
    val = f"item_{random.randint(1, 200000)}"
    actual.add(val)
    r.pfadd("hll_test", val)

estimate = r.pfcount("hll_test")
error = abs(estimate - len(actual)) / len(actual) * 100
print(f"Actual: {len(actual)}, Estimate: {estimate}, Error: {error:.2f}%")
```

## Summary

Redis HyperLogLog provides approximate set cardinality counting using at most 12KB of memory, regardless of the number of unique elements added. It uses 16,384 registers and a probabilistic algorithm with ~0.81% standard error. It is ideal for tracking unique visitors, distinct events, or any high-cardinality counting workload where a small error margin is acceptable.
