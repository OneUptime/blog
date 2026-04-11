# How to Build a Flash Deal Countdown Timer with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, TTL, Flash Sale

Description: Implement flash deal countdown timers with Redis TTL and keyspace notifications - track deal expiry, compute time remaining, and trigger automatic deal end events.

---

Flash deals require precise countdown timers and automatic expiry. Redis TTL-based keys let you set exact deal durations while keyspace notifications fire events when deals expire.

## Data Model

```text
deal:{dealId}                -> Hash: product_id, discount, original_price, deal_price, stock
deal:active                  -> Sorted Set: dealId -> expiry timestamp
deal:ended:{dealId}          -> Marker key with TTL (for notification trigger)
```

## Creating a Flash Deal

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_flash_deal(deal_id, product_id, deal_price, original_price,
                      discount_percent, stock, duration_seconds):
    expiry = time.time() + duration_seconds

    pipe = r.pipeline()
    pipe.hset(f"deal:{deal_id}", mapping={
        "id": deal_id,
        "product_id": product_id,
        "deal_price": str(deal_price),
        "original_price": str(original_price),
        "discount": str(discount_percent),
        "stock": str(stock),
        "start": str(time.time()),
        "expiry": str(expiry),
        "active": "1",
    })
    # Index in active deals sorted by expiry
    pipe.zadd("deal:active", {deal_id: expiry})
    # Marker key for keyspace notification on expiry
    pipe.set(f"deal:ended:{deal_id}", deal_id, ex=duration_seconds)
    pipe.execute()
```

## Computing Time Remaining

```python
def get_time_remaining(deal_id):
    ttl = r.ttl(f"deal:ended:{deal_id}")
    return max(ttl, 0)

def get_deal_info(deal_id):
    data = r.hgetall(f"deal:{deal_id}")
    if data:
        data["seconds_remaining"] = get_time_remaining(deal_id)
        data["is_active"] = data.get("active") == "1" and get_time_remaining(deal_id) > 0
    return data
```

## Getting All Active Deals

```python
def get_active_deals():
    now = time.time()
    # Remove expired deals from the sorted set
    r.zremrangebyscore("deal:active", 0, now)
    deal_ids = r.zrangebyscore("deal:active", now, "+inf")

    pipe = r.pipeline()
    for did in deal_ids:
        pipe.hgetall(f"deal:{did}")
    deals = [d for d in pipe.execute() if d]
    for deal in deals:
        deal_id = deal.get("id")
        if deal_id:
            deal["seconds_remaining"] = get_time_remaining(deal_id)
    return deals
```

## Purchasing at Deal Price (Stock Decrement)

```python
def purchase_deal(deal_id, quantity=1):
    key = f"deal:{deal_id}"
    marker_key = f"deal:ended:{deal_id}"

    # Atomic check-and-decrement via Lua
    script = """
    local ttl = redis.call('TTL', KEYS[2])
    if ttl <= 0 then return -1 end
    local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
    if stock == nil or stock < tonumber(ARGV[1]) then return 0 end
    redis.call('HINCRBY', KEYS[1], 'stock', -tonumber(ARGV[1]))
    return 1
    """
    result = r.eval(script, 2, key, marker_key, quantity)
    if result == 1:
        return {"success": True}
    elif result == 0:
        return {"success": False, "reason": "insufficient_stock"}
    else:
        return {"success": False, "reason": "deal_expired"}
```

## Listening for Deal Expiry via Keyspace Notifications

Enable keyspace notifications in Redis config:

```bash
redis-cli CONFIG SET notify-keyspace-events "Ex"
```

Then subscribe to expiry events:

```python
def listen_for_deal_expiry():
    p = r.pubsub()
    p.psubscribe("__keyevent@0__:expired")
    for message in p.listen():
        if message["type"] == "pmessage":
            key = message["data"]
            if key.startswith("deal:ended:"):
                deal_id = key.replace("deal:ended:", "")
                handle_deal_expiry(deal_id)

def handle_deal_expiry(deal_id):
    r.zrem("deal:active", deal_id)
    r.hset(f"deal:{deal_id}", "active", "0")
    print(f"Flash deal {deal_id} has ended")
```

## Summary

Redis TTL handles deal expiry automatically without cron jobs. ZADD with expiry timestamps enables efficient queries for active deals, and keyspace notifications trigger cleanup logic when deals end. Lua scripts provide atomic stock decrement during purchases, preventing overselling at the moment deals expire.
