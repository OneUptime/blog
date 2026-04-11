# How to Store Shopping Cart Data in Redis Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Shopping Cart, Session, E-Commerce, Backend

Description: Learn how to store, retrieve, and manage shopping cart data in Redis sessions for fast, scalable e-commerce applications.

---

## Why Use Redis for Shopping Carts

Shopping carts are read and written on virtually every page load. Storing them in a relational database adds latency and load. Redis provides sub-millisecond reads, atomic increment/decrement operations, and automatic expiry - making it a natural fit for transient cart data.

## Cart Storage Strategy

There are two common approaches: storing the cart as a Hash (field per SKU, value = quantity) or as a serialized JSON blob in a String. Hashes allow atomic field-level updates without deserializing the entire cart.

```bash
# Hash approach: field = product_id, value = quantity
HSET cart:user:42 sku:1001 2 sku:1002 1 sku:1005 3
EXPIRE cart:user:42 604800  # 7 days
```

## Implementing the Cart in Python

```python
import redis
import json

r = redis.Redis(decode_responses=True)
CART_TTL = 604800  # 7 days

def add_item(user_id: int, sku: str, quantity: int = 1):
    cart_key = f"cart:user:{user_id}"
    r.hincrby(cart_key, sku, quantity)
    r.expire(cart_key, CART_TTL)

def remove_item(user_id: int, sku: str):
    cart_key = f"cart:user:{user_id}"
    r.hdel(cart_key, sku)

def set_quantity(user_id: int, sku: str, quantity: int):
    cart_key = f"cart:user:{user_id}"
    if quantity <= 0:
        r.hdel(cart_key, sku)
    else:
        r.hset(cart_key, sku, quantity)
        r.expire(cart_key, CART_TTL)

def get_cart(user_id: int) -> dict:
    cart_key = f"cart:user:{user_id}"
    raw = r.hgetall(cart_key)
    return {sku: int(qty) for sku, qty in raw.items()}

def clear_cart(user_id: int):
    r.delete(f"cart:user:{user_id}")

def get_cart_count(user_id: int) -> int:
    cart_key = f"cart:user:{user_id}"
    quantities = r.hvals(cart_key)
    return sum(int(q) for q in quantities)
```

## Anonymous Cart with Session ID

For guests, use a session ID instead of user ID. On login, merge the anonymous cart into the user cart:

```python
def merge_carts(session_id: str, user_id: int):
    anon_key = f"cart:session:{session_id}"
    user_key = f"cart:user:{user_id}"
    anon_cart = r.hgetall(anon_key)

    if anon_cart:
        pipe = r.pipeline()
        for sku, qty in anon_cart.items():
            pipe.hincrby(user_key, sku, int(qty))
        pipe.expire(user_key, CART_TTL)
        pipe.delete(anon_key)
        pipe.execute()
```

## Storing Rich Cart Line Items

When you need to cache product details (name, price, image) alongside quantity to avoid re-fetching on every cart view, use a Hash with JSON values:

```python
def add_rich_item(user_id: int, sku: str, product_info: dict, quantity: int = 1):
    cart_key = f"cart:rich:{user_id}"
    existing = r.hget(cart_key, sku)
    if existing:
        item = json.loads(existing)
        item["quantity"] += quantity
    else:
        item = {**product_info, "quantity": quantity}
    r.hset(cart_key, sku, json.dumps(item))
    r.expire(cart_key, CART_TTL)

def get_rich_cart(user_id: int) -> list:
    cart_key = f"cart:rich:{user_id}"
    raw = r.hgetall(cart_key)
    return [json.loads(v) for v in raw.values()]
```

## REST API Example with FastAPI

```python
from fastapi import FastAPI, Cookie, HTTPException

app = FastAPI()

@app.post("/cart/add")
def add_to_cart(sku: str, quantity: int = 1, session_id: str = Cookie(None)):
    if not session_id:
        raise HTTPException(status_code=401)
    add_item(session_id, sku, quantity)
    return {"cart_count": get_cart_count(session_id)}

@app.get("/cart")
def view_cart(session_id: str = Cookie(None)):
    if not session_id:
        return {"items": {}}
    return {"items": get_cart(session_id)}

@app.delete("/cart/item/{sku}")
def remove_from_cart(sku: str, session_id: str = Cookie(None)):
    remove_item(session_id, sku)
    return {"removed": sku}
```

## Handling Checkout - Cart to Order

On checkout, atomically read the cart, validate inventory, and then clear it using a Lua script:

```lua
-- checkout_cart.lua
local cart_key = KEYS[1]
local items = redis.call("HGETALL", cart_key)
redis.call("DEL", cart_key)
return items
```

```python
checkout_script = r.register_script("""
local items = redis.call('HGETALL', KEYS[1])
redis.call('DEL', KEYS[1])
return items
""")

def checkout(user_id: int) -> dict:
    raw = checkout_script(keys=[f"cart:user:{user_id}"])
    # Convert flat list to dict: [k, v, k, v] -> {k: v}
    it = iter(raw)
    return {sku: int(qty) for sku, qty in zip(it, it)}
```

## Summary

Storing shopping carts as Redis Hashes enables atomic per-item updates, fast reads, and automatic TTL-based cleanup. Using `HINCRBY` for quantity adjustments avoids race conditions, and a Lua-based checkout script ensures the cart is read and cleared atomically. Merging anonymous session carts into user carts on login provides a seamless experience.
