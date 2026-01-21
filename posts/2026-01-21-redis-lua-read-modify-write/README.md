# How to Implement Atomic Read-Modify-Write with Redis Lua

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Atomic Operations, Compare-and-Swap, Inventory, Transactions, Backend

Description: A comprehensive guide to implementing atomic read-modify-write operations with Redis Lua scripts, covering compare-and-swap patterns, inventory management, counters with limits, and best practices for concurrent data access.

---

Read-modify-write operations are fundamental to many applications but are inherently challenging in concurrent environments. This guide covers how to implement atomic read-modify-write patterns using Redis Lua scripts, ensuring data consistency without race conditions.

## Understanding Read-Modify-Write

A read-modify-write (RMW) operation consists of three steps:
1. **Read**: Get the current value
2. **Modify**: Compute the new value based on the current value
3. **Write**: Store the new value

Without atomicity, concurrent RMW operations can lead to race conditions:

```
Time    Thread A          Thread B          Value
0       Read value (10)                     10
1                         Read value (10)   10
2       Add 5 (15)                          10
3       Write (15)                          15
4                         Add 3 (13)        15
5                         Write (13)        13  <- Lost update!
```

Redis Lua scripts solve this by executing atomically.

## Basic Compare-and-Swap (CAS)

### Simple CAS Pattern

```lua
-- cas_simple.lua
-- Update value only if current matches expected

local key = KEYS[1]
local expected = ARGV[1]
local new_value = ARGV[2]

local current = redis.call('GET', key)

-- Handle nil comparison
if current == false then
    current = nil
end
if expected == '' then
    expected = nil
end

if current == expected then
    if new_value == '' then
        redis.call('DEL', key)
    else
        redis.call('SET', key, new_value)
    end
    return 1  -- Success
end

return 0  -- Failed, value changed
```

Python implementation:

```python
import redis
import time

class CASOperations:
    """Compare-and-swap operations using Lua"""

    CAS_SCRIPT = """
    local key = KEYS[1]
    local expected = ARGV[1]
    local new_value = ARGV[2]

    local current = redis.call('GET', key)

    if current == false then current = nil end
    if expected == '' then expected = nil end

    if current == expected then
        if new_value == '' then
            redis.call('DEL', key)
        else
            redis.call('SET', key, new_value)
        end
        return 1
    end
    return 0
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._cas = redis_client.register_script(self.CAS_SCRIPT)

    def compare_and_swap(self, key, expected, new_value, max_retries=10):
        """
        Atomically update value if it matches expected.
        Returns True if successful, False otherwise.
        """
        expected_str = '' if expected is None else str(expected)
        new_value_str = '' if new_value is None else str(new_value)

        result = self._cas(keys=[key], args=[expected_str, new_value_str])
        return result == 1

    def update_with_retry(self, key, update_func, max_retries=10):
        """
        Read value, apply update function, write back.
        Retries on concurrent modification.
        """
        for attempt in range(max_retries):
            current = self.redis.get(key)
            new_value = update_func(current)

            if self.compare_and_swap(key, current, new_value):
                return new_value

            # Exponential backoff
            time.sleep(0.001 * (2 ** attempt))

        raise Exception(f"CAS failed after {max_retries} retries")


# Usage
r = redis.Redis(decode_responses=True)
cas = CASOperations(r)

# Simple CAS
r.set('counter', '10')
success = cas.compare_and_swap('counter', '10', '15')
print(f"CAS successful: {success}")

# Update with retry
def increment(value):
    return str(int(value or 0) + 1)

new_value = cas.update_with_retry('counter', increment)
print(f"New value: {new_value}")
```

### Versioned CAS

```lua
-- cas_versioned.lua
-- CAS with version numbers for optimistic locking

local key = KEYS[1]
local expected_version = tonumber(ARGV[1])
local new_value = ARGV[2]

-- Get current value and version
local current = redis.call('HGETALL', key)
local current_value = nil
local current_version = 0

for i = 1, #current, 2 do
    if current[i] == 'value' then
        current_value = current[i + 1]
    elseif current[i] == 'version' then
        current_version = tonumber(current[i + 1])
    end
end

-- Check version
if current_version ~= expected_version then
    return cjson.encode({
        success = false,
        error = 'VERSION_MISMATCH',
        expected_version = expected_version,
        actual_version = current_version,
        current_value = current_value
    })
end

-- Update with new version
local new_version = current_version + 1
redis.call('HSET', key, 'value', new_value, 'version', new_version)

return cjson.encode({
    success = true,
    version = new_version,
    value = new_value
})
```

## Inventory Management

### Safe Inventory Decrement

```lua
-- inventory_decrement.lua
-- Safely decrement inventory, preventing overselling

local inventory_key = KEYS[1]
local product_id = ARGV[1]
local quantity = tonumber(ARGV[2])
local order_id = ARGV[3]

-- Get current stock
local current_stock = tonumber(redis.call('HGET', inventory_key, product_id) or 0)

-- Check availability
if current_stock < quantity then
    return cjson.encode({
        success = false,
        error = 'INSUFFICIENT_STOCK',
        available = current_stock,
        requested = quantity
    })
end

-- Decrement atomically
local new_stock = redis.call('HINCRBY', inventory_key, product_id, -quantity)

-- Record the transaction
local transaction_key = 'inventory_transactions:' .. product_id
local transaction = cjson.encode({
    order_id = order_id,
    quantity = -quantity,
    stock_before = current_stock,
    stock_after = new_stock,
    timestamp = redis.call('TIME')[1]
})
redis.call('LPUSH', transaction_key, transaction)
redis.call('LTRIM', transaction_key, 0, 999)  -- Keep last 1000

return cjson.encode({
    success = true,
    previous_stock = current_stock,
    new_stock = new_stock,
    quantity_deducted = quantity
})
```

### Multi-Product Inventory Update

```lua
-- inventory_multi_update.lua
-- Update multiple product inventories atomically (for orders)

local inventory_key = KEYS[1]
local orders_key = KEYS[2]

local order_id = ARGV[1]
local timestamp = ARGV[2]
-- Products come as: product_id, quantity, product_id, quantity, ...

-- First pass: validate all products have sufficient stock
local items = {}
for i = 3, #ARGV, 2 do
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

    table.insert(items, {
        product_id = product_id,
        quantity = quantity,
        available = available
    })
end

-- Second pass: deduct all items (we know we have sufficient stock)
local deducted = {}
for _, item in ipairs(items) do
    local new_stock = redis.call('HINCRBY', inventory_key, item.product_id, -item.quantity)
    table.insert(deducted, {
        product_id = item.product_id,
        quantity = item.quantity,
        previous_stock = item.available,
        new_stock = new_stock
    })
end

-- Record order
local order_record = cjson.encode({
    order_id = order_id,
    timestamp = timestamp,
    items = deducted
})
redis.call('HSET', orders_key, order_id, order_record)

return cjson.encode({
    success = true,
    order_id = order_id,
    items = deducted
})
```

Python implementation:

```python
import redis
import json
import uuid
import time

class InventoryManager:
    """Atomic inventory management with Lua"""

    DECREMENT_SCRIPT = """
    local inventory_key = KEYS[1]
    local product_id = ARGV[1]
    local quantity = tonumber(ARGV[2])
    local order_id = ARGV[3]

    local current_stock = tonumber(redis.call('HGET', inventory_key, product_id) or 0)

    if current_stock < quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            available = current_stock,
            requested = quantity
        })
    end

    local new_stock = redis.call('HINCRBY', inventory_key, product_id, -quantity)

    return cjson.encode({
        success = true,
        previous_stock = current_stock,
        new_stock = new_stock
    })
    """

    MULTI_UPDATE_SCRIPT = """
    local inventory_key = KEYS[1]
    local orders_key = KEYS[2]

    local order_id = ARGV[1]
    local timestamp = ARGV[2]

    local items = {}
    for i = 3, #ARGV, 2 do
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

        table.insert(items, {
            product_id = product_id,
            quantity = quantity,
            available = available
        })
    end

    local deducted = {}
    for _, item in ipairs(items) do
        local new_stock = redis.call('HINCRBY', inventory_key, item.product_id, -item.quantity)
        table.insert(deducted, {
            product_id = item.product_id,
            quantity = item.quantity,
            new_stock = new_stock
        })
    end

    return cjson.encode({
        success = true,
        order_id = order_id,
        items = deducted
    })
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._decrement = redis_client.register_script(self.DECREMENT_SCRIPT)
        self._multi_update = redis_client.register_script(self.MULTI_UPDATE_SCRIPT)

    def set_stock(self, product_id, quantity):
        """Set initial stock for a product"""
        self.redis.hset('inventory', product_id, quantity)

    def get_stock(self, product_id):
        """Get current stock"""
        return int(self.redis.hget('inventory', product_id) or 0)

    def decrement(self, product_id, quantity, order_id=None):
        """Safely decrement stock for a single product"""
        order_id = order_id or str(uuid.uuid4())
        result = self._decrement(
            keys=['inventory'],
            args=[product_id, quantity, order_id]
        )
        return json.loads(result)

    def process_order(self, items):
        """
        Process order with multiple items atomically.

        Args:
            items: List of (product_id, quantity) tuples

        Returns:
            dict with success status and details
        """
        order_id = str(uuid.uuid4())
        timestamp = str(int(time.time() * 1000))

        # Flatten items for args
        args = [order_id, timestamp]
        for product_id, quantity in items:
            args.extend([product_id, str(quantity)])

        result = self._multi_update(
            keys=['inventory', 'orders'],
            args=args
        )
        return json.loads(result)


# Usage example
r = redis.Redis(decode_responses=True)
inventory = InventoryManager(r)

# Set initial stock
inventory.set_stock('PROD-001', 100)
inventory.set_stock('PROD-002', 50)

# Single product decrement
result = inventory.decrement('PROD-001', 5)
print(f"Decrement result: {result}")

# Multi-product order
order_result = inventory.process_order([
    ('PROD-001', 2),
    ('PROD-002', 1)
])
print(f"Order result: {order_result}")
```

## Counters with Limits

### Bounded Counter

```lua
-- bounded_counter.lua
-- Counter that respects minimum and maximum bounds

local key = KEYS[1]
local operation = ARGV[1]  -- 'incr' or 'decr'
local amount = tonumber(ARGV[2]) or 1
local min_value = tonumber(ARGV[3]) or 0
local max_value = tonumber(ARGV[4])  -- nil means no max

local current = tonumber(redis.call('GET', key) or 0)
local new_value

if operation == 'incr' then
    new_value = current + amount
    if max_value and new_value > max_value then
        return cjson.encode({
            success = false,
            error = 'MAX_EXCEEDED',
            current = current,
            max = max_value
        })
    end
elseif operation == 'decr' then
    new_value = current - amount
    if new_value < min_value then
        return cjson.encode({
            success = false,
            error = 'MIN_EXCEEDED',
            current = current,
            min = min_value
        })
    end
else
    return cjson.encode({
        success = false,
        error = 'INVALID_OPERATION'
    })
end

redis.call('SET', key, new_value)
return cjson.encode({
    success = true,
    previous = current,
    new = new_value
})
```

### Counter with Daily Reset

```lua
-- daily_counter.lua
-- Counter that resets daily

local counter_key = KEYS[1]
local limit_key = KEYS[2]

local operation = ARGV[1]
local amount = tonumber(ARGV[2]) or 1
local daily_limit = tonumber(ARGV[3])
local current_day = ARGV[4]  -- YYYY-MM-DD format

-- Check if counter needs reset
local last_day = redis.call('HGET', counter_key, 'day')
local current_count = 0

if last_day ~= current_day then
    -- Reset for new day
    redis.call('HSET', counter_key, 'day', current_day, 'count', 0)
    current_count = 0
else
    current_count = tonumber(redis.call('HGET', counter_key, 'count') or 0)
end

if operation == 'incr' then
    local new_count = current_count + amount

    if daily_limit and new_count > daily_limit then
        return cjson.encode({
            success = false,
            error = 'DAILY_LIMIT_EXCEEDED',
            current = current_count,
            limit = daily_limit,
            remaining = daily_limit - current_count
        })
    end

    redis.call('HSET', counter_key, 'count', new_count)
    return cjson.encode({
        success = true,
        count = new_count,
        remaining = daily_limit and (daily_limit - new_count) or nil
    })

elseif operation == 'get' then
    return cjson.encode({
        success = true,
        count = current_count,
        day = current_day,
        remaining = daily_limit and (daily_limit - current_count) or nil
    })
end

return cjson.encode({success = false, error = 'INVALID_OPERATION'})
```

## Balance and Wallet Operations

### Safe Transfer

```lua
-- transfer.lua
-- Atomically transfer balance between accounts

local accounts_key = KEYS[1]
local transactions_key = KEYS[2]

local from_account = ARGV[1]
local to_account = ARGV[2]
local amount = tonumber(ARGV[3])
local transaction_id = ARGV[4]
local timestamp = ARGV[5]

-- Validate amount
if amount <= 0 then
    return cjson.encode({
        success = false,
        error = 'INVALID_AMOUNT',
        message = 'Amount must be positive'
    })
end

-- Validate accounts are different
if from_account == to_account then
    return cjson.encode({
        success = false,
        error = 'SAME_ACCOUNT',
        message = 'Cannot transfer to same account'
    })
end

-- Get balances
local from_balance = tonumber(redis.call('HGET', accounts_key, from_account) or 0)
local to_balance = tonumber(redis.call('HGET', accounts_key, to_account))

-- Check if destination account exists (optional)
if to_balance == nil then
    -- Auto-create account with 0 balance, or return error
    to_balance = 0
end

-- Check sufficient balance
if from_balance < amount then
    return cjson.encode({
        success = false,
        error = 'INSUFFICIENT_FUNDS',
        available = from_balance,
        requested = amount
    })
end

-- Perform transfer
local new_from_balance = redis.call('HINCRBYFLOAT', accounts_key, from_account, -amount)
local new_to_balance = redis.call('HINCRBYFLOAT', accounts_key, to_account, amount)

-- Record transaction
local transaction = cjson.encode({
    id = transaction_id,
    type = 'transfer',
    from = from_account,
    to = to_account,
    amount = amount,
    from_balance_before = from_balance,
    from_balance_after = tonumber(new_from_balance),
    to_balance_before = to_balance,
    to_balance_after = tonumber(new_to_balance),
    timestamp = timestamp
})
redis.call('ZADD', transactions_key, timestamp, transaction)

-- Trim old transactions (keep last 30 days)
local cutoff = tonumber(timestamp) - (30 * 86400 * 1000)
redis.call('ZREMRANGEBYSCORE', transactions_key, 0, cutoff)

return cjson.encode({
    success = true,
    transaction_id = transaction_id,
    from_balance = tonumber(new_from_balance),
    to_balance = tonumber(new_to_balance)
})
```

### Balance Update with Audit

```lua
-- balance_update.lua
-- Update balance with full audit trail

local account_key = KEYS[1]
local audit_key = KEYS[2]

local operation = ARGV[1]  -- 'credit' or 'debit'
local amount = tonumber(ARGV[2])
local reference = ARGV[3]
local description = ARGV[4]
local timestamp = ARGV[5]

-- Validate
if amount <= 0 then
    return cjson.encode({success = false, error = 'INVALID_AMOUNT'})
end

local current_balance = tonumber(redis.call('GET', account_key) or 0)
local new_balance

if operation == 'credit' then
    new_balance = current_balance + amount
elseif operation == 'debit' then
    if current_balance < amount then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_FUNDS',
            balance = current_balance
        })
    end
    new_balance = current_balance - amount
else
    return cjson.encode({success = false, error = 'INVALID_OPERATION'})
end

-- Update balance
redis.call('SET', account_key, new_balance)

-- Create audit record
local audit_record = cjson.encode({
    operation = operation,
    amount = amount,
    reference = reference,
    description = description,
    balance_before = current_balance,
    balance_after = new_balance,
    timestamp = timestamp
})
redis.call('RPUSH', audit_key, audit_record)

return cjson.encode({
    success = true,
    balance = new_balance,
    operation = operation,
    amount = amount
})
```

## Advanced Patterns

### Conditional Multi-Key Update

```lua
-- conditional_update.lua
-- Update multiple keys only if all conditions are met

local condition_results = {}

-- Check all conditions first
for i = 1, #KEYS do
    local key = KEYS[i]
    local operator = ARGV[(i-1)*3 + 1]
    local compare_value = ARGV[(i-1)*3 + 2]
    local new_value = ARGV[(i-1)*3 + 3]

    local current = redis.call('GET', key)
    local passes = false

    if operator == 'eq' then
        passes = (current == compare_value)
    elseif operator == 'ne' then
        passes = (current ~= compare_value)
    elseif operator == 'gt' then
        passes = (tonumber(current or 0) > tonumber(compare_value))
    elseif operator == 'gte' then
        passes = (tonumber(current or 0) >= tonumber(compare_value))
    elseif operator == 'lt' then
        passes = (tonumber(current or 0) < tonumber(compare_value))
    elseif operator == 'lte' then
        passes = (tonumber(current or 0) <= tonumber(compare_value))
    elseif operator == 'exists' then
        passes = (current ~= false)
    elseif operator == 'not_exists' then
        passes = (current == false)
    end

    table.insert(condition_results, {
        key = key,
        current = current,
        operator = operator,
        compare_value = compare_value,
        new_value = new_value,
        passes = passes
    })
end

-- Check if all conditions pass
for _, result in ipairs(condition_results) do
    if not result.passes then
        return cjson.encode({
            success = false,
            error = 'CONDITION_FAILED',
            failed_key = result.key,
            operator = result.operator,
            expected = result.compare_value,
            actual = result.current
        })
    end
end

-- All conditions pass, apply updates
for _, result in ipairs(condition_results) do
    if result.new_value ~= '' then
        redis.call('SET', result.key, result.new_value)
    end
end

return cjson.encode({success = true, updates = #condition_results})
```

### Sequence Generator

```lua
-- sequence.lua
-- Generate sequential IDs with gap detection

local sequence_key = KEYS[1]
local gaps_key = KEYS[2]

local operation = ARGV[1]
local count = tonumber(ARGV[2]) or 1

if operation == 'next' then
    -- First try to fill gaps
    local gaps = redis.call('ZRANGE', gaps_key, 0, count - 1)

    if #gaps > 0 then
        -- Remove used gaps
        redis.call('ZREM', gaps_key, unpack(gaps))

        -- Get remaining if needed
        local remaining = count - #gaps
        if remaining > 0 then
            local start = redis.call('INCRBY', sequence_key, remaining)
            for i = 1, remaining do
                table.insert(gaps, start - remaining + i)
            end
        end

        return gaps
    end

    -- No gaps, get new sequence numbers
    local start = redis.call('INCRBY', sequence_key, count)
    local ids = {}
    for i = 1, count do
        table.insert(ids, start - count + i)
    end
    return ids

elseif operation == 'return' then
    -- Return IDs back to gap pool (e.g., on failed transaction)
    for i = 2, #ARGV do
        local id = tonumber(ARGV[i])
        if id then
            redis.call('ZADD', gaps_key, id, id)
        end
    end
    return redis.call('ZCARD', gaps_key)

elseif operation == 'current' then
    return tonumber(redis.call('GET', sequence_key) or 0)
end
```

## Best Practices

### 1. Always Validate Before Modify

```lua
-- Validate inputs
if not amount or amount <= 0 then
    return cjson.encode({success = false, error = 'INVALID_INPUT'})
end

-- Validate state
local current = tonumber(redis.call('GET', key) or 0)
if current < required then
    return cjson.encode({success = false, error = 'INSUFFICIENT'})
end

-- Then modify
redis.call('DECRBY', key, amount)
```

### 2. Return Comprehensive Results

```lua
-- Return both old and new values
return cjson.encode({
    success = true,
    previous_value = old_value,
    new_value = new_value,
    timestamp = timestamp
})
```

### 3. Use Consistent Error Handling

```lua
-- Use structured error responses
return cjson.encode({
    success = false,
    error = 'ERROR_CODE',
    message = 'Human readable message',
    details = {
        field = 'value'
    }
})
```

### 4. Include Audit Information

```lua
-- Record changes for debugging/compliance
local audit = cjson.encode({
    operation = 'transfer',
    actor = user_id,
    before = previous_state,
    after = new_state,
    timestamp = timestamp
})
redis.call('LPUSH', audit_key, audit)
```

## Conclusion

Atomic read-modify-write operations with Redis Lua scripts provide a powerful way to implement concurrent-safe business logic. Key takeaways:

- Use CAS patterns for optimistic locking scenarios
- Validate all conditions before making modifications
- Return comprehensive results including old and new values
- Include audit trails for sensitive operations
- Handle edge cases like negative balances or exceeded limits
- Keep scripts focused and well-tested

By mastering these patterns, you can build robust applications that handle concurrent access correctly and efficiently.
