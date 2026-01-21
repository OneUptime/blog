# How to Implement Flash Sale Systems with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Flash Sales, High Concurrency, Inventory Management, Performance

Description: A comprehensive guide to implementing high-concurrency flash sale systems with Redis for inventory management, rate limiting, and fair ordering.

---

Flash sales present one of the most challenging scenarios in e-commerce - thousands or millions of users attempting to purchase limited inventory in seconds. Redis's atomic operations, speed, and distributed capabilities make it the ideal solution for handling this extreme concurrency while ensuring accurate inventory management.

## Understanding Flash Sale Challenges

Flash sales require handling:

- **Extreme concurrency**: Thousands of simultaneous requests
- **Inventory accuracy**: Prevent overselling with limited stock
- **Fair ordering**: First-come, first-served processing
- **Rate limiting**: Prevent bots and abuse
- **User experience**: Fast responses even under load

## Basic Inventory Management

### Atomic Inventory Operations

```python
import redis
import time
import uuid
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class FlashSaleInventory:
    def __init__(self, prefix='flash_sale'):
        self.prefix = prefix

    def initialize_sale(self, sale_id, product_id, quantity, start_time, end_time):
        """Initialize a flash sale with inventory."""
        sale_key = f"{self.prefix}:{sale_id}"
        inventory_key = f"{self.prefix}:{sale_id}:inventory"

        sale_data = {
            'product_id': product_id,
            'total_quantity': quantity,
            'start_time': start_time,
            'end_time': end_time,
            'status': 'pending'
        }

        pipe = r.pipeline()
        pipe.hset(sale_key, mapping=sale_data)
        pipe.set(inventory_key, quantity)
        pipe.execute()

        return sale_id

    def check_and_reserve(self, sale_id, user_id, quantity=1):
        """
        Atomically check and reserve inventory.
        Returns reservation_id if successful, None if out of stock.
        """
        inventory_key = f"{self.prefix}:{sale_id}:inventory"
        reservations_key = f"{self.prefix}:{sale_id}:reservations"
        user_key = f"{self.prefix}:{sale_id}:users:{user_id}"

        # Lua script for atomic check and decrement
        lua_script = """
        local inventory_key = KEYS[1]
        local reservations_key = KEYS[2]
        local user_key = KEYS[3]
        local quantity = tonumber(ARGV[1])
        local user_id = ARGV[2]
        local reservation_id = ARGV[3]
        local timestamp = ARGV[4]
        local max_per_user = tonumber(ARGV[5])

        -- Check if user already has maximum reservations
        local user_reservations = redis.call('GET', user_key)
        if user_reservations and tonumber(user_reservations) >= max_per_user then
            return 'USER_LIMIT_EXCEEDED'
        end

        -- Check available inventory
        local current = redis.call('GET', inventory_key)
        if not current then
            return 'SALE_NOT_FOUND'
        end

        current = tonumber(current)
        if current < quantity then
            return 'OUT_OF_STOCK'
        end

        -- Reserve inventory atomically
        redis.call('DECRBY', inventory_key, quantity)

        -- Track reservation
        local reservation = cjson.encode({
            user_id = user_id,
            quantity = quantity,
            timestamp = timestamp,
            status = 'reserved'
        })
        redis.call('HSET', reservations_key, reservation_id, reservation)

        -- Update user's reservation count
        redis.call('INCRBY', user_key, quantity)
        redis.call('EXPIRE', user_key, 86400)

        return reservation_id
        """

        reservation_id = str(uuid.uuid4())
        timestamp = int(time.time())
        max_per_user = 2  # Maximum items per user

        result = r.eval(
            lua_script, 3,
            inventory_key, reservations_key, user_key,
            quantity, user_id, reservation_id, timestamp, max_per_user
        )

        if result in ['USER_LIMIT_EXCEEDED', 'SALE_NOT_FOUND', 'OUT_OF_STOCK']:
            return None, result

        return result, 'SUCCESS'

    def confirm_reservation(self, sale_id, reservation_id):
        """Confirm a reservation (after payment)."""
        reservations_key = f"{self.prefix}:{sale_id}:reservations"

        reservation = r.hget(reservations_key, reservation_id)
        if not reservation:
            return False

        import json
        data = json.loads(reservation)
        data['status'] = 'confirmed'
        data['confirmed_at'] = int(time.time())

        r.hset(reservations_key, reservation_id, json.dumps(data))
        return True

    def cancel_reservation(self, sale_id, reservation_id):
        """Cancel a reservation and return inventory."""
        inventory_key = f"{self.prefix}:{sale_id}:inventory"
        reservations_key = f"{self.prefix}:{sale_id}:reservations"

        import json

        lua_script = """
        local inventory_key = KEYS[1]
        local reservations_key = KEYS[2]
        local reservation_id = ARGV[1]

        local reservation = redis.call('HGET', reservations_key, reservation_id)
        if not reservation then
            return 'NOT_FOUND'
        end

        local data = cjson.decode(reservation)
        if data.status ~= 'reserved' then
            return 'ALREADY_PROCESSED'
        end

        -- Return inventory
        redis.call('INCRBY', inventory_key, data.quantity)

        -- Update reservation status
        data.status = 'cancelled'
        redis.call('HSET', reservations_key, reservation_id, cjson.encode(data))

        return 'SUCCESS'
        """

        result = r.eval(lua_script, 2, inventory_key, reservations_key, reservation_id)
        return result == 'SUCCESS'

    def get_remaining_inventory(self, sale_id):
        """Get remaining inventory count."""
        inventory_key = f"{self.prefix}:{sale_id}:inventory"
        count = r.get(inventory_key)
        return int(count) if count else 0

# Usage
inventory = FlashSaleInventory()

# Initialize a flash sale
sale_id = 'sale_2026_001'
inventory.initialize_sale(
    sale_id,
    product_id='product_123',
    quantity=1000,
    start_time=int(time.time()),
    end_time=int(time.time()) + 3600
)

# User attempts to purchase
reservation_id, status = inventory.check_and_reserve(sale_id, 'user_001', quantity=1)
if reservation_id:
    print(f"Reserved! ID: {reservation_id}")
    # Process payment...
    inventory.confirm_reservation(sale_id, reservation_id)
else:
    print(f"Failed: {status}")

# Check remaining
remaining = inventory.get_remaining_inventory(sale_id)
print(f"Remaining inventory: {remaining}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis();

class FlashSaleInventory {
  constructor(prefix = 'flash_sale') {
    this.prefix = prefix;
  }

  async initializeSale(saleId, productId, quantity, startTime, endTime) {
    const saleKey = `${this.prefix}:${saleId}`;
    const inventoryKey = `${this.prefix}:${saleId}:inventory`;

    await redis.pipeline()
      .hset(saleKey, {
        product_id: productId,
        total_quantity: quantity,
        start_time: startTime,
        end_time: endTime,
        status: 'pending'
      })
      .set(inventoryKey, quantity)
      .exec();

    return saleId;
  }

  async checkAndReserve(saleId, userId, quantity = 1) {
    const inventoryKey = `${this.prefix}:${saleId}:inventory`;
    const reservationsKey = `${this.prefix}:${saleId}:reservations`;
    const userKey = `${this.prefix}:${saleId}:users:${userId}`;

    const luaScript = `
      local inventory_key = KEYS[1]
      local reservations_key = KEYS[2]
      local user_key = KEYS[3]
      local quantity = tonumber(ARGV[1])
      local user_id = ARGV[2]
      local reservation_id = ARGV[3]
      local timestamp = ARGV[4]
      local max_per_user = tonumber(ARGV[5])

      local user_reservations = redis.call('GET', user_key)
      if user_reservations and tonumber(user_reservations) >= max_per_user then
        return 'USER_LIMIT_EXCEEDED'
      end

      local current = redis.call('GET', inventory_key)
      if not current then
        return 'SALE_NOT_FOUND'
      end

      current = tonumber(current)
      if current < quantity then
        return 'OUT_OF_STOCK'
      end

      redis.call('DECRBY', inventory_key, quantity)

      local reservation = cjson.encode({
        user_id = user_id,
        quantity = quantity,
        timestamp = timestamp,
        status = 'reserved'
      })
      redis.call('HSET', reservations_key, reservation_id, reservation)

      redis.call('INCRBY', user_key, quantity)
      redis.call('EXPIRE', user_key, 86400)

      return reservation_id
    `;

    const reservationId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);
    const maxPerUser = 2;

    const result = await redis.eval(
      luaScript,
      3,
      inventoryKey, reservationsKey, userKey,
      quantity, userId, reservationId, timestamp, maxPerUser
    );

    if (['USER_LIMIT_EXCEEDED', 'SALE_NOT_FOUND', 'OUT_OF_STOCK'].includes(result)) {
      return { success: false, error: result };
    }

    return { success: true, reservationId: result };
  }

  async getRemainingInventory(saleId) {
    const inventoryKey = `${this.prefix}:${saleId}:inventory`;
    const count = await redis.get(inventoryKey);
    return count ? parseInt(count) : 0;
  }
}

// Usage
async function example() {
  const inventory = new FlashSaleInventory();

  await inventory.initializeSale(
    'sale_001',
    'product_123',
    1000,
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000) + 3600
  );

  const result = await inventory.checkAndReserve('sale_001', 'user_001', 1);
  console.log('Result:', result);

  const remaining = await inventory.getRemainingInventory('sale_001');
  console.log('Remaining:', remaining);
}

example().catch(console.error);
```

## Queue-Based Fair Ordering

For extreme traffic, implement a queue system to ensure fair ordering.

```python
class FlashSaleQueue:
    def __init__(self, prefix='flash_queue'):
        self.prefix = prefix

    def join_queue(self, sale_id, user_id):
        """Add user to the sale queue."""
        queue_key = f"{self.prefix}:{sale_id}:queue"
        position_key = f"{self.prefix}:{sale_id}:position"
        user_position_key = f"{self.prefix}:{sale_id}:user:{user_id}"

        # Check if user already in queue
        existing = r.get(user_position_key)
        if existing:
            return int(existing)

        # Atomic join with position tracking
        lua_script = """
        local queue_key = KEYS[1]
        local position_key = KEYS[2]
        local user_position_key = KEYS[3]
        local user_id = ARGV[1]
        local timestamp = ARGV[2]

        -- Check again inside Lua for race condition
        local existing = redis.call('GET', user_position_key)
        if existing then
            return tonumber(existing)
        end

        -- Get next position
        local position = redis.call('INCR', position_key)

        -- Add to queue with score as position
        redis.call('ZADD', queue_key, position, user_id)

        -- Store user's position
        redis.call('SETEX', user_position_key, 86400, position)

        return position
        """

        position = r.eval(
            lua_script, 3,
            queue_key, position_key, user_position_key,
            user_id, int(time.time())
        )

        return int(position)

    def get_queue_position(self, sale_id, user_id):
        """Get user's current position in queue."""
        queue_key = f"{self.prefix}:{sale_id}:queue"
        rank = r.zrank(queue_key, user_id)
        return rank + 1 if rank is not None else None

    def get_next_in_queue(self, sale_id, batch_size=10):
        """Get next users to process from queue."""
        queue_key = f"{self.prefix}:{sale_id}:queue"
        processing_key = f"{self.prefix}:{sale_id}:processing"

        lua_script = """
        local queue_key = KEYS[1]
        local processing_key = KEYS[2]
        local batch_size = tonumber(ARGV[1])
        local timestamp = ARGV[2]

        -- Get users from front of queue
        local users = redis.call('ZRANGE', queue_key, 0, batch_size - 1)
        if #users == 0 then
            return {}
        end

        -- Move to processing set
        for _, user_id in ipairs(users) do
            redis.call('ZREM', queue_key, user_id)
            redis.call('HSET', processing_key, user_id, timestamp)
        end

        return users
        """

        users = r.eval(
            lua_script, 2,
            queue_key, processing_key,
            batch_size, int(time.time())
        )

        return users

    def process_user(self, sale_id, user_id, inventory_manager):
        """Process a user from the queue."""
        processing_key = f"{self.prefix}:{sale_id}:processing"

        # Attempt to reserve inventory
        reservation_id, status = inventory_manager.check_and_reserve(sale_id, user_id, 1)

        if reservation_id:
            # Success - remove from processing
            r.hdel(processing_key, user_id)
            return {'success': True, 'reservation_id': reservation_id}
        else:
            # Failed - could retry or notify user
            r.hdel(processing_key, user_id)
            return {'success': False, 'error': status}

    def get_queue_stats(self, sale_id):
        """Get queue statistics."""
        queue_key = f"{self.prefix}:{sale_id}:queue"
        processing_key = f"{self.prefix}:{sale_id}:processing"

        pipe = r.pipeline()
        pipe.zcard(queue_key)
        pipe.hlen(processing_key)
        waiting, processing = pipe.execute()

        return {
            'waiting': waiting,
            'processing': processing
        }

# Usage
queue = FlashSaleQueue()
inventory = FlashSaleInventory()

# Users join queue
for i in range(100):
    position = queue.join_queue('sale_001', f'user_{i:03d}')
    print(f"User {i} joined at position {position}")

# Process queue in batches
while True:
    users = queue.get_next_in_queue('sale_001', batch_size=10)
    if not users:
        break

    for user_id in users:
        result = queue.process_user('sale_001', user_id, inventory)
        print(f"Processed {user_id}: {result}")
```

## Rate Limiting for Flash Sales

```python
class FlashSaleRateLimiter:
    def __init__(self, prefix='flash_rate'):
        self.prefix = prefix

    def check_rate_limit(self, sale_id, user_id, ip_address, limits):
        """
        Check multiple rate limits.

        limits: {
            'user_per_second': 2,
            'user_per_minute': 10,
            'ip_per_second': 5,
            'ip_per_minute': 30,
            'global_per_second': 10000
        }
        """
        lua_script = """
        local results = {}
        local current_second = math.floor(tonumber(ARGV[1]))
        local current_minute = math.floor(current_second / 60)

        -- Check each limit
        for i = 1, #KEYS, 2 do
            local key = KEYS[i]
            local limit = tonumber(KEYS[i + 1])
            local count = redis.call('INCR', key)

            if count == 1 then
                -- Set appropriate expiry
                if string.find(key, ':second:') then
                    redis.call('EXPIRE', key, 2)
                else
                    redis.call('EXPIRE', key, 120)
                end
            end

            if count > limit then
                return 'RATE_LIMITED:' .. key
            end
        end

        return 'OK'
        """

        current_time = time.time()
        second_bucket = int(current_time)
        minute_bucket = int(current_time / 60)

        # Build keys and limits
        keys_and_limits = [
            f"{self.prefix}:{sale_id}:user:{user_id}:second:{second_bucket}",
            limits.get('user_per_second', 2),
            f"{self.prefix}:{sale_id}:user:{user_id}:minute:{minute_bucket}",
            limits.get('user_per_minute', 10),
            f"{self.prefix}:{sale_id}:ip:{ip_address}:second:{second_bucket}",
            limits.get('ip_per_second', 5),
            f"{self.prefix}:{sale_id}:ip:{ip_address}:minute:{minute_bucket}",
            limits.get('ip_per_minute', 30),
            f"{self.prefix}:{sale_id}:global:second:{second_bucket}",
            limits.get('global_per_second', 10000),
        ]

        result = r.eval(
            lua_script,
            len(keys_and_limits),
            *keys_and_limits,
            current_time
        )

        return result == 'OK', result

    def get_user_rate_status(self, sale_id, user_id):
        """Get current rate limit status for a user."""
        second_bucket = int(time.time())
        minute_bucket = int(time.time() / 60)

        pipe = r.pipeline()
        pipe.get(f"{self.prefix}:{sale_id}:user:{user_id}:second:{second_bucket}")
        pipe.get(f"{self.prefix}:{sale_id}:user:{user_id}:minute:{minute_bucket}")
        second_count, minute_count = pipe.execute()

        return {
            'requests_this_second': int(second_count or 0),
            'requests_this_minute': int(minute_count or 0)
        }

# Usage
limiter = FlashSaleRateLimiter()

# Check rate limit before processing
allowed, result = limiter.check_rate_limit(
    'sale_001',
    'user_001',
    '192.168.1.1',
    {
        'user_per_second': 2,
        'user_per_minute': 10,
        'ip_per_second': 5,
        'global_per_second': 10000
    }
)

if allowed:
    print("Request allowed")
else:
    print(f"Rate limited: {result}")
```

## Complete Flash Sale System

```python
class FlashSaleSystem:
    def __init__(self):
        self.inventory = FlashSaleInventory()
        self.queue = FlashSaleQueue()
        self.limiter = FlashSaleRateLimiter()

    def create_sale(self, sale_id, product_id, quantity, start_time, end_time, config=None):
        """Create a new flash sale."""
        config = config or {}

        # Initialize inventory
        self.inventory.initialize_sale(sale_id, product_id, quantity, start_time, end_time)

        # Store sale configuration
        sale_config = {
            'max_per_user': config.get('max_per_user', 2),
            'use_queue': config.get('use_queue', False),
            'rate_limits': json.dumps(config.get('rate_limits', {
                'user_per_second': 2,
                'user_per_minute': 10,
                'ip_per_second': 5,
                'global_per_second': 10000
            }))
        }

        r.hset(f"flash_sale:{sale_id}:config", mapping=sale_config)

        return sale_id

    def attempt_purchase(self, sale_id, user_id, ip_address, quantity=1):
        """
        Main entry point for purchase attempts.
        Handles rate limiting, queue, and inventory.
        """
        # Get sale config
        config = r.hgetall(f"flash_sale:{sale_id}:config")
        if not config:
            return {'success': False, 'error': 'SALE_NOT_FOUND'}

        # Check sale timing
        sale_data = r.hgetall(f"flash_sale:{sale_id}")
        current_time = int(time.time())

        if current_time < int(sale_data.get('start_time', 0)):
            return {'success': False, 'error': 'SALE_NOT_STARTED'}

        if current_time > int(sale_data.get('end_time', 0)):
            return {'success': False, 'error': 'SALE_ENDED'}

        # Check rate limits
        rate_limits = json.loads(config.get('rate_limits', '{}'))
        allowed, limit_result = self.limiter.check_rate_limit(
            sale_id, user_id, ip_address, rate_limits
        )

        if not allowed:
            return {'success': False, 'error': 'RATE_LIMITED', 'details': limit_result}

        # Use queue or direct purchase
        if config.get('use_queue') == 'true':
            position = self.queue.join_queue(sale_id, user_id)
            return {
                'success': True,
                'queued': True,
                'position': position,
                'message': f'You are #{position} in queue'
            }
        else:
            # Direct purchase attempt
            reservation_id, status = self.inventory.check_and_reserve(
                sale_id, user_id, quantity
            )

            if reservation_id:
                return {
                    'success': True,
                    'reservation_id': reservation_id,
                    'expires_in': 900  # 15 minutes to complete payment
                }
            else:
                return {'success': False, 'error': status}

    def complete_purchase(self, sale_id, reservation_id, payment_info):
        """Complete a purchase after payment."""
        # Verify payment (implementation depends on payment provider)
        payment_valid = self._verify_payment(payment_info)

        if payment_valid:
            confirmed = self.inventory.confirm_reservation(sale_id, reservation_id)
            if confirmed:
                return {'success': True, 'message': 'Purchase complete'}

        # Payment failed - cancel reservation
        self.inventory.cancel_reservation(sale_id, reservation_id)
        return {'success': False, 'error': 'PAYMENT_FAILED'}

    def get_sale_status(self, sale_id):
        """Get current sale status."""
        sale_data = r.hgetall(f"flash_sale:{sale_id}")
        remaining = self.inventory.get_remaining_inventory(sale_id)
        queue_stats = self.queue.get_queue_stats(sale_id)

        return {
            'sale_id': sale_id,
            'product_id': sale_data.get('product_id'),
            'total_quantity': int(sale_data.get('total_quantity', 0)),
            'remaining': remaining,
            'sold': int(sale_data.get('total_quantity', 0)) - remaining,
            'queue': queue_stats,
            'status': sale_data.get('status')
        }

    def _verify_payment(self, payment_info):
        """Verify payment with payment provider."""
        # Implementation depends on payment provider
        return True

# Usage
system = FlashSaleSystem()

# Create a flash sale
system.create_sale(
    'black_friday_2026',
    'iphone_15_pro',
    quantity=500,
    start_time=int(time.time()),
    end_time=int(time.time()) + 3600,
    config={
        'max_per_user': 1,
        'use_queue': False,
        'rate_limits': {
            'user_per_second': 1,
            'user_per_minute': 5,
            'ip_per_second': 3,
            'global_per_second': 5000
        }
    }
)

# User attempts purchase
result = system.attempt_purchase(
    'black_friday_2026',
    'user_001',
    '192.168.1.1',
    quantity=1
)
print(f"Purchase attempt: {result}")

# Complete purchase if reservation successful
if result.get('success') and result.get('reservation_id'):
    final = system.complete_purchase(
        'black_friday_2026',
        result['reservation_id'],
        {'payment_token': 'tok_xxx'}
    )
    print(f"Purchase complete: {final}")

# Check sale status
status = system.get_sale_status('black_friday_2026')
print(f"Sale status: {status}")
```

## Best Practices

### 1. Pre-warm Redis Connections

```python
# Create connection pool before sale starts
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=100,
    socket_connect_timeout=5,
    socket_timeout=5
)
r = redis.Redis(connection_pool=pool)
```

### 2. Use Redis Cluster for Scale

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    startup_nodes=[
        {"host": "redis1", "port": 6379},
        {"host": "redis2", "port": 6379},
        {"host": "redis3", "port": 6379}
    ]
)
```

### 3. Implement Reservation Timeout

```python
def expire_stale_reservations(sale_id, timeout_seconds=900):
    """Expire reservations that haven't been completed."""
    reservations_key = f"flash_sale:{sale_id}:reservations"
    inventory_key = f"flash_sale:{sale_id}:inventory"

    cutoff = int(time.time()) - timeout_seconds

    lua_script = """
    local reservations_key = KEYS[1]
    local inventory_key = KEYS[2]
    local cutoff = tonumber(ARGV[1])

    local reservations = redis.call('HGETALL', reservations_key)
    local expired_count = 0

    for i = 1, #reservations, 2 do
        local id = reservations[i]
        local data = cjson.decode(reservations[i + 1])

        if data.status == 'reserved' and data.timestamp < cutoff then
            -- Return inventory
            redis.call('INCRBY', inventory_key, data.quantity)

            -- Update status
            data.status = 'expired'
            redis.call('HSET', reservations_key, id, cjson.encode(data))

            expired_count = expired_count + 1
        end
    end

    return expired_count
    """

    return r.eval(lua_script, 2, reservations_key, inventory_key, cutoff)
```

## Conclusion

Implementing flash sales with Redis requires careful attention to concurrency, rate limiting, and inventory accuracy. Key takeaways:

- Use Lua scripts for atomic inventory operations
- Implement multiple layers of rate limiting
- Consider queue-based systems for extreme traffic
- Set reservation timeouts to prevent inventory lockup
- Pre-warm connections before sale starts
- Use Redis Cluster for horizontal scaling

Redis's atomic operations and speed make it the ideal choice for high-concurrency e-commerce scenarios where accuracy and performance are critical.
