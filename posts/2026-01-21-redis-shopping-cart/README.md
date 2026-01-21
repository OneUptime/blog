# How to Build a Shopping Cart with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-commerce, Shopping Cart, Session Management, Python, Node.js

Description: A comprehensive guide to building a fast and scalable shopping cart system with Redis, covering session management, cart operations, inventory checks, and production best practices.

---

A shopping cart is one of the most critical components of any e-commerce platform. It needs to be fast, reliable, and capable of handling high concurrent traffic - especially during sales events. Redis is an excellent choice for implementing shopping carts due to its speed, data structure flexibility, and built-in expiration features.

In this guide, we will build a complete shopping cart system using Redis, covering cart operations, session management, inventory integration, and production considerations.

## Why Redis for Shopping Carts?

Redis offers several advantages for shopping cart implementations:

- **Speed**: Sub-millisecond operations ensure a responsive user experience
- **Data Structures**: Hashes are perfect for storing cart items with quantities
- **TTL Support**: Automatic expiration for abandoned carts
- **Atomic Operations**: HINCRBY prevents race conditions when updating quantities
- **Persistence**: RDB/AOF ensures cart data survives restarts
- **Scalability**: Redis Cluster supports horizontal scaling

## Basic Cart Data Model

We will use Redis hashes to store cart data, where each field represents a product and the value is the quantity:

```
cart:{user_id} -> Hash
    product_123 -> 2
    product_456 -> 1
    product_789 -> 3
```

## Implementing the Shopping Cart in Python

### Basic Cart Operations

```python
import redis
import json
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Cart expiration time (7 days in seconds)
CART_TTL = 7 * 24 * 60 * 60

@dataclass
class CartItem:
    product_id: str
    name: str
    price: float
    quantity: int
    image_url: str = ""

class ShoppingCart:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cart_key = f"cart:{user_id}"
        self.cart_meta_key = f"cart:meta:{user_id}"

    def add_item(self, product_id: str, quantity: int = 1,
                 product_info: dict = None) -> int:
        """Add an item to the cart or increment its quantity."""
        pipe = r.pipeline()

        # Increment quantity
        pipe.hincrby(self.cart_key, product_id, quantity)

        # Store product metadata if provided
        if product_info:
            pipe.hset(
                self.cart_meta_key,
                product_id,
                json.dumps(product_info)
            )

        # Reset TTL
        pipe.expire(self.cart_key, CART_TTL)
        pipe.expire(self.cart_meta_key, CART_TTL)

        results = pipe.execute()
        return results[0]  # New quantity

    def remove_item(self, product_id: str) -> bool:
        """Remove an item completely from the cart."""
        pipe = r.pipeline()
        pipe.hdel(self.cart_key, product_id)
        pipe.hdel(self.cart_meta_key, product_id)
        results = pipe.execute()
        return results[0] > 0

    def update_quantity(self, product_id: str, quantity: int) -> bool:
        """Set the exact quantity for an item."""
        if quantity <= 0:
            return self.remove_item(product_id)

        r.hset(self.cart_key, product_id, quantity)
        r.expire(self.cart_key, CART_TTL)
        return True

    def decrement_item(self, product_id: str, amount: int = 1) -> int:
        """Decrease item quantity, remove if it reaches zero."""
        new_qty = r.hincrby(self.cart_key, product_id, -amount)

        if new_qty <= 0:
            self.remove_item(product_id)
            return 0

        return new_qty

    def get_item(self, product_id: str) -> Optional[CartItem]:
        """Get a single item from the cart."""
        pipe = r.pipeline()
        pipe.hget(self.cart_key, product_id)
        pipe.hget(self.cart_meta_key, product_id)
        results = pipe.execute()

        quantity = results[0]
        meta = results[1]

        if not quantity:
            return None

        if meta:
            product_info = json.loads(meta)
            return CartItem(
                product_id=product_id,
                name=product_info.get("name", ""),
                price=product_info.get("price", 0),
                quantity=int(quantity),
                image_url=product_info.get("image_url", "")
            )

        return CartItem(
            product_id=product_id,
            name="",
            price=0,
            quantity=int(quantity)
        )

    def get_all_items(self) -> List[CartItem]:
        """Get all items in the cart."""
        pipe = r.pipeline()
        pipe.hgetall(self.cart_key)
        pipe.hgetall(self.cart_meta_key)
        results = pipe.execute()

        quantities = results[0]
        metadata = results[1]

        items = []
        for product_id, quantity in quantities.items():
            meta = metadata.get(product_id)
            if meta:
                product_info = json.loads(meta)
                items.append(CartItem(
                    product_id=product_id,
                    name=product_info.get("name", ""),
                    price=product_info.get("price", 0),
                    quantity=int(quantity),
                    image_url=product_info.get("image_url", "")
                ))
            else:
                items.append(CartItem(
                    product_id=product_id,
                    name="",
                    price=0,
                    quantity=int(quantity)
                ))

        return items

    def get_cart_total(self) -> dict:
        """Calculate cart total and item count."""
        items = self.get_all_items()

        total_items = sum(item.quantity for item in items)
        total_price = sum(item.price * item.quantity for item in items)

        return {
            "items": items,
            "total_items": total_items,
            "total_price": round(total_price, 2),
            "currency": "USD"
        }

    def clear_cart(self) -> bool:
        """Remove all items from the cart."""
        pipe = r.pipeline()
        pipe.delete(self.cart_key)
        pipe.delete(self.cart_meta_key)
        pipe.execute()
        return True

    def get_item_count(self) -> int:
        """Get total number of items in cart."""
        items = r.hgetall(self.cart_key)
        return sum(int(qty) for qty in items.values())

    def merge_carts(self, guest_user_id: str) -> None:
        """Merge a guest cart into the current user cart (after login)."""
        guest_cart_key = f"cart:{guest_user_id}"
        guest_meta_key = f"cart:meta:{guest_user_id}"

        guest_items = r.hgetall(guest_cart_key)
        guest_meta = r.hgetall(guest_meta_key)

        if not guest_items:
            return

        pipe = r.pipeline()

        # Merge quantities (add to existing)
        for product_id, quantity in guest_items.items():
            pipe.hincrby(self.cart_key, product_id, int(quantity))

        # Merge metadata (overwrite with guest data)
        for product_id, meta in guest_meta.items():
            pipe.hset(self.cart_meta_key, product_id, meta)

        # Delete guest cart
        pipe.delete(guest_cart_key)
        pipe.delete(guest_meta_key)

        # Reset TTL
        pipe.expire(self.cart_key, CART_TTL)
        pipe.expire(self.cart_meta_key, CART_TTL)

        pipe.execute()

# Usage example
cart = ShoppingCart("user_12345")

# Add items with product information
cart.add_item("prod_001", 2, {
    "name": "Wireless Mouse",
    "price": 29.99,
    "image_url": "/images/mouse.jpg"
})

cart.add_item("prod_002", 1, {
    "name": "Mechanical Keyboard",
    "price": 149.99,
    "image_url": "/images/keyboard.jpg"
})

# Get cart summary
summary = cart.get_cart_total()
print(f"Cart total: ${summary['total_price']}")
print(f"Total items: {summary['total_items']}")
```

## Implementing in Node.js

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

const CART_TTL = 7 * 24 * 60 * 60; // 7 days

class ShoppingCart {
  constructor(userId) {
    this.userId = userId;
    this.cartKey = `cart:${userId}`;
    this.metaKey = `cart:meta:${userId}`;
  }

  async addItem(productId, quantity = 1, productInfo = null) {
    const pipeline = redis.pipeline();

    pipeline.hincrby(this.cartKey, productId, quantity);

    if (productInfo) {
      pipeline.hset(this.metaKey, productId, JSON.stringify(productInfo));
    }

    pipeline.expire(this.cartKey, CART_TTL);
    pipeline.expire(this.metaKey, CART_TTL);

    const results = await pipeline.exec();
    return results[0][1]; // New quantity
  }

  async removeItem(productId) {
    const pipeline = redis.pipeline();
    pipeline.hdel(this.cartKey, productId);
    pipeline.hdel(this.metaKey, productId);
    const results = await pipeline.exec();
    return results[0][1] > 0;
  }

  async updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    await redis.hset(this.cartKey, productId, quantity);
    await redis.expire(this.cartKey, CART_TTL);
    return true;
  }

  async getAllItems() {
    const [quantities, metadata] = await Promise.all([
      redis.hgetall(this.cartKey),
      redis.hgetall(this.metaKey)
    ]);

    const items = [];
    for (const [productId, quantity] of Object.entries(quantities)) {
      const meta = metadata[productId]
        ? JSON.parse(metadata[productId])
        : {};

      items.push({
        productId,
        quantity: parseInt(quantity, 10),
        name: meta.name || '',
        price: meta.price || 0,
        imageUrl: meta.imageUrl || ''
      });
    }

    return items;
  }

  async getCartTotal() {
    const items = await this.getAllItems();

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      items,
      totalItems,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: 'USD'
    };
  }

  async clearCart() {
    await redis.del(this.cartKey, this.metaKey);
    return true;
  }

  async mergeCarts(guestUserId) {
    const guestCartKey = `cart:${guestUserId}`;
    const guestMetaKey = `cart:meta:${guestUserId}`;

    const [guestItems, guestMeta] = await Promise.all([
      redis.hgetall(guestCartKey),
      redis.hgetall(guestMetaKey)
    ]);

    if (Object.keys(guestItems).length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    for (const [productId, quantity] of Object.entries(guestItems)) {
      pipeline.hincrby(this.cartKey, productId, parseInt(quantity, 10));
    }

    for (const [productId, meta] of Object.entries(guestMeta)) {
      pipeline.hset(this.metaKey, productId, meta);
    }

    pipeline.del(guestCartKey, guestMetaKey);
    pipeline.expire(this.cartKey, CART_TTL);
    pipeline.expire(this.metaKey, CART_TTL);

    await pipeline.exec();
  }
}

// Express.js API routes example
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/cart/:userId/items', async (req, res) => {
  const cart = new ShoppingCart(req.params.userId);
  const { productId, quantity, productInfo } = req.body;

  const newQuantity = await cart.addItem(productId, quantity, productInfo);
  res.json({ success: true, newQuantity });
});

app.get('/api/cart/:userId', async (req, res) => {
  const cart = new ShoppingCart(req.params.userId);
  const summary = await cart.getCartTotal();
  res.json(summary);
});

app.delete('/api/cart/:userId/items/:productId', async (req, res) => {
  const cart = new ShoppingCart(req.params.userId);
  const removed = await cart.removeItem(req.params.productId);
  res.json({ success: removed });
});

app.delete('/api/cart/:userId', async (req, res) => {
  const cart = new ShoppingCart(req.params.userId);
  await cart.clearCart();
  res.json({ success: true });
});
```

## Inventory Integration

Checking inventory before adding items prevents overselling:

```python
class InventoryAwareCart(ShoppingCart):
    def __init__(self, user_id: str, inventory_client):
        super().__init__(user_id)
        self.inventory = inventory_client

    def add_item_with_inventory_check(
        self,
        product_id: str,
        quantity: int = 1,
        product_info: dict = None
    ) -> dict:
        """Add item only if inventory is available."""
        # Get current cart quantity
        current_qty = r.hget(self.cart_key, product_id)
        current_qty = int(current_qty) if current_qty else 0

        # Check inventory
        available = self.inventory.get_available_quantity(product_id)
        requested_total = current_qty + quantity

        if requested_total > available:
            return {
                "success": False,
                "error": "insufficient_inventory",
                "available": available,
                "in_cart": current_qty
            }

        # Add to cart
        new_qty = self.add_item(product_id, quantity, product_info)

        return {
            "success": True,
            "new_quantity": new_qty
        }


class RedisInventory:
    """Simple Redis-based inventory management."""

    def __init__(self):
        self.inventory_key = "inventory"

    def set_stock(self, product_id: str, quantity: int) -> None:
        """Set the stock level for a product."""
        r.hset(self.inventory_key, product_id, quantity)

    def get_available_quantity(self, product_id: str) -> int:
        """Get available stock for a product."""
        qty = r.hget(self.inventory_key, product_id)
        return int(qty) if qty else 0

    def reserve_stock(self, product_id: str, quantity: int) -> bool:
        """Atomically reserve stock using Lua script."""
        reserve_script = """
        local inventory_key = KEYS[1]
        local product_id = ARGV[1]
        local quantity = tonumber(ARGV[2])

        local current = tonumber(redis.call('HGET', inventory_key, product_id) or 0)

        if current >= quantity then
            redis.call('HINCRBY', inventory_key, product_id, -quantity)
            return 1
        else
            return 0
        end
        """
        script = r.register_script(reserve_script)
        result = script(keys=[self.inventory_key], args=[product_id, quantity])
        return result == 1

    def release_stock(self, product_id: str, quantity: int) -> None:
        """Release reserved stock back to inventory."""
        r.hincrby(self.inventory_key, product_id, quantity)


# Usage
inventory = RedisInventory()
inventory.set_stock("prod_001", 100)

cart = InventoryAwareCart("user_123", inventory)
result = cart.add_item_with_inventory_check("prod_001", 5, {
    "name": "Widget",
    "price": 19.99
})
print(result)
```

## Cart Reservation System

For high-demand products, implement a reservation system to hold inventory:

```python
import time
import uuid

class CartWithReservations(ShoppingCart):
    RESERVATION_TTL = 15 * 60  # 15 minutes

    def reserve_item(self, product_id: str, quantity: int) -> dict:
        """Reserve inventory for the cart item."""
        reservation_id = str(uuid.uuid4())
        reservation_key = f"reservation:{self.user_id}:{product_id}"

        # Lua script for atomic reservation
        reserve_script = """
        local inventory_key = KEYS[1]
        local reservation_key = KEYS[2]
        local product_id = ARGV[1]
        local quantity = tonumber(ARGV[2])
        local reservation_id = ARGV[3]
        local ttl = tonumber(ARGV[4])

        -- Check current inventory
        local current = tonumber(redis.call('HGET', inventory_key, product_id) or 0)

        if current < quantity then
            return {0, 'insufficient_inventory', current}
        end

        -- Check if there's an existing reservation
        local existing = redis.call('GET', reservation_key)
        if existing then
            return {0, 'already_reserved', 0}
        end

        -- Reserve the inventory
        redis.call('HINCRBY', inventory_key, product_id, -quantity)
        redis.call('SETEX', reservation_key, ttl,
            cjson.encode({id=reservation_id, quantity=quantity}))

        return {1, 'success', quantity}
        """

        script = r.register_script(reserve_script)
        result = script(
            keys=["inventory", reservation_key],
            args=[product_id, quantity, reservation_id, self.RESERVATION_TTL]
        )

        if result[0] == 1:
            return {
                "success": True,
                "reservation_id": reservation_id,
                "expires_in": self.RESERVATION_TTL
            }
        else:
            return {
                "success": False,
                "error": result[1],
                "available": result[2] if len(result) > 2 else 0
            }

    def extend_reservation(self, product_id: str) -> bool:
        """Extend the reservation TTL."""
        reservation_key = f"reservation:{self.user_id}:{product_id}"
        return r.expire(reservation_key, self.RESERVATION_TTL)

    def release_reservation(self, product_id: str) -> bool:
        """Release a reservation and return inventory."""
        reservation_key = f"reservation:{self.user_id}:{product_id}"

        release_script = """
        local inventory_key = KEYS[1]
        local reservation_key = KEYS[2]
        local product_id = ARGV[1]

        local reservation_data = redis.call('GET', reservation_key)
        if not reservation_data then
            return 0
        end

        local reservation = cjson.decode(reservation_data)
        redis.call('HINCRBY', inventory_key, product_id, reservation.quantity)
        redis.call('DEL', reservation_key)

        return 1
        """

        script = r.register_script(release_script)
        result = script(
            keys=["inventory", reservation_key],
            args=[product_id]
        )
        return result == 1

    def convert_reservation_to_purchase(self, product_id: str) -> bool:
        """Convert reservation to completed purchase."""
        reservation_key = f"reservation:{self.user_id}:{product_id}"

        # Simply delete the reservation - inventory already decremented
        return r.delete(reservation_key) > 0
```

## Session-Based Guest Carts

Handle anonymous users with session-based carts:

```python
import secrets

class SessionManager:
    SESSION_TTL = 24 * 60 * 60  # 24 hours

    @staticmethod
    def create_session() -> str:
        """Create a new session ID."""
        session_id = secrets.token_urlsafe(32)
        r.setex(f"session:{session_id}", SessionManager.SESSION_TTL, "active")
        return session_id

    @staticmethod
    def validate_session(session_id: str) -> bool:
        """Check if session is valid."""
        return r.exists(f"session:{session_id}") > 0

    @staticmethod
    def extend_session(session_id: str) -> bool:
        """Extend session TTL."""
        return r.expire(f"session:{session_id}", SessionManager.SESSION_TTL)

    @staticmethod
    def link_session_to_user(session_id: str, user_id: str) -> None:
        """Link a session to a user after login."""
        r.hset(f"session:{session_id}", mapping={
            "user_id": user_id,
            "linked_at": datetime.now().isoformat()
        })


# Flask integration example
from flask import Flask, request, make_response

app = Flask(__name__)

@app.before_request
def handle_session():
    session_id = request.cookies.get('cart_session')

    if not session_id or not SessionManager.validate_session(session_id):
        session_id = SessionManager.create_session()
        request.session_id = session_id
        request.new_session = True
    else:
        request.session_id = session_id
        request.new_session = False
        SessionManager.extend_session(session_id)

@app.after_request
def set_session_cookie(response):
    if hasattr(request, 'new_session') and request.new_session:
        response.set_cookie(
            'cart_session',
            request.session_id,
            max_age=24 * 60 * 60,
            httponly=True,
            secure=True,
            samesite='Lax'
        )
    return response

@app.route('/api/cart/add', methods=['POST'])
def add_to_cart():
    cart = ShoppingCart(request.session_id)
    data = request.get_json()

    cart.add_item(
        data['product_id'],
        data.get('quantity', 1),
        data.get('product_info')
    )

    return {"success": True}
```

## Performance Optimizations

### 1. Pipelining for Batch Operations

```python
def add_multiple_items(user_id: str, items: list) -> dict:
    """Add multiple items in a single round trip."""
    cart_key = f"cart:{user_id}"
    meta_key = f"cart:meta:{user_id}"

    pipe = r.pipeline()

    for item in items:
        pipe.hincrby(cart_key, item['product_id'], item['quantity'])
        if 'product_info' in item:
            pipe.hset(meta_key, item['product_id'],
                     json.dumps(item['product_info']))

    pipe.expire(cart_key, CART_TTL)
    pipe.expire(meta_key, CART_TTL)

    results = pipe.execute()

    return {"success": True, "items_added": len(items)}
```

### 2. Lua Script for Atomic Cart Updates

```python
UPDATE_CART_SCRIPT = """
local cart_key = KEYS[1]
local meta_key = KEYS[2]
local product_id = ARGV[1]
local quantity = tonumber(ARGV[2])
local max_quantity = tonumber(ARGV[3])
local product_info = ARGV[4]
local ttl = tonumber(ARGV[5])

-- Get current quantity
local current = tonumber(redis.call('HGET', cart_key, product_id) or 0)
local new_quantity = current + quantity

-- Enforce maximum quantity
if new_quantity > max_quantity then
    new_quantity = max_quantity
end

if new_quantity <= 0 then
    redis.call('HDEL', cart_key, product_id)
    redis.call('HDEL', meta_key, product_id)
    return 0
end

redis.call('HSET', cart_key, product_id, new_quantity)

if product_info and product_info ~= '' then
    redis.call('HSET', meta_key, product_id, product_info)
end

redis.call('EXPIRE', cart_key, ttl)
redis.call('EXPIRE', meta_key, ttl)

return new_quantity
"""

def atomic_cart_update(user_id: str, product_id: str, quantity: int,
                       max_quantity: int = 99, product_info: dict = None) -> int:
    """Atomically update cart with quantity limits."""
    cart_key = f"cart:{user_id}"
    meta_key = f"cart:meta:{user_id}"

    script = r.register_script(UPDATE_CART_SCRIPT)
    result = script(
        keys=[cart_key, meta_key],
        args=[
            product_id,
            quantity,
            max_quantity,
            json.dumps(product_info) if product_info else '',
            CART_TTL
        ]
    )
    return result
```

## Monitoring Cart Metrics

Track cart analytics for business insights:

```python
class CartAnalytics:
    def track_cart_event(self, event_type: str, user_id: str,
                        product_id: str = None, data: dict = None) -> None:
        """Track cart-related events."""
        today = datetime.now().strftime("%Y-%m-%d")

        pipe = r.pipeline()

        # Increment event counter
        pipe.hincrby(f"cart:analytics:{today}", event_type, 1)

        # Track unique users per event
        pipe.pfadd(f"cart:analytics:{event_type}:users:{today}", user_id)

        # Track abandoned cart potential
        if event_type == "add_item":
            pipe.zadd("cart:active", {user_id: time.time()})

        if event_type == "checkout_complete":
            pipe.zrem("cart:active", user_id)

        pipe.execute()

    def get_daily_metrics(self, date: str = None) -> dict:
        """Get cart metrics for a day."""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        events = r.hgetall(f"cart:analytics:{date}")

        metrics = {event: int(count) for event, count in events.items()}

        # Add unique user counts
        for event in ["add_item", "remove_item", "checkout_start", "checkout_complete"]:
            unique_users = r.pfcount(f"cart:analytics:{event}:users:{date}")
            metrics[f"{event}_unique_users"] = unique_users

        return metrics

    def get_abandoned_carts(self, hours: int = 24) -> list:
        """Get carts that have been inactive for the specified hours."""
        cutoff = time.time() - (hours * 3600)

        abandoned = r.zrangebyscore(
            "cart:active",
            "-inf",
            cutoff,
            withscores=True
        )

        return [
            {
                "user_id": user_id,
                "last_activity": datetime.fromtimestamp(score).isoformat()
            }
            for user_id, score in abandoned
        ]
```

## Conclusion

Building a shopping cart with Redis provides the performance and reliability needed for e-commerce applications. Key takeaways:

- Use **hashes** for storing cart items with quantities
- Implement **atomic operations** with HINCRBY and Lua scripts
- Set **TTL** on cart keys for automatic cleanup
- Use **pipelining** for batch operations
- Implement **inventory checks** to prevent overselling
- Consider **reservation systems** for high-demand products
- Track **cart analytics** for business insights
- Handle **guest-to-user cart merging** after login

With these patterns, you can build a shopping cart system that handles thousands of concurrent users while maintaining sub-millisecond response times.

## Related Resources

- [Redis Hash Commands](https://redis.io/commands/?group=hash)
- [Redis Transactions](https://redis.io/docs/interact/transactions/)
- [Redis Lua Scripting](https://redis.io/docs/interact/programmability/eval-intro/)
