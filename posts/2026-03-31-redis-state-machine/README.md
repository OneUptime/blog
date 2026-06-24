# How to Implement a State Machine with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, State Machine, Design Pattern

Description: Learn how to implement a distributed state machine with Redis using atomic transitions, state history tracking, and concurrent update protection with optimistic locking.

---

State machines are a natural fit for Redis: transitions must be atomic, state must be shared across multiple application instances, and you need fast reads. Redis's atomic operations make implementing safe transitions straightforward.

## Define States and Transitions

```python
from enum import Enum
from typing import Set, Dict

class OrderState(Enum):
    PENDING = "pending"
    PAYMENT_PROCESSING = "payment_processing"
    PAID = "paid"
    FULFILLMENT = "fulfillment"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

# Allowed transitions: current_state -> set of valid next states
TRANSITIONS: Dict[OrderState, Set[OrderState]] = {
    OrderState.PENDING: {OrderState.PAYMENT_PROCESSING, OrderState.CANCELLED},
    OrderState.PAYMENT_PROCESSING: {OrderState.PAID, OrderState.CANCELLED},
    OrderState.PAID: {OrderState.FULFILLMENT, OrderState.REFUNDED},
    OrderState.FULFILLMENT: {OrderState.SHIPPED},
    OrderState.SHIPPED: {OrderState.DELIVERED},
    OrderState.DELIVERED: {OrderState.REFUNDED},
    OrderState.CANCELLED: set(),
    OrderState.REFUNDED: set(),
}
```

## Atomic Transition with Lua Script

Lua scripts run atomically in Redis, preventing race conditions in concurrent transitions:

```python
import redis
import time

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

TRANSITION_SCRIPT = """
local key = KEYS[1]
local history_key = KEYS[2]
local current = redis.call('HGET', key, 'state')
local expected_current = ARGV[1]
local new_state = ARGV[2]
local timestamp = ARGV[3]

if current == false then
    return redis.error_reply('ERR state not found')
end

if current ~= expected_current then
    return redis.error_reply('ERR invalid transition: current state is ' .. current)
end

redis.call('HSET', key, 'state', new_state, 'updated_at', timestamp)
redis.call('RPUSH', history_key, timestamp .. ':' .. current .. '->' .. new_state)
redis.call('EXPIRE', history_key, 2592000)  -- 30 days
return 'OK'
"""

transition_script = client.register_script(TRANSITION_SCRIPT)

def transition(entity_id: str, from_state: OrderState, to_state: OrderState) -> bool:
    # Validate transition is allowed
    allowed = TRANSITIONS.get(from_state, set())
    if to_state not in allowed:
        raise ValueError(f"Invalid transition: {from_state.value} -> {to_state.value}")

    key = f"order:{entity_id}"
    history_key = f"order:{entity_id}:history"
    ts = str(time.time())

    try:
        transition_script(
            keys=[key, history_key],
            args=[from_state.value, to_state.value, ts],
        )
        return True
    except redis.ResponseError as e:
        raise ValueError(str(e))
```

## Initialize and Read State

```python
def create_order(order_id: str) -> dict:
    key = f"order:{order_id}"
    ts = str(time.time())
    client.hset(key, mapping={
        "order_id": order_id,
        "state": OrderState.PENDING.value,
        "created_at": ts,
        "updated_at": ts,
    })
    return client.hgetall(key)

def get_state(order_id: str) -> OrderState:
    state_str = client.hget(f"order:{order_id}", "state")
    if state_str is None:
        raise KeyError(f"Order {order_id} not found")
    return OrderState(state_str)

def get_history(order_id: str) -> list:
    return client.lrange(f"order:{order_id}:history", 0, -1)
```

## Example Flow

```python
order_id = "ORD-12345"
create_order(order_id)

# Process payment
transition(order_id, OrderState.PENDING, OrderState.PAYMENT_PROCESSING)
transition(order_id, OrderState.PAYMENT_PROCESSING, OrderState.PAID)

# Fulfill
transition(order_id, OrderState.PAID, OrderState.FULFILLMENT)
transition(order_id, OrderState.FULFILLMENT, OrderState.SHIPPED)

print(get_state(order_id))    # OrderState.SHIPPED
print(get_history(order_id))  # List of timestamped transitions
```

## Summary

Redis state machines use Lua scripts for atomic transitions that prevent race conditions in distributed deployments. Store state in Redis Hashes for fast reads, enforce valid transitions in application logic before calling Redis, and maintain a history list for audit trails. This pattern scales across multiple application instances without distributed locks because Lua executes atomically.
