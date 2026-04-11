# How to Implement Inventory Reservation with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Inventory, Transaction, E-Commerce

Description: Use Redis transactions and atomic counters to implement safe inventory reservation - prevent overselling, handle timeouts, and release held stock automatically.

---

Inventory reservation prevents overselling by temporarily holding stock during checkout. Redis provides atomic operations and TTL-based expiry to build a reliable reservation system.

## Data Model

```text
inventory:{skuId}:available   -> String: count of available units
inventory:{skuId}:reserved    -> String: count of reserved units
reservation:{reservationId}   -> Hash: sku, quantity, userId, orderId, expiry
reservations:{userId}         -> Set of active reservation IDs
```

## Reserving Stock

Use an optimistic locking pattern with WATCH/MULTI/EXEC to prevent race conditions:

```python
import redis
import uuid
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

RESERVATION_TTL = 900  # 15 minutes

def reserve_inventory(sku_id, quantity, user_id):
    avail_key = f"inventory:{sku_id}:available"
    res_key = f"inventory:{sku_id}:reserved"

    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(avail_key)
                available = int(pipe.get(avail_key) or 0)
                if available < quantity:
                    pipe.unwatch()
                    return None  # Insufficient stock

                reservation_id = str(uuid.uuid4())
                expiry = time.time() + RESERVATION_TTL

                pipe.multi()
                pipe.decrby(avail_key, quantity)
                pipe.incrby(res_key, quantity)
                pipe.hset(f"reservation:{reservation_id}", mapping={
                    "sku_id": sku_id,
                    "quantity": quantity,
                    "user_id": user_id,
                    "expiry": str(expiry),
                    "status": "reserved",
                })
                pipe.sadd(f"reservations:{user_id}", reservation_id)
                pipe.execute()
                return reservation_id
            except redis.WatchError:
                continue  # Retry on concurrent modification
```

## Confirming a Reservation (on Order Completion)

```python
def confirm_reservation(reservation_id):
    res = r.hgetall(f"reservation:{reservation_id}")
    if not res or res.get("status") != "reserved":
        return False

    sku_id = res["sku_id"]
    quantity = int(res["quantity"])

    pipe = r.pipeline()
    pipe.decrby(f"inventory:{sku_id}:reserved", quantity)
    pipe.hset(f"reservation:{reservation_id}", "status", "confirmed")
    pipe.execute()
    return True
```

## Releasing a Reservation (on Cancellation or Timeout)

```python
def release_reservation(reservation_id):
    res = r.hgetall(f"reservation:{reservation_id}")
    if not res or res.get("status") == "confirmed":
        return False

    sku_id = res["sku_id"]
    quantity = int(res["quantity"])
    user_id = res["user_id"]

    pipe = r.pipeline()
    pipe.incrby(f"inventory:{sku_id}:available", quantity)
    pipe.decrby(f"inventory:{sku_id}:reserved", quantity)
    pipe.delete(f"reservation:{reservation_id}")
    pipe.srem(f"reservations:{user_id}", reservation_id)
    pipe.execute()
    return True
```

## Checking Availability

```python
def get_available_stock(sku_id):
    count = r.get(f"inventory:{sku_id}:available")
    return int(count) if count else 0

def initialize_inventory(sku_id, quantity):
    pipe = r.pipeline()
    pipe.set(f"inventory:{sku_id}:available", quantity)
    pipe.set(f"inventory:{sku_id}:reserved", 0)
    pipe.execute()
```

## Example Usage

```bash
# Initialize stock
SET inventory:sku:ABC:available 100
SET inventory:sku:ABC:reserved 0

# Check availability
GET inventory:sku:ABC:available   # 100

# After reservation of 5 units
GET inventory:sku:ABC:available   # 95
GET inventory:sku:ABC:reserved    # 5
```

## Summary

Redis WATCH/MULTI/EXEC provides optimistic locking for safe inventory reservation without distributed locks. Each reservation stores an expiry timestamp that a periodic cleanup process can check to identify and release uncompleted reservations, preventing stock from being held indefinitely. This pattern is suitable for checkout flows where users have a time window to complete payment.
