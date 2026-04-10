# How to Use Redis Functions for Server-Side Business Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Business Logic, Server-Side, Architecture

Description: Learn how to implement reusable server-side business logic in Redis Functions to reduce round-trips, enforce invariants, and simplify application code.

---

Redis Functions let you move complex, multi-step operations to the server, reducing network round-trips and ensuring atomic execution. This is ideal for logic that must coordinate multiple Redis data structures consistently.

## Why Server-Side Logic in Redis

Without server-side logic, a rate limit check requires 3-4 round-trips:
1. GET current count
2. Check limit in application
3. INCR counter
4. EXPIRE if new key

With a Redis Function, that's one round-trip - and it's atomic.

## Example 1 - Inventory Management

Prevent overselling by atomically checking and decrementing inventory:

```lua
-- inventory_lib.lua
#!lua name=inventory

redis.register_function('reserve_item', function(keys, args)
    local inventory_key = keys[1]
    local reserved_key = keys[2]
    local item_id = args[1]
    local quantity = tonumber(args[2]) or 1
    local order_id = args[3]

    -- Check available stock
    local available = tonumber(redis.call('HGET', inventory_key, item_id)) or 0

    if available < quantity then
        return {0, available}  -- Insufficient stock
    end

    -- Atomically decrement inventory and record reservation
    redis.call('HINCRBY', inventory_key, item_id, -quantity)
    redis.call('HSET', reserved_key, order_id, quantity)

    return {1, available - quantity}  -- Success, remaining stock
end)

redis.register_function('release_reservation', function(keys, args)
    local inventory_key = keys[1]
    local reserved_key = keys[2]
    local item_id = args[1]
    local order_id = args[2]

    local reserved = tonumber(redis.call('HGET', reserved_key, order_id)) or 0
    if reserved == 0 then
        return 0  -- No reservation found
    end

    redis.call('HINCRBY', inventory_key, item_id, reserved)
    redis.call('HDEL', reserved_key, order_id)
    return reserved
end)
```

```bash
redis-cli FUNCTION LOAD "$(cat inventory_lib.lua)"

# Seed inventory
redis-cli HSET inventory:warehouse1 "SKU-001" 50

# Reserve 3 units for order 789
redis-cli FCALL reserve_item 2 inventory:warehouse1 reservations:SKU-001 SKU-001 3 order-789

# Release reservation
redis-cli FCALL release_reservation 2 inventory:warehouse1 reservations:SKU-001 SKU-001 order-789
```

## Example 2 - Leaderboard with Tier Assignment

Update a player's score and return their tier in one call:

```lua
-- leaderboard_lib.lua
#!lua name=leaderboard

redis.register_function('update_score', function(keys, args)
    local leaderboard_key = keys[1]
    local player_key = keys[2]
    local player_id = args[1]
    local points = tonumber(args[2]) or 0

    local new_score = redis.call('ZINCRBY', leaderboard_key, points, player_id)
    new_score = tonumber(new_score)

    -- Assign tier based on score
    local tier
    if new_score >= 10000 then
        tier = 'diamond'
    elseif new_score >= 5000 then
        tier = 'platinum'
    elseif new_score >= 1000 then
        tier = 'gold'
    elseif new_score >= 100 then
        tier = 'silver'
    else
        tier = 'bronze'
    end

    -- Store tier in player profile
    redis.call('HSET', player_key, 'tier', tier, 'score', new_score)

    return {new_score, tier}
end)
```

```python
import redis

r = redis.Redis()

def award_points(player_id: str, points: int):
    result = r.fcall("update_score", 2, "leaderboard:global", f"player:{player_id}", player_id, points)
    new_score, tier = result
    return {"score": new_score, "tier": tier.decode()}
```

## Example 3 - Session Management with Audit

Create a session and log the event atomically:

```lua
-- session_lib.lua
#!lua name=session

redis.register_function('create_session', function(keys, args)
    local session_key = keys[1]
    local audit_key = keys[2]
    local user_id = args[1]
    local token = args[2]
    local ttl = tonumber(args[3]) or 3600

    local now = redis.call('TIME')
    local timestamp = tonumber(now[1])

    -- Create session
    redis.call('HSET', session_key,
        'user_id', user_id,
        'token', token,
        'created_at', timestamp
    )
    redis.call('EXPIRE', session_key, ttl)

    -- Append audit log entry
    redis.call('RPUSH', audit_key, cjson.encode({
        action = 'login',
        user_id = user_id,
        timestamp = timestamp
    }))
    redis.call('LTRIM', audit_key, -1000, -1)  -- Keep last 1000 entries

    return 1
end)
```

## Enforcing Business Invariants

Functions are ideal for enforcing invariants that span multiple keys:

```lua
-- Always update both the value and its audit trail
-- Always check preconditions before writing
-- Always maintain consistency between related data structures
```

Because the function executes atomically, no other client can observe a partial state.

## Summary

Redis Functions enable server-side business logic that executes atomically, reducing network round-trips and enforcing data invariants. Implement operations like inventory reservation, leaderboard updates, and session creation as library functions that coordinate multiple Redis data structures in a single call. This moves complex coordination logic to the data layer, simplifying application code and eliminating race conditions.
