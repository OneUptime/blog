# How to Design a Shopping Cart Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Shopping Cart, E-Commerce, Hash, Scalability

Description: Learn how to design a fast, scalable shopping cart using Redis hashes, TTL, and atomic operations for e-commerce applications.

---

## Why Redis for a Shopping Cart

A shopping cart needs sub-millisecond reads and writes since users interact with it on every page. It must handle concurrent updates, survive server restarts, and scale to millions of simultaneous carts. Redis hashes provide the perfect data structure: each cart maps item IDs to quantities, and all operations are atomic.

## Data Model

Model a cart as a Redis Hash where the key is the cart ID, fields are product IDs, and values are quantities:

```text
cart:{user_id}  ->  Hash
  product:101   ->  2
  product:205   ->  1
  product:309   ->  3
```

For guest users, use a session-based cart ID:

```text
cart:session:abc123  ->  Hash
  product:101        ->  1
```

## Basic Cart Operations

```bash
# Add item to cart (or update quantity)
HSET cart:user:42 product:101 2

# Increment quantity (handles concurrent updates atomically)
HINCRBY cart:user:42 product:101 1

# Remove item
HDEL cart:user:42 product:101

# Get entire cart
HGETALL cart:user:42

# Get specific item quantity
HGET cart:user:42 product:101

# Count distinct items
HLEN cart:user:42

# Set TTL for guest carts (expire after 7 days)
EXPIRE cart:session:abc123 604800
```

## Cart Service Implementation

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ShoppingCart:
    def __init__(self, cart_id):
        self.key = f'cart:{cart_id}'

    def add_item(self, product_id, quantity=1):
        if quantity <= 0:
            raise ValueError('Quantity must be positive')
        current = int(self.get_quantity(product_id) or 0)
        new_qty = current + quantity
        if new_qty > 99:
            raise ValueError('Maximum 99 per item')
        r.hset(self.key, product_id, new_qty)
        r.expire(self.key, 86400 * 30)  # 30-day TTL

    def remove_item(self, product_id):
        r.hdel(self.key, product_id)

    def update_quantity(self, product_id, quantity):
        if quantity <= 0:
            self.remove_item(product_id)
        else:
            r.hset(self.key, product_id, quantity)

    def get_quantity(self, product_id):
        return r.hget(self.key, product_id)

    def get_all(self):
        return r.hgetall(self.key)

    def clear(self):
        r.delete(self.key)

    def item_count(self):
        return r.hlen(self.key)
```

## Handling Concurrent Updates

Redis single-threaded command execution means `HINCRBY` is always atomic. However, for operations that depend on reading and writing multiple fields, use a Lua script or pipeline with WATCH:

```python
def safe_transfer_item(source_cart, dest_cart, product_id):
    """Atomically move an item between carts (e.g. wishlist to cart)."""
    script = """
    local qty = redis.call('HGET', KEYS[1], ARGV[1])
    if not qty then return 0 end
    redis.call('HDEL', KEYS[1], ARGV[1])
    redis.call('HINCRBY', KEYS[2], ARGV[1], qty)
    return 1
    """
    r.eval(script, 2, f'cart:{source_cart}', f'cart:{dest_cart}', product_id)
```

## Merging Guest and Authenticated Carts

When a guest logs in, merge their session cart with their user cart:

```python
def merge_carts(guest_cart_id, user_cart_id):
    guest_key = f'cart:session:{guest_cart_id}'
    user_key = f'cart:user:{user_cart_id}'
    guest_items = r.hgetall(guest_key)
    if not guest_items:
        return
    pipe = r.pipeline()
    for product_id, quantity in guest_items.items():
        pipe.hincrby(user_key, product_id, int(quantity))
    pipe.delete(guest_key)
    pipe.expire(user_key, 86400 * 30)
    pipe.execute()
```

## Price and Inventory Validation

The cart stores only product IDs and quantities - prices live in your product database. At checkout, validate all items:

```python
def validate_cart(cart_id):
    items = r.hgetall(f'cart:{cart_id}')
    errors = []
    for product_id, quantity in items.items():
        # Check inventory availability
        available = int(r.get(f'inventory:{product_id}') or 0)
        if int(quantity) > available:
            errors.append(f'{product_id}: only {available} in stock')
    return errors
```

## Cart Expiry and Abandonment Tracking

Use keyspace notifications to detect abandoned carts:

```bash
# Enable keyspace events for expired keys in redis.conf
notify-keyspace-events Ex
```

```python
sub = r.pubsub()
sub.psubscribe('__keyevent@0__:expired')
for event in sub.listen():
    if event['type'] == 'pmessage':
        key = event['data']
        if key.startswith('cart:'):
            # Trigger abandoned cart email
            cart_id = key.split(':', 1)[1]
            trigger_abandoned_cart_email(cart_id)
```

## Scaling the Cart Service

| Concern | Redis Approach |
|---|---|
| High read throughput | Read replicas for HGETALL |
| Cart isolation | Hash slots in Redis Cluster by user ID |
| Persistence | RDB snapshots for recovery |
| Large carts | HSCAN to iterate without blocking |

## Summary

A Redis hash-based shopping cart provides atomic operations for concurrent updates, sub-millisecond latency for user interactions, and simple TTL management for guest and session carts. The merge pattern handles the guest-to-authenticated transition, and Lua scripts ensure complex multi-step operations stay atomic. In a system design interview, highlight the simplicity of the hash model, the importance of TTLs to prevent unbounded memory growth, and how Redis Cluster shards carts by user ID for horizontal scale.
