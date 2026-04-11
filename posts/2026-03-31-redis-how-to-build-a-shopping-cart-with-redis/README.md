# How to Build a Shopping Cart with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Shopping Cart, E-Commerce, Hash, Backend

Description: Learn how to build a full-featured shopping cart with Redis Hashes supporting add, remove, quantity update, and cart total calculation.

---

## Shopping Cart Design

A Redis Hash maps SKU (product ID) to quantity for each cart. This allows O(1) per-item operations with a single key per cart. For richer data like product names and prices, a JSON-encoded Hash field per SKU works well.

## Basic Cart Operations

```bash
# Add 2 units of product 1001
HSET cart:user:42 "1001" 2

# Increment quantity by 1
HINCRBY cart:user:42 "1001" 1

# Remove item from cart
HDEL cart:user:42 "1001"

# Get entire cart
HGETALL cart:user:42

# Count unique items
HLEN cart:user:42

# Set TTL
EXPIRE cart:user:42 604800
```

## Python Cart Implementation

```python
from redis import Redis
import time

r = Redis(decode_responses=True)
CART_TTL = 604800  # 7 days

def add_to_cart(cart_id: str, sku: str, quantity: int = 1):
    key = f"cart:{cart_id}"
    r.hincrby(key, sku, quantity)
    r.expire(key, CART_TTL)

def remove_from_cart(cart_id: str, sku: str):
    r.hdel(f"cart:{cart_id}", sku)

def set_quantity(cart_id: str, sku: str, quantity: int):
    key = f"cart:{cart_id}"
    if quantity <= 0:
        r.hdel(key, sku)
    else:
        r.hset(key, sku, quantity)
        r.expire(key, CART_TTL)

def get_cart(cart_id: str) -> dict:
    raw = r.hgetall(f"cart:{cart_id}")
    return {sku: int(qty) for sku, qty in raw.items()}

def clear_cart(cart_id: str):
    r.delete(f"cart:{cart_id}")

def cart_item_count(cart_id: str) -> int:
    quantities = r.hvals(f"cart:{cart_id}")
    return sum(int(q) for q in quantities)
```

## Rich Cart with Product Details

Cache product details alongside quantity to avoid DB lookups on every page load:

```python
PRICE_CACHE_TTL = 300  # 5 minutes

def get_product_price(sku: str) -> float:
    cached = r.get(f"price:{sku}")
    if cached:
        return float(cached)
    # Fetch from DB (stub)
    price = fetch_price_from_db(sku)
    r.set(f"price:{sku}", price, ex=PRICE_CACHE_TTL)
    return price

def get_cart_with_totals(cart_id: str) -> dict:
    cart = get_cart(cart_id)
    items = []
    subtotal = 0.0

    for sku, qty in cart.items():
        price = get_product_price(sku)
        line_total = price * qty
        subtotal += line_total
        items.append({
            "sku": sku,
            "quantity": qty,
            "unit_price": price,
            "line_total": round(line_total, 2)
        })

    return {
        "items": items,
        "item_count": len(items),
        "quantity_count": sum(i["quantity"] for i in items),
        "subtotal": round(subtotal, 2)
    }
```

## Coupon and Discount Storage

```python
def apply_coupon(cart_id: str, coupon_code: str, discount_pct: float):
    r.hset(f"cart:meta:{cart_id}", mapping={
        "coupon_code": coupon_code,
        "discount_pct": discount_pct,
        "applied_at": int(time.time())
    })
    r.expire(f"cart:meta:{cart_id}", CART_TTL)

def get_cart_with_discount(cart_id: str) -> dict:
    cart_data = get_cart_with_totals(cart_id)
    meta = r.hgetall(f"cart:meta:{cart_id}")

    if meta and "discount_pct" in meta:
        discount_pct = float(meta["discount_pct"])
        discount_amount = cart_data["subtotal"] * (discount_pct / 100)
        cart_data["coupon_code"] = meta["coupon_code"]
        cart_data["discount_pct"] = discount_pct
        cart_data["discount_amount"] = round(discount_amount, 2)
        cart_data["total"] = round(cart_data["subtotal"] - discount_amount, 2)
    else:
        cart_data["total"] = cart_data["subtotal"]

    return cart_data
```

## Merging Guest Cart on Login

```python
def merge_carts(guest_cart_id: str, user_cart_id: str):
    guest_items = get_cart(guest_cart_id)
    if guest_items:
        pipe = r.pipeline()
        for sku, qty in guest_items.items():
            pipe.hincrby(f"cart:{user_cart_id}", sku, qty)
        pipe.expire(f"cart:{user_cart_id}", CART_TTL)
        pipe.delete(f"cart:{guest_cart_id}")
        pipe.execute()
```

## Checkout - Atomically Read and Clear

```python
checkout_script = r.register_script("""
local items = redis.call('HGETALL', KEYS[1])
redis.call('DEL', KEYS[1])
return items
""")

def checkout(cart_id: str) -> dict:
    raw = checkout_script(keys=[f"cart:{cart_id}"])
    it = iter(raw)
    return {sku: int(qty) for sku, qty in zip(it, it)}
```

## Summary

Redis Hashes provide an ideal shopping cart structure: O(1) per-item operations, atomic quantity increments with HINCRBY, and simple total calculation. Storing product prices in a short-TTL cache eliminates database calls during cart rendering. An atomic Lua-based checkout script ensures the cart is read and cleared without race conditions.
