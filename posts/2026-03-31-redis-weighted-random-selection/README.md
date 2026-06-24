# How to Implement a Weighted Random Selection in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Random, Sorted Set

Description: Use Redis sorted sets and Lua scripts to implement weighted random selection for A/B testing, feature flags, and traffic routing.

---

Weighted random selection picks an item with a probability proportional to its weight. It powers A/B test traffic splits, feature rollouts, ad serving, and load balancing. Redis sorted sets make this efficient and distributed.

## The Prefix Sum Approach

Store cumulative weights as sorted set scores. To pick, generate a random number between 0 and total weight, then find the first member whose score exceeds it:

```python
import redis
import random

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def build_weighted_set(key: str, weights: dict[str, float]):
    """
    weights: {"variant_a": 70, "variant_b": 20, "variant_c": 10}
    """
    r.delete(key)
    cumulative = 0.0
    pipe = r.pipeline()
    for member, weight in weights.items():
        cumulative += weight
        pipe.zadd(key, {member: cumulative})
    pipe.execute()
    return cumulative  # total weight

def weighted_random_pick(key: str) -> str | None:
    """Pick a random member proportional to its weight."""
    # Get the maximum score (total weight)
    top = r.zrevrange(key, 0, 0, withscores=True)
    if not top:
        return None
    total_weight = top[0][1]

    # Pick a random point in [0, total_weight]
    rand_score = random.uniform(0, total_weight)

    # Find first member with score >= rand_score
    result = r.zrangebyscore(key, rand_score, "+inf", start=0, num=1)
    return result[0] if result else None
```

## A/B Test Traffic Routing

```python
def setup_ab_test(test_name: str, variants: dict[str, float]):
    """
    variants: {"control": 50, "treatment_a": 30, "treatment_b": 20}
    """
    key = f"abtest:{test_name}"
    build_weighted_set(key, variants)
    # Store metadata
    r.hset(f"abtest:{test_name}:meta", mapping={
        "total_variants": len(variants),
        "created_at": __import__("time").time()
    })

def assign_user_to_variant(test_name: str, user_id: str) -> str:
    # Use a sticky assignment - same user always gets same variant
    assignment_key = f"abtest:{test_name}:assign:{user_id}"
    cached = r.get(assignment_key)
    if cached:
        return cached

    variant = weighted_random_pick(f"abtest:{test_name}")
    # Cache assignment for 30 days
    r.setex(assignment_key, 30 * 86400, variant)
    # Track variant counts
    r.incr(f"abtest:{test_name}:counts:{variant}")
    return variant
```

## Feature Flag Rollout

Roll out a feature to a percentage of users:

```python
def setup_feature_flag(feature: str, rollout_percent: int):
    """rollout_percent: 0-100"""
    key = f"flag:{feature}"
    build_weighted_set(key, {
        "enabled": rollout_percent,
        "disabled": 100 - rollout_percent
    })

def is_feature_enabled(feature: str, user_id: str) -> bool:
    # Deterministic per-user assignment
    assignment_key = f"flag:{feature}:user:{user_id}"
    cached = r.get(assignment_key)
    if cached is not None:
        return cached == "enabled"

    result = weighted_random_pick(f"flag:{feature}")
    r.setex(assignment_key, 86400, result)
    return result == "enabled"
```

## Dynamic Weight Updates

```python
def update_weight(key: str, member: str, new_weight_delta: float):
    """Increase or decrease a member's relative weight."""
    # Rebuild the whole set with updated weights
    all_members = r.zrange(key, 0, -1, withscores=True)
    # Adjust weights and rebuild (simplest approach for small sets)
    weights = {}
    prev_score = 0.0
    for m, cumulative_score in all_members:
        weight = cumulative_score - prev_score
        weights[m] = weight
        prev_score = cumulative_score
    if member in weights:
        weights[member] = max(0, weights[member] + new_weight_delta)
    build_weighted_set(key, weights)
```

## Querying Variant Distribution

```python
def get_variant_counts(test_name: str) -> dict:
    variants = r.zrange(f"abtest:{test_name}", 0, -1)
    result = {}
    for v in variants:
        count = int(r.get(f"abtest:{test_name}:counts:{v}") or 0)
        result[v] = count
    return result
```

## Summary

Redis sorted sets with cumulative scores implement weighted random selection in O(log N) time per pick. Combining this with per-user sticky assignments gives you consistent A/B test experiences and deterministic feature flag rollouts across your entire distributed fleet without any coordination overhead.
