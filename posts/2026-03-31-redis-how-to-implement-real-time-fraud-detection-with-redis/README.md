# How to Implement Real-Time Fraud Detection with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Fraud Detection, Security, Rate Limiting, Sliding Window

Description: Implement real-time fraud detection using Redis to track transaction velocity, detect unusual patterns, and block suspicious activity with microsecond latency.

---

## Overview

Real-time fraud detection must analyze transactions within milliseconds - slow decisions allow fraud to succeed. Redis provides the fast, atomic data structures needed for velocity checks, pattern matching, and behavioral anomaly detection across millions of users simultaneously.

## Transaction Velocity Checks

Velocity rules flag accounts making too many transactions in a short window:

```python
import json
import time
import hashlib
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Fraud rule thresholds
RULES = {
    "tx_per_minute":     {"limit": 5,   "window": 60},
    "tx_per_hour":       {"limit": 20,  "window": 3600},
    "amount_per_hour":   {"limit": 5000, "window": 3600},
    "unique_merchants":  {"limit": 10,  "window": 3600},
    "unique_countries":  {"limit": 3,   "window": 86400},
    "failed_attempts":   {"limit": 3,   "window": 900}
}

def check_velocity(user_id: str, rule_name: str) -> dict:
    """Check if user has exceeded a velocity rule."""
    rule = RULES[rule_name]
    window = rule["window"]
    limit = rule["limit"]

    key = f"fraud:velocity:{user_id}:{rule_name}"
    now = time.time()

    # Sliding window count
    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zcard(key)
    _, count = pipe.execute()

    return {
        "rule": rule_name,
        "count": count,
        "limit": limit,
        "exceeded": count >= limit
    }

def record_transaction_event(
    user_id: str,
    tx_id: str,
    amount: float,
    merchant_id: str,
    country: str,
    success: bool
):
    """Record a transaction for velocity tracking."""
    now = time.time()
    pipe = r.pipeline()

    # Add to per-user transaction window
    pipe.zadd(f"fraud:velocity:{user_id}:tx_per_minute", {tx_id: now})
    pipe.expire(f"fraud:velocity:{user_id}:tx_per_minute", 120)

    pipe.zadd(f"fraud:velocity:{user_id}:tx_per_hour", {tx_id: now})
    pipe.expire(f"fraud:velocity:{user_id}:tx_per_hour", 7200)

    # Amount velocity
    amount_id = f"{tx_id}:{amount}"
    pipe.zadd(f"fraud:velocity:{user_id}:amount_per_hour", {amount_id: now})
    pipe.expire(f"fraud:velocity:{user_id}:amount_per_hour", 7200)

    # Merchant diversity
    pipe.zadd(f"fraud:merchants:{user_id}", {merchant_id: now})
    pipe.expire(f"fraud:merchants:{user_id}", 7200)

    # Country diversity
    pipe.zadd(f"fraud:countries:{user_id}", {country: now})
    pipe.expire(f"fraud:countries:{user_id}", 86400 * 2)

    if not success:
        pipe.zadd(f"fraud:velocity:{user_id}:failed_attempts", {tx_id: now})
        pipe.expire(f"fraud:velocity:{user_id}:failed_attempts", 1800)

    pipe.execute()
```

## Fraud Score Calculation

```python
def calculate_fraud_score(
    user_id: str,
    amount: float,
    merchant_id: str,
    country: str
) -> dict:
    """Calculate a composite fraud risk score."""
    score = 0
    signals = []
    now = time.time()

    # Check transaction count in last minute
    tx_1min = r.zcount(
        f"fraud:velocity:{user_id}:tx_per_minute",
        now - 60, now
    )
    if tx_1min >= RULES["tx_per_minute"]["limit"]:
        score += 40
        signals.append(f"high_velocity_1min:{tx_1min}")

    # Check hourly transaction count
    tx_1hr = r.zcount(
        f"fraud:velocity:{user_id}:tx_per_hour",
        now - 3600, now
    )
    if tx_1hr >= RULES["tx_per_hour"]["limit"]:
        score += 20
        signals.append(f"high_velocity_1hr:{tx_1hr}")

    # Check merchant diversity (many different merchants)
    unique_merchants = r.zcount(
        f"fraud:merchants:{user_id}",
        now - 3600, now
    )
    if unique_merchants >= RULES["unique_merchants"]["limit"]:
        score += 25
        signals.append(f"many_merchants:{unique_merchants}")

    # Check country diversity (transactions from multiple countries)
    unique_countries = r.zcount(
        f"fraud:countries:{user_id}",
        now - 86400, now
    )
    if unique_countries >= RULES["unique_countries"]["limit"]:
        score += 35
        signals.append(f"multi_country:{unique_countries}")

    # Check failed attempts
    failed = r.zcount(
        f"fraud:velocity:{user_id}:failed_attempts",
        now - 900, now
    )
    if failed >= RULES["failed_attempts"]["limit"]:
        score += 30
        signals.append(f"failed_attempts:{failed}")

    # Large transaction amount check
    user_avg = get_user_average_amount(user_id)
    if user_avg and amount > user_avg * 5:
        score += 20
        signals.append(f"unusual_amount:{amount:.2f}")

    return {
        "user_id": user_id,
        "fraud_score": min(100, score),
        "risk_level": "high" if score >= 60 else ("medium" if score >= 30 else "low"),
        "signals": signals,
        "blocked": score >= 70
    }

def get_user_average_amount(user_id: str) -> float | None:
    """Get user's average transaction amount (stored as a running average)."""
    data = r.hgetall(f"fraud:user_profile:{user_id}")
    if not data or "avg_amount" not in data:
        return None
    return float(data["avg_amount"])

def update_user_profile(user_id: str, amount: float):
    """Update user's behavioral profile for anomaly detection."""
    profile_key = f"fraud:user_profile:{user_id}"
    profile = r.hgetall(profile_key)

    count = int(profile.get("tx_count", 0)) + 1
    old_avg = float(profile.get("avg_amount", amount))
    new_avg = old_avg + (amount - old_avg) / count  # Running average

    r.hset(profile_key, mapping={
        "tx_count": str(count),
        "avg_amount": str(round(new_avg, 2)),
        "last_tx_at": str(int(time.time()))
    })
```

## Block Lists and Allow Lists

```python
def block_user(user_id: str, reason: str, duration_seconds: int = None):
    """Block a user from transacting."""
    block_key = f"fraud:blocked:user:{user_id}"
    r.hset(block_key, mapping={
        "reason": reason,
        "blocked_at": str(int(time.time()))
    })
    if duration_seconds:
        r.expire(block_key, duration_seconds)

def is_user_blocked(user_id: str) -> bool:
    return bool(r.exists(f"fraud:blocked:user:{user_id}"))

def block_card(card_hash: str, reason: str):
    """Block a specific card."""
    r.set(f"fraud:blocked:card:{card_hash}", reason, ex=86400 * 30)

def is_card_blocked(card_number: str) -> bool:
    card_hash = hashlib.sha256(card_number.encode()).hexdigest()
    return bool(r.exists(f"fraud:blocked:card:{card_hash}"))
```

## Transaction Evaluation

```python
def evaluate_transaction(
    user_id: str,
    tx_id: str,
    amount: float,
    merchant_id: str,
    country: str,
    card_number: str
) -> dict:
    """Full fraud evaluation pipeline for a transaction."""
    # Check block lists first
    if is_user_blocked(user_id):
        return {"decision": "block", "reason": "user_blocked", "score": 100}

    if is_card_blocked(card_number):
        return {"decision": "block", "reason": "card_blocked", "score": 100}

    # Calculate fraud score
    result = calculate_fraud_score(user_id, amount, merchant_id, country)

    if result["blocked"]:
        block_user(user_id, f"auto_blocked:score={result['fraud_score']}", 3600)
        r.publish("fraud:alerts", json.dumps({**result, "tx_id": tx_id}))
        return {"decision": "block", **result}

    if result["risk_level"] == "medium":
        return {"decision": "review", **result}

    return {"decision": "allow", **result}
```

## Summary

Redis enables real-time fraud detection by maintaining per-user sliding window counters for transaction velocity, merchant diversity, and failed attempt tracking - all with O(log n) complexity. The composite fraud score aggregates multiple signals atomically before each transaction decision. Automatic TTL expiration keeps memory proportional to the analysis window size rather than total users, and sub-millisecond evaluation ensures fraud checks add negligible latency to the payment flow.
