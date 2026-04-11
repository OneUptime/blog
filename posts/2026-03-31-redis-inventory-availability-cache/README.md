# How to Build an Inventory Availability Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Inventory, Cache

Description: Build a fast inventory availability cache with Redis to serve stock checks at scale while keeping data consistent with your database.

---

Product availability checks happen on every product page, cart add, and checkout. Hitting a relational database for each one creates a bottleneck. Redis can cache inventory levels and serve thousands of requests per second while staying in sync with the source of truth.

## Storing Inventory Levels

Use a hash per SKU to store quantity and metadata, plus a global sorted set for low-stock monitoring:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def set_inventory(sku: str, quantity: int, warehouse: str = "main"):
    pipe = r.pipeline()
    pipe.hset(f"inventory:{sku}", mapping={
        "qty": quantity,
        "warehouse": warehouse,
        "updated_at": __import__('time').time()
    })
    # Sorted set for finding low-stock items quickly
    pipe.zadd("inventory:stock_levels", {sku: quantity})
    pipe.execute()
```

## Checking Availability

```python
def is_available(sku: str, requested_qty: int = 1) -> bool:
    qty = r.hget(f"inventory:{sku}", "qty")
    if qty is None:
        return False  # Cache miss - treat as unavailable or fetch from DB
    return int(qty) >= requested_qty

def get_inventory(sku: str) -> dict:
    data = r.hgetall(f"inventory:{sku}")
    return {
        "sku": sku,
        "available": int(data.get("qty", 0)) > 0,
        "quantity": int(data.get("qty", 0)),
        "warehouse": data.get("warehouse", "unknown")
    }
```

## Atomic Reservation

When a customer adds an item to their cart, reserve inventory atomically using a Lua script to prevent overselling:

```lua
-- reserve_inventory.lua
local key = KEYS[1]
local requested = tonumber(ARGV[1])
local current = tonumber(redis.call('HGET', key, 'qty'))

if current == nil or current < requested then
    return -1  -- not enough stock
end

local new_qty = current - requested
redis.call('HSET', key, 'qty', new_qty)
redis.call('ZADD', 'inventory:stock_levels', new_qty, ARGV[2])
return new_qty
```

```python
reserve_script = r.register_script(open('reserve_inventory.lua').read())

def reserve_inventory(sku: str, qty: int) -> int:
    """Returns new quantity, or -1 if insufficient stock."""
    result = reserve_script(
        keys=[f"inventory:{sku}"],
        args=[qty, sku]
    )
    return int(result)
```

## Releasing Reservations

If a cart expires or a customer removes an item, release the reservation:

```python
def release_reservation(sku: str, qty: int):
    pipe = r.pipeline()
    pipe.hincrby(f"inventory:{sku}", "qty", qty)
    result = pipe.execute()
    new_qty = result[0]
    # Update sorted set
    r.zadd("inventory:stock_levels", {sku: new_qty})
```

## Cache Warm-Up from Database

When the service starts, populate Redis from your database:

```python
def warm_inventory_cache(db_connection):
    cursor = db_connection.cursor()
    cursor.execute("SELECT sku, quantity, warehouse FROM inventory")

    pipe = r.pipeline(transaction=False)
    for row in cursor.fetchall():
        sku, qty, warehouse = row
        pipe.hset(f"inventory:{sku}", mapping={
            "qty": qty, "warehouse": warehouse
        })
        pipe.zadd("inventory:stock_levels", {sku: qty})
    pipe.execute()
```

## Low-Stock Alerts

```python
def get_low_stock_items(threshold: int = 10) -> list:
    # ZRANGEBYSCORE returns SKUs with qty between 1 and threshold
    return r.zrangebyscore("inventory:stock_levels", 1, threshold, withscores=True)
```

## Summary

Redis provides the speed and atomic operations needed for a reliable inventory cache. Lua scripts prevent overselling under concurrent load, while the sorted set gives you instant visibility into low-stock SKUs. Combine this cache with database writes to keep both systems in sync.
