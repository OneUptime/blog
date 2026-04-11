# How to Implement Coupon and Promo Code Validation with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Hash, Validation

Description: Implement fast, atomic coupon and promo code validation in Redis - store code metadata, enforce usage limits, prevent double redemption, and handle per-user restrictions.

---

Coupon validation needs to be fast (under 10ms) and atomic (no double redemption). Redis provides both with Hash-based code storage and Lua scripts for atomic check-and-increment operations.

## Data Model

```text
coupon:{code}                 -> Hash: discount, type, max_uses, used_count, expiry, active
coupon:used:{code}            -> Set of user IDs who have redeemed this code
coupon:user:{userId}          -> Set of codes this user has redeemed
```

## Storing a Coupon

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_coupon(code, discount, discount_type, max_uses, expiry_ts):
    """
    discount_type: 'percent' or 'fixed'
    expiry_ts: Unix timestamp when the coupon expires
    """
    r.hset(f"coupon:{code}", mapping={
        "code": code,
        "discount": str(discount),
        "type": discount_type,
        "max_uses": str(max_uses),
        "used_count": "0",
        "expiry": str(expiry_ts),
        "active": "1",
    })
```

## Atomic Validation and Redemption

Use a Lua script to atomically check validity and increment the usage counter:

```python
REDEEM_SCRIPT = """
local coupon = redis.call('HGETALL', KEYS[1])
if #coupon == 0 then return {err='NOT_FOUND'} end

local data = {}
for i = 1, #coupon, 2 do data[coupon[i]] = coupon[i+1] end

if data['active'] ~= '1' then return {err='INACTIVE'} end
if tonumber(data['expiry']) < tonumber(ARGV[1]) then return {err='EXPIRED'} end
if tonumber(data['used_count']) >= tonumber(data['max_uses']) then
    return {err='LIMIT_REACHED'}
end
if redis.call('SISMEMBER', KEYS[2], ARGV[2]) == 1 then
    return {err='ALREADY_USED'}
end

redis.call('HINCRBY', KEYS[1], 'used_count', 1)
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('SADD', KEYS[3], data['code'])
return {data['discount'], data['type']}
"""

redeem_fn = r.register_script(REDEEM_SCRIPT)

def redeem_coupon(code, user_id):
    now = str(int(time.time()))
    try:
        result = redeem_fn(
            keys=[f"coupon:{code}", f"coupon:used:{code}", f"coupon:user:{user_id}"],
            args=[now, user_id]
        )
        return {"discount": float(result[0]), "type": result[1]}
    except redis.exceptions.ResponseError as e:
        return {"error": str(e)}
```

## Checking Without Redeeming

```python
def validate_coupon(code, user_id=None):
    data = r.hgetall(f"coupon:{code}")
    if not data:
        return {"valid": False, "reason": "NOT_FOUND"}
    if data["active"] != "1":
        return {"valid": False, "reason": "INACTIVE"}
    if int(data["expiry"]) < int(time.time()):
        return {"valid": False, "reason": "EXPIRED"}
    if int(data["used_count"]) >= int(data["max_uses"]):
        return {"valid": False, "reason": "LIMIT_REACHED"}
    if user_id and r.sismember(f"coupon:used:{code}", user_id):
        return {"valid": False, "reason": "ALREADY_USED"}
    return {
        "valid": True,
        "discount": float(data["discount"]),
        "type": data["type"],
    }
```

## Deactivating a Coupon

```python
def deactivate_coupon(code):
    r.hset(f"coupon:{code}", "active", "0")

def get_coupon_stats(code):
    data = r.hgetall(f"coupon:{code}")
    if data:
        data["unique_users"] = r.scard(f"coupon:used:{code}")
    return data
```

## Example Usage

```bash
# Create a 20% off coupon valid for 100 uses
HSET coupon:SAVE20 code SAVE20 discount 20 type percent max_uses 100 used_count 0 expiry 1750000000 active 1

# Validate
HGETALL coupon:SAVE20

# After redemption
HINCRBY coupon:SAVE20 used_count 1
SADD coupon:used:SAVE20 user:alice
```

## Summary

Redis Hashes store coupon metadata efficiently while Lua scripts provide atomic check-and-redeem operations that prevent double redemption under concurrency. Per-user Sets enforce per-user redemption limits. This approach handles thousands of simultaneous coupon validations without database bottlenecks.
