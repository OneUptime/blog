# How to Implement Complex Business Logic with Redis Lua

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Business Logic, Transactions, Backend, Database, Scripting

Description: A comprehensive guide to implementing complex business logic with Redis Lua scripts, covering multi-key transactions, conditional updates, inventory management, and real-world patterns for building robust applications.

---

Redis Lua scripts enable you to implement sophisticated business logic that executes atomically on the server side. This guide covers advanced patterns for implementing real-world business requirements, from inventory management to financial transactions.

## Why Lua for Business Logic?

Moving business logic to Redis Lua scripts provides:

- **Atomicity**: Complex multi-step operations execute as one unit
- **Performance**: Reduced network round-trips and latency
- **Consistency**: No race conditions in concurrent environments
- **Simplicity**: Logic centralized rather than distributed across services

## Multi-Key Transaction Patterns

### Order Processing System

```lua
-- process_order.lua
-- Atomically process an order: check inventory, deduct stock, record sale

local inventory_key = KEYS[1]    -- Hash: product_id -> quantity
local orders_key = KEYS[2]       -- List: order records
local sales_key = KEYS[3]        -- Hash: product_id -> total_sold

local order_id = ARGV[1]
local customer_id = ARGV[2]
local timestamp = ARGV[3]
-- Items come as: product_id, quantity, product_id, quantity, ...
local items_start = 4

-- First pass: validate all items have sufficient stock
local items = {}
for i = items_start, #ARGV, 2 do
    local product_id = ARGV[i]
    local quantity = tonumber(ARGV[i + 1])

    local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
    if available < quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            product_id = product_id,
            available = available,
            requested = quantity
        })
    end

    table.insert(items, {product_id = product_id, quantity = quantity})
end

-- Second pass: process all items (we know we have sufficient stock)
local order_total = 0
for _, item in ipairs(items) do
    -- Deduct from inventory
    redis.call('HINCRBY', inventory_key, item.product_id, -item.quantity)

    -- Update sales counter
    redis.call('HINCRBY', sales_key, item.product_id, item.quantity)

    order_total = order_total + item.quantity
end

-- Record the order
local order_record = cjson.encode({
    order_id = order_id,
    customer_id = customer_id,
    timestamp = timestamp,
    items = items,
    total_items = order_total
})
redis.call('LPUSH', orders_key, order_record)

-- Trim orders list to last 10000
redis.call('LTRIM', orders_key, 0, 9999)

return cjson.encode({
    success = true,
    order_id = order_id,
    total_items = order_total
})
```

Python implementation:

```python
import redis
import json
import uuid
import time

class OrderProcessor:
    """Process orders atomically using Redis Lua"""

    PROCESS_ORDER_SCRIPT = """
    local inventory_key = KEYS[1]
    local orders_key = KEYS[2]
    local sales_key = KEYS[3]

    local order_id = ARGV[1]
    local customer_id = ARGV[2]
    local timestamp = ARGV[3]
    local items_start = 4

    local items = {}
    for i = items_start, #ARGV, 2 do
        local product_id = ARGV[i]
        local quantity = tonumber(ARGV[i + 1])

        local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
        if available < quantity then
            return cjson.encode({
                success = false,
                error = 'INSUFFICIENT_STOCK',
                product_id = product_id,
                available = available,
                requested = quantity
            })
        end
        table.insert(items, {product_id = product_id, quantity = quantity})
    end

    for _, item in ipairs(items) do
        redis.call('HINCRBY', inventory_key, item.product_id, -item.quantity)
        redis.call('HINCRBY', sales_key, item.product_id, item.quantity)
    end

    local order_record = cjson.encode({
        order_id = order_id,
        customer_id = customer_id,
        timestamp = timestamp,
        items = items
    })
    redis.call('LPUSH', orders_key, order_record)
    redis.call('LTRIM', orders_key, 0, 9999)

    return cjson.encode({success = true, order_id = order_id})
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._process_order = redis_client.register_script(self.PROCESS_ORDER_SCRIPT)

    def process_order(self, customer_id, items):
        """
        Process an order atomically.

        Args:
            customer_id: Customer identifier
            items: List of (product_id, quantity) tuples

        Returns:
            dict with success status and order details
        """
        order_id = str(uuid.uuid4())
        timestamp = str(int(time.time() * 1000))

        # Flatten items for ARGV
        item_args = []
        for product_id, quantity in items:
            item_args.extend([product_id, str(quantity)])

        result = self._process_order(
            keys=['inventory', 'orders', 'sales'],
            args=[order_id, customer_id, timestamp] + item_args
        )

        return json.loads(result)

    def add_inventory(self, product_id, quantity):
        """Add inventory for a product"""
        self.redis.hincrby('inventory', product_id, quantity)

    def get_inventory(self, product_id):
        """Get current inventory for a product"""
        return int(self.redis.hget('inventory', product_id) or 0)


# Usage
r = redis.Redis(decode_responses=True)
processor = OrderProcessor(r)

# Add some inventory
processor.add_inventory('PROD-001', 100)
processor.add_inventory('PROD-002', 50)

# Process an order
result = processor.process_order(
    customer_id='CUST-123',
    items=[
        ('PROD-001', 2),
        ('PROD-002', 1)
    ]
)

print(f"Order result: {result}")
print(f"Remaining inventory PROD-001: {processor.get_inventory('PROD-001')}")
```

### Financial Transaction System

```lua
-- transfer_funds.lua
-- Atomically transfer funds between accounts with validation

local accounts_key = KEYS[1]      -- Hash: account_id -> balance
local transactions_key = KEYS[2]  -- Sorted set: transactions by timestamp
local limits_key = KEYS[3]        -- Hash: account_id -> daily_limit

local from_account = ARGV[1]
local to_account = ARGV[2]
local amount = tonumber(ARGV[3])
local transaction_id = ARGV[4]
local timestamp = tonumber(ARGV[5])
local day_start = tonumber(ARGV[6])  -- Start of current day (timestamp)

-- Validate amount
if amount <= 0 then
    return cjson.encode({
        success = false,
        error = 'INVALID_AMOUNT',
        message = 'Amount must be positive'
    })
end

-- Get balances
local from_balance = tonumber(redis.call('HGET', accounts_key, from_account) or 0)
local to_balance = tonumber(redis.call('HGET', accounts_key, to_account) or 0)

-- Check if source account has sufficient funds
if from_balance < amount then
    return cjson.encode({
        success = false,
        error = 'INSUFFICIENT_FUNDS',
        available = from_balance,
        requested = amount
    })
end

-- Check daily transfer limit
local daily_limit = tonumber(redis.call('HGET', limits_key, from_account) or 10000)
local daily_key = 'daily_transfers:' .. from_account .. ':' .. day_start

local daily_total = tonumber(redis.call('GET', daily_key) or 0)
if daily_total + amount > daily_limit then
    return cjson.encode({
        success = false,
        error = 'DAILY_LIMIT_EXCEEDED',
        daily_limit = daily_limit,
        daily_used = daily_total,
        requested = amount
    })
end

-- Perform the transfer
redis.call('HINCRBYFLOAT', accounts_key, from_account, -amount)
redis.call('HINCRBYFLOAT', accounts_key, to_account, amount)

-- Update daily transfer total
redis.call('INCRBYFLOAT', daily_key, amount)
redis.call('EXPIRE', daily_key, 86400)  -- Expire at end of day

-- Record transaction
local transaction = cjson.encode({
    id = transaction_id,
    from = from_account,
    to = to_account,
    amount = amount,
    timestamp = timestamp,
    from_balance_after = from_balance - amount,
    to_balance_after = to_balance + amount
})
redis.call('ZADD', transactions_key, timestamp, transaction)

-- Keep only last 30 days of transactions
local cutoff = timestamp - (30 * 86400 * 1000)
redis.call('ZREMRANGEBYSCORE', transactions_key, 0, cutoff)

return cjson.encode({
    success = true,
    transaction_id = transaction_id,
    from_balance = from_balance - amount,
    to_balance = to_balance + amount
})
```

## Conditional Update Patterns

### Optimistic Locking with Version Numbers

```lua
-- update_with_version.lua
-- Update a record only if version matches (optimistic locking)

local key = KEYS[1]
local expected_version = tonumber(ARGV[1])
local new_data = ARGV[2]

-- Get current version
local current = redis.call('HGETALL', key)
local current_version = 0
local data = {}

for i = 1, #current, 2 do
    local field = current[i]
    local value = current[i + 1]
    if field == '_version' then
        current_version = tonumber(value)
    else
        data[field] = value
    end
end

-- Check version
if current_version ~= expected_version then
    return cjson.encode({
        success = false,
        error = 'VERSION_MISMATCH',
        expected = expected_version,
        actual = current_version
    })
end

-- Parse new data
local new_fields = cjson.decode(new_data)
for field, value in pairs(new_fields) do
    data[field] = value
end

-- Update with new version
local new_version = current_version + 1
redis.call('DEL', key)

for field, value in pairs(data) do
    redis.call('HSET', key, field, value)
end
redis.call('HSET', key, '_version', new_version)

return cjson.encode({
    success = true,
    version = new_version
})
```

Python implementation:

```python
class VersionedRecord:
    """Record with optimistic locking using versions"""

    UPDATE_SCRIPT = """
    local key = KEYS[1]
    local expected_version = tonumber(ARGV[1])
    local new_data = ARGV[2]

    local current = redis.call('HGETALL', key)
    local current_version = 0

    for i = 1, #current, 2 do
        if current[i] == '_version' then
            current_version = tonumber(current[i + 1])
        end
    end

    if current_version ~= expected_version then
        return cjson.encode({
            success = false,
            error = 'VERSION_MISMATCH',
            expected = expected_version,
            actual = current_version
        })
    end

    local new_fields = cjson.decode(new_data)
    for field, value in pairs(new_fields) do
        redis.call('HSET', key, field, tostring(value))
    end
    redis.call('HSET', key, '_version', current_version + 1)

    return cjson.encode({success = true, version = current_version + 1})
    """

    def __init__(self, redis_client, key):
        self.redis = redis_client
        self.key = key
        self._update = redis_client.register_script(self.UPDATE_SCRIPT)

    def create(self, data):
        """Create a new record"""
        self.redis.hset(self.key, mapping={**data, '_version': 0})

    def get(self):
        """Get record with version"""
        data = self.redis.hgetall(self.key)
        if not data:
            return None, None
        version = int(data.pop('_version', 0))
        return data, version

    def update(self, version, updates, max_retries=3):
        """Update record with optimistic locking"""
        for attempt in range(max_retries):
            result = self._update(
                keys=[self.key],
                args=[version, json.dumps(updates)]
            )
            result = json.loads(result)

            if result['success']:
                return result['version']
            elif result['error'] == 'VERSION_MISMATCH':
                # Retry with current version
                _, version = self.get()
                continue
            else:
                raise Exception(result['error'])

        raise Exception('Max retries exceeded')


# Usage
r = redis.Redis(decode_responses=True)
record = VersionedRecord(r, 'user:123')

# Create
record.create({'name': 'John', 'email': 'john@example.com'})

# Read
data, version = record.get()
print(f"Data: {data}, Version: {version}")

# Update (will fail if version changed)
new_version = record.update(version, {'email': 'john.doe@example.com'})
print(f"Updated to version: {new_version}")
```

### State Machine Transitions

```lua
-- state_transition.lua
-- Atomic state machine transition with validation

local entity_key = KEYS[1]
local history_key = KEYS[2]

local expected_state = ARGV[1]
local new_state = ARGV[2]
local transition_data = ARGV[3]
local timestamp = ARGV[4]

-- Define valid transitions
local valid_transitions = {
    ['pending'] = {'approved', 'rejected'},
    ['approved'] = {'processing', 'cancelled'},
    ['processing'] = {'completed', 'failed'},
    ['rejected'] = {},
    ['cancelled'] = {},
    ['completed'] = {},
    ['failed'] = {'processing'}  -- Can retry
}

-- Get current state
local current_state = redis.call('HGET', entity_key, 'state')
if not current_state then
    return cjson.encode({
        success = false,
        error = 'ENTITY_NOT_FOUND'
    })
end

-- Verify expected state
if current_state ~= expected_state then
    return cjson.encode({
        success = false,
        error = 'STATE_MISMATCH',
        expected = expected_state,
        actual = current_state
    })
end

-- Check if transition is valid
local allowed = valid_transitions[current_state] or {}
local is_valid = false
for _, state in ipairs(allowed) do
    if state == new_state then
        is_valid = true
        break
    end
end

if not is_valid then
    return cjson.encode({
        success = false,
        error = 'INVALID_TRANSITION',
        from = current_state,
        to = new_state,
        allowed = allowed
    })
end

-- Perform transition
redis.call('HSET', entity_key, 'state', new_state)
redis.call('HSET', entity_key, 'updated_at', timestamp)

-- Record in history
local history_entry = cjson.encode({
    from = current_state,
    to = new_state,
    timestamp = timestamp,
    data = transition_data
})
redis.call('RPUSH', history_key, history_entry)

return cjson.encode({
    success = true,
    previous_state = current_state,
    new_state = new_state
})
```

## Inventory Management Patterns

### Reserve and Commit Pattern

```lua
-- reserve_inventory.lua
-- Reserve inventory with timeout

local inventory_key = KEYS[1]      -- Hash: product_id -> available
local reserved_key = KEYS[2]       -- Hash: product_id -> reserved
local reservations_key = KEYS[3]   -- Hash: reservation_id -> details

local reservation_id = ARGV[1]
local product_id = ARGV[2]
local quantity = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])  -- Reservation timeout in seconds
local timestamp = tonumber(ARGV[5])

-- Check available inventory
local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
local reserved = tonumber(redis.call('HGET', reserved_key, product_id) or 0)
local actual_available = available - reserved

if actual_available < quantity then
    return cjson.encode({
        success = false,
        error = 'INSUFFICIENT_INVENTORY',
        available = actual_available,
        requested = quantity
    })
end

-- Create reservation
redis.call('HINCRBY', reserved_key, product_id, quantity)

local reservation = cjson.encode({
    id = reservation_id,
    product_id = product_id,
    quantity = quantity,
    timestamp = timestamp,
    expires = timestamp + (ttl * 1000)
})
redis.call('HSET', reservations_key, reservation_id, reservation)

-- Set expiration key for this reservation
local expiry_key = 'reservation_expiry:' .. reservation_id
redis.call('SETEX', expiry_key, ttl, product_id .. ':' .. quantity)

return cjson.encode({
    success = true,
    reservation_id = reservation_id,
    expires_in = ttl
})
```

```lua
-- commit_reservation.lua
-- Commit a reservation (finalize purchase)

local inventory_key = KEYS[1]
local reserved_key = KEYS[2]
local reservations_key = KEYS[3]
local sales_key = KEYS[4]

local reservation_id = ARGV[1]
local timestamp = ARGV[2]

-- Get reservation
local reservation_data = redis.call('HGET', reservations_key, reservation_id)
if not reservation_data then
    return cjson.encode({
        success = false,
        error = 'RESERVATION_NOT_FOUND'
    })
end

local reservation = cjson.decode(reservation_data)

-- Check if expired
if tonumber(timestamp) > reservation.expires then
    return cjson.encode({
        success = false,
        error = 'RESERVATION_EXPIRED'
    })
end

-- Commit: reduce actual inventory, remove from reserved
redis.call('HINCRBY', inventory_key, reservation.product_id, -reservation.quantity)
redis.call('HINCRBY', reserved_key, reservation.product_id, -reservation.quantity)

-- Record sale
redis.call('HINCRBY', sales_key, reservation.product_id, reservation.quantity)

-- Remove reservation
redis.call('HDEL', reservations_key, reservation_id)
redis.call('DEL', 'reservation_expiry:' .. reservation_id)

return cjson.encode({
    success = true,
    product_id = reservation.product_id,
    quantity = reservation.quantity
})
```

```lua
-- cancel_reservation.lua
-- Cancel a reservation (release inventory)

local reserved_key = KEYS[1]
local reservations_key = KEYS[2]

local reservation_id = ARGV[1]

-- Get reservation
local reservation_data = redis.call('HGET', reservations_key, reservation_id)
if not reservation_data then
    return cjson.encode({
        success = false,
        error = 'RESERVATION_NOT_FOUND'
    })
end

local reservation = cjson.decode(reservation_data)

-- Release reserved inventory
redis.call('HINCRBY', reserved_key, reservation.product_id, -reservation.quantity)

-- Remove reservation
redis.call('HDEL', reservations_key, reservation_id)
redis.call('DEL', 'reservation_expiry:' .. reservation_id)

return cjson.encode({
    success = true,
    product_id = reservation.product_id,
    quantity_released = reservation.quantity
})
```

Complete Python implementation:

```python
import redis
import json
import uuid
import time

class InventoryManager:
    """Manage inventory with reservations"""

    RESERVE_SCRIPT = """
    local inventory_key = KEYS[1]
    local reserved_key = KEYS[2]
    local reservations_key = KEYS[3]

    local reservation_id = ARGV[1]
    local product_id = ARGV[2]
    local quantity = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])
    local timestamp = tonumber(ARGV[5])

    local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
    local reserved = tonumber(redis.call('HGET', reserved_key, product_id) or 0)
    local actual_available = available - reserved

    if actual_available < quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_INVENTORY',
            available = actual_available,
            requested = quantity
        })
    end

    redis.call('HINCRBY', reserved_key, product_id, quantity)

    local reservation = cjson.encode({
        id = reservation_id,
        product_id = product_id,
        quantity = quantity,
        timestamp = timestamp,
        expires = timestamp + (ttl * 1000)
    })
    redis.call('HSET', reservations_key, reservation_id, reservation)
    redis.call('SETEX', 'reservation_expiry:' .. reservation_id, ttl, product_id .. ':' .. quantity)

    return cjson.encode({success = true, reservation_id = reservation_id, expires_in = ttl})
    """

    COMMIT_SCRIPT = """
    local inventory_key = KEYS[1]
    local reserved_key = KEYS[2]
    local reservations_key = KEYS[3]
    local sales_key = KEYS[4]

    local reservation_id = ARGV[1]
    local timestamp = tonumber(ARGV[2])

    local reservation_data = redis.call('HGET', reservations_key, reservation_id)
    if not reservation_data then
        return cjson.encode({success = false, error = 'RESERVATION_NOT_FOUND'})
    end

    local reservation = cjson.decode(reservation_data)

    if timestamp > reservation.expires then
        return cjson.encode({success = false, error = 'RESERVATION_EXPIRED'})
    end

    redis.call('HINCRBY', inventory_key, reservation.product_id, -reservation.quantity)
    redis.call('HINCRBY', reserved_key, reservation.product_id, -reservation.quantity)
    redis.call('HINCRBY', sales_key, reservation.product_id, reservation.quantity)
    redis.call('HDEL', reservations_key, reservation_id)
    redis.call('DEL', 'reservation_expiry:' .. reservation_id)

    return cjson.encode({
        success = true,
        product_id = reservation.product_id,
        quantity = reservation.quantity
    })
    """

    CANCEL_SCRIPT = """
    local reserved_key = KEYS[1]
    local reservations_key = KEYS[2]

    local reservation_id = ARGV[1]

    local reservation_data = redis.call('HGET', reservations_key, reservation_id)
    if not reservation_data then
        return cjson.encode({success = false, error = 'RESERVATION_NOT_FOUND'})
    end

    local reservation = cjson.decode(reservation_data)

    redis.call('HINCRBY', reserved_key, reservation.product_id, -reservation.quantity)
    redis.call('HDEL', reservations_key, reservation_id)
    redis.call('DEL', 'reservation_expiry:' .. reservation_id)

    return cjson.encode({
        success = true,
        product_id = reservation.product_id,
        quantity_released = reservation.quantity
    })
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._reserve = redis_client.register_script(self.RESERVE_SCRIPT)
        self._commit = redis_client.register_script(self.COMMIT_SCRIPT)
        self._cancel = redis_client.register_script(self.CANCEL_SCRIPT)

    def add_inventory(self, product_id, quantity):
        """Add inventory for a product"""
        self.redis.hincrby('inventory', product_id, quantity)

    def get_available(self, product_id):
        """Get available inventory (excluding reserved)"""
        available = int(self.redis.hget('inventory', product_id) or 0)
        reserved = int(self.redis.hget('reserved', product_id) or 0)
        return available - reserved

    def reserve(self, product_id, quantity, ttl_seconds=300):
        """Reserve inventory for a product"""
        reservation_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)

        result = self._reserve(
            keys=['inventory', 'reserved', 'reservations'],
            args=[reservation_id, product_id, quantity, ttl_seconds, timestamp]
        )
        return json.loads(result)

    def commit(self, reservation_id):
        """Commit a reservation (finalize purchase)"""
        timestamp = int(time.time() * 1000)
        result = self._commit(
            keys=['inventory', 'reserved', 'reservations', 'sales'],
            args=[reservation_id, timestamp]
        )
        return json.loads(result)

    def cancel(self, reservation_id):
        """Cancel a reservation"""
        result = self._cancel(
            keys=['reserved', 'reservations'],
            args=[reservation_id]
        )
        return json.loads(result)


# Usage example
r = redis.Redis(decode_responses=True)
inventory = InventoryManager(r)

# Add initial inventory
inventory.add_inventory('SKU-001', 100)

# Reserve some inventory
reserve_result = inventory.reserve('SKU-001', 5, ttl_seconds=300)
print(f"Reserve result: {reserve_result}")

if reserve_result['success']:
    reservation_id = reserve_result['reservation_id']

    # Later, commit or cancel
    # commit_result = inventory.commit(reservation_id)
    # or
    # cancel_result = inventory.cancel(reservation_id)

print(f"Available after reservation: {inventory.get_available('SKU-001')}")
```

## Shopping Cart with Atomic Operations

```lua
-- cart_operations.lua
-- Atomic shopping cart operations

local cart_key = KEYS[1]       -- Hash: product_id -> quantity
local prices_key = KEYS[2]     -- Hash: product_id -> price
local inventory_key = KEYS[3]  -- Hash: product_id -> available

local operation = ARGV[1]
local product_id = ARGV[2]
local quantity = tonumber(ARGV[3] or 1)

if operation == 'add' then
    -- Check inventory
    local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
    local in_cart = tonumber(redis.call('HGET', cart_key, product_id) or 0)

    if available < in_cart + quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            available = available,
            in_cart = in_cart,
            requested = quantity
        })
    end

    -- Add to cart
    local new_quantity = redis.call('HINCRBY', cart_key, product_id, quantity)
    redis.call('EXPIRE', cart_key, 86400)  -- 24 hour expiry

    return cjson.encode({success = true, quantity = new_quantity})

elseif operation == 'remove' then
    local current = tonumber(redis.call('HGET', cart_key, product_id) or 0)
    if current <= quantity then
        redis.call('HDEL', cart_key, product_id)
        return cjson.encode({success = true, quantity = 0})
    else
        local new_quantity = redis.call('HINCRBY', cart_key, product_id, -quantity)
        return cjson.encode({success = true, quantity = new_quantity})
    end

elseif operation == 'set' then
    local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
    if quantity > available then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            available = available
        })
    end

    if quantity <= 0 then
        redis.call('HDEL', cart_key, product_id)
    else
        redis.call('HSET', cart_key, product_id, quantity)
    end
    redis.call('EXPIRE', cart_key, 86400)
    return cjson.encode({success = true, quantity = quantity})

elseif operation == 'clear' then
    redis.call('DEL', cart_key)
    return cjson.encode({success = true})

elseif operation == 'get' then
    local cart = redis.call('HGETALL', cart_key)
    local items = {}
    local total = 0

    for i = 1, #cart, 2 do
        local pid = cart[i]
        local qty = tonumber(cart[i + 1])
        local price = tonumber(redis.call('HGET', prices_key, pid) or 0)
        local subtotal = price * qty

        table.insert(items, {
            product_id = pid,
            quantity = qty,
            price = price,
            subtotal = subtotal
        })
        total = total + subtotal
    end

    return cjson.encode({
        success = true,
        items = items,
        total = total
    })
end

return cjson.encode({success = false, error = 'UNKNOWN_OPERATION'})
```

## Best Practices for Business Logic in Lua

### 1. Validate Early, Fail Fast

```lua
-- Always validate inputs at the start
if not ARGV[1] or ARGV[1] == '' then
    return cjson.encode({success = false, error = 'MISSING_PARAMETER'})
end

local amount = tonumber(ARGV[1])
if not amount or amount <= 0 then
    return cjson.encode({success = false, error = 'INVALID_AMOUNT'})
end
```

### 2. Use Consistent Return Formats

```lua
-- Always return consistent JSON structure
-- Success case
return cjson.encode({
    success = true,
    data = result_data
})

-- Error case
return cjson.encode({
    success = false,
    error = 'ERROR_CODE',
    message = 'Human readable message'
})
```

### 3. Handle Edge Cases

```lua
-- Handle missing data gracefully
local value = redis.call('GET', key)
if not value then
    value = default_value
end

-- Handle type conversions
local number = tonumber(value or 0)
```

### 4. Limit Script Complexity

Keep scripts focused and break complex logic into multiple scripts if needed.

## Conclusion

Redis Lua scripts are powerful tools for implementing complex business logic atomically. Key takeaways:

- Use Lua scripts for multi-key transactions that must be atomic
- Implement proper validation and error handling
- Use consistent return formats for easier client-side handling
- Consider patterns like reservations for inventory management
- Use optimistic locking with versions for concurrent updates
- Break complex logic into multiple focused scripts

By mastering these patterns, you can build robust, scalable applications that handle complex business requirements with the performance and reliability Redis provides.
