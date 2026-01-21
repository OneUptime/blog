# How to Implement Saga Pattern Coordination with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Saga Pattern, Distributed Transactions, Microservices, Compensation, Orchestration

Description: A comprehensive guide to implementing the Saga pattern for distributed transaction management using Redis for coordination, state management, and compensation handling.

---

The Saga pattern manages distributed transactions across microservices by breaking them into local transactions with compensation actions. Redis provides excellent coordination capabilities for implementing both orchestration and choreography-based sagas.

## Why Use Redis for Saga Coordination?

Redis offers key benefits for saga implementation:

- **Atomic state transitions**: Lua scripts ensure consistent state updates
- **Event pub/sub**: Coordinate saga steps across services
- **TTL for timeouts**: Automatic saga expiration handling
- **Streams for event log**: Durable event storage with consumer groups

## Saga Pattern Basics

```
Order Saga Example:
1. Create Order     -> Compensate: Cancel Order
2. Reserve Stock    -> Compensate: Release Stock
3. Process Payment  -> Compensate: Refund Payment
4. Ship Order       -> Compensate: Cancel Shipment
```

## Pattern 1: Orchestration-Based Saga

Implement a central orchestrator for saga coordination:

```python
import redis
import json
import uuid
import time
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum
import threading
import logging

logger = logging.getLogger(__name__)

class SagaStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"
    COMPENSATED = "compensated"

class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"
    SKIPPED = "skipped"

@dataclass
class SagaStep:
    name: str
    service: str
    action: str
    compensation: str
    status: str = StepStatus.PENDING.value
    result: Optional[Dict] = None
    error: Optional[str] = None

@dataclass
class Saga:
    saga_id: str
    saga_type: str
    status: str
    steps: List[Dict]
    context: Dict[str, Any]
    created_at: float
    updated_at: float
    current_step: int = 0
    error: Optional[str] = None

class SagaOrchestrator:
    def __init__(self, redis_client: redis.Redis, namespace: str = "saga"):
        self.redis = redis_client
        self.namespace = namespace
        self._step_handlers: Dict[str, Callable] = {}
        self._compensation_handlers: Dict[str, Callable] = {}
        self._running = False

    def _saga_key(self, saga_id: str) -> str:
        return f"{self.namespace}:{saga_id}"

    def _pending_key(self) -> str:
        return f"{self.namespace}:pending"

    def register_step(self, step_name: str,
                      handler: Callable[[Dict], Dict],
                      compensation: Callable[[Dict], None]):
        """Register step handler and compensation."""
        self._step_handlers[step_name] = handler
        self._compensation_handlers[step_name] = compensation

    def create_saga(self, saga_type: str, steps: List[SagaStep],
                    context: Dict[str, Any]) -> Saga:
        """Create a new saga."""
        saga_id = str(uuid.uuid4())
        now = time.time()

        saga = Saga(
            saga_id=saga_id,
            saga_type=saga_type,
            status=SagaStatus.PENDING.value,
            steps=[asdict(step) for step in steps],
            context=context,
            created_at=now,
            updated_at=now
        )

        # Store saga
        saga_key = self._saga_key(saga_id)
        self.redis.set(saga_key, json.dumps(asdict(saga)))

        # Add to pending queue
        self.redis.lpush(self._pending_key(), saga_id)

        # Publish saga created event
        self.redis.publish(
            f"{self.namespace}:events",
            json.dumps({
                "event": "saga_created",
                "saga_id": saga_id,
                "saga_type": saga_type
            })
        )

        logger.info(f"Created saga {saga_id} of type {saga_type}")
        return saga

    def get_saga(self, saga_id: str) -> Optional[Saga]:
        """Get saga by ID."""
        saga_key = self._saga_key(saga_id)
        data = self.redis.get(saga_key)

        if data:
            saga_dict = json.loads(data)
            return Saga(**saga_dict)
        return None

    def _update_saga(self, saga: Saga):
        """Update saga state in Redis."""
        saga.updated_at = time.time()
        saga_key = self._saga_key(saga.saga_id)
        self.redis.set(saga_key, json.dumps(asdict(saga)))

    def execute_saga(self, saga_id: str) -> bool:
        """Execute saga steps."""
        saga = self.get_saga(saga_id)
        if not saga:
            return False

        saga.status = SagaStatus.RUNNING.value
        self._update_saga(saga)

        try:
            # Execute each step in order
            for i in range(saga.current_step, len(saga.steps)):
                step = saga.steps[i]
                saga.current_step = i

                step['status'] = StepStatus.RUNNING.value
                self._update_saga(saga)

                step_name = step['name']
                handler = self._step_handlers.get(step_name)

                if not handler:
                    raise SagaError(f"No handler for step: {step_name}")

                try:
                    # Execute step
                    result = handler(saga.context)

                    step['status'] = StepStatus.COMPLETED.value
                    step['result'] = result

                    # Update context with result
                    saga.context[f"{step_name}_result"] = result
                    self._update_saga(saga)

                    logger.info(f"Saga {saga_id}: Step {step_name} completed")

                except Exception as e:
                    step['status'] = StepStatus.FAILED.value
                    step['error'] = str(e)
                    saga.error = str(e)
                    self._update_saga(saga)

                    logger.error(f"Saga {saga_id}: Step {step_name} failed: {e}")

                    # Start compensation
                    self._compensate(saga, i)
                    return False

            # All steps completed
            saga.status = SagaStatus.COMPLETED.value
            self._update_saga(saga)

            self.redis.publish(
                f"{self.namespace}:events",
                json.dumps({
                    "event": "saga_completed",
                    "saga_id": saga_id
                })
            )

            logger.info(f"Saga {saga_id} completed successfully")
            return True

        except Exception as e:
            saga.status = SagaStatus.FAILED.value
            saga.error = str(e)
            self._update_saga(saga)
            logger.error(f"Saga {saga_id} failed: {e}")
            return False

    def _compensate(self, saga: Saga, from_step: int):
        """Execute compensation for failed saga."""
        saga.status = SagaStatus.COMPENSATING.value
        self._update_saga(saga)

        logger.info(f"Starting compensation for saga {saga.saga_id}")

        # Compensate in reverse order
        for i in range(from_step - 1, -1, -1):
            step = saga.steps[i]

            if step['status'] != StepStatus.COMPLETED.value:
                continue

            step['status'] = StepStatus.COMPENSATING.value
            self._update_saga(saga)

            step_name = step['name']
            compensation = self._compensation_handlers.get(step_name)

            if compensation:
                try:
                    compensation(saga.context)
                    step['status'] = StepStatus.COMPENSATED.value
                    logger.info(f"Saga {saga.saga_id}: Compensated {step_name}")
                except Exception as e:
                    logger.error(
                        f"Saga {saga.saga_id}: Compensation failed for "
                        f"{step_name}: {e}"
                    )
                    step['status'] = StepStatus.FAILED.value
                    step['error'] = str(e)

                self._update_saga(saga)

        saga.status = SagaStatus.COMPENSATED.value
        self._update_saga(saga)

        self.redis.publish(
            f"{self.namespace}:events",
            json.dumps({
                "event": "saga_compensated",
                "saga_id": saga.saga_id
            })
        )

        logger.info(f"Saga {saga.saga_id} compensation completed")

    def start_worker(self):
        """Start saga worker."""
        self._running = True
        thread = threading.Thread(target=self._worker_loop)
        thread.daemon = True
        thread.start()
        logger.info("Saga worker started")

    def stop_worker(self):
        """Stop saga worker."""
        self._running = False

    def _worker_loop(self):
        """Background worker for processing sagas."""
        while self._running:
            try:
                # Get pending saga
                result = self.redis.brpop(self._pending_key(), timeout=5)
                if result:
                    _, saga_id = result
                    saga_id = saga_id.decode() if isinstance(saga_id, bytes) else saga_id
                    self.execute_saga(saga_id)
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(1)

class SagaError(Exception):
    pass

# Order Saga Example
def create_order_saga(orchestrator: SagaOrchestrator,
                      order_data: Dict) -> Saga:
    """Create an order processing saga."""
    steps = [
        SagaStep(
            name="create_order",
            service="order-service",
            action="create",
            compensation="cancel_order"
        ),
        SagaStep(
            name="reserve_stock",
            service="inventory-service",
            action="reserve",
            compensation="release_stock"
        ),
        SagaStep(
            name="process_payment",
            service="payment-service",
            action="charge",
            compensation="refund_payment"
        ),
        SagaStep(
            name="ship_order",
            service="shipping-service",
            action="ship",
            compensation="cancel_shipment"
        )
    ]

    return orchestrator.create_saga("order", steps, order_data)
```

## Pattern 2: Choreography-Based Saga

Implement event-driven saga with Redis Streams:

```python
import redis
import json
import uuid
import time
from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass
import threading
import logging

logger = logging.getLogger(__name__)

@dataclass
class SagaEvent:
    event_id: str
    saga_id: str
    event_type: str
    service: str
    data: Dict[str, Any]
    timestamp: float

class ChoreographySaga:
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 namespace: str = "saga"):
        self.redis = redis_client
        self.service_name = service_name
        self.namespace = namespace
        self._event_handlers: Dict[str, Callable] = {}
        self._running = False
        self._consumer_group = f"{namespace}:{service_name}"
        self._stream_key = f"{namespace}:events"

    def _ensure_consumer_group(self):
        """Create consumer group if not exists."""
        try:
            self.redis.xgroup_create(
                self._stream_key,
                self._consumer_group,
                id="0",
                mkstream=True
            )
        except redis.ResponseError:
            pass  # Group exists

    def publish_event(self, saga_id: str, event_type: str,
                      data: Dict[str, Any]) -> str:
        """Publish saga event."""
        event_id = str(uuid.uuid4())

        event = {
            "event_id": event_id,
            "saga_id": saga_id,
            "event_type": event_type,
            "service": self.service_name,
            "data": json.dumps(data),
            "timestamp": str(time.time())
        }

        stream_id = self.redis.xadd(
            self._stream_key,
            event,
            maxlen=100000
        )

        logger.info(f"Published event {event_type} for saga {saga_id}")
        return stream_id

    def subscribe(self, event_type: str, handler: Callable[[SagaEvent], None]):
        """Subscribe to saga event type."""
        self._event_handlers[event_type] = handler

    def start_listening(self):
        """Start listening for events."""
        self._ensure_consumer_group()
        self._running = True

        thread = threading.Thread(target=self._listen_loop)
        thread.daemon = True
        thread.start()
        logger.info(f"Started listening for saga events")

    def stop_listening(self):
        """Stop listening."""
        self._running = False

    def _listen_loop(self):
        """Background loop for processing events."""
        consumer_name = f"{self.service_name}-{uuid.uuid4().hex[:8]}"

        while self._running:
            try:
                messages = self.redis.xreadgroup(
                    self._consumer_group,
                    consumer_name,
                    {self._stream_key: ">"},
                    count=10,
                    block=5000
                )

                if not messages:
                    continue

                for stream, entries in messages:
                    for message_id, data in entries:
                        self._process_event(message_id, data)

            except redis.RedisError as e:
                logger.error(f"Redis error: {e}")
                time.sleep(1)

    def _process_event(self, message_id: bytes, data: Dict[bytes, bytes]):
        """Process a single event."""
        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        event_type = decoded["event_type"]

        if event_type not in self._event_handlers:
            # Not interested in this event
            self.redis.xack(self._stream_key, self._consumer_group, message_id)
            return

        event = SagaEvent(
            event_id=decoded["event_id"],
            saga_id=decoded["saga_id"],
            event_type=event_type,
            service=decoded["service"],
            data=json.loads(decoded["data"]),
            timestamp=float(decoded["timestamp"])
        )

        try:
            handler = self._event_handlers[event_type]
            handler(event)
            self.redis.xack(self._stream_key, self._consumer_group, message_id)
            logger.debug(f"Processed event {event_type}")
        except Exception as e:
            logger.error(f"Error processing event {event_type}: {e}")
            # Don't ack - will be reprocessed

# Service implementations
class OrderService:
    def __init__(self, saga: ChoreographySaga):
        self.saga = saga
        self.orders: Dict[str, Dict] = {}

        # Subscribe to events
        saga.subscribe("order_created", self._on_payment_completed)
        saga.subscribe("payment_failed", self._on_payment_failed)
        saga.subscribe("stock_reserved", self._on_stock_reserved)
        saga.subscribe("stock_reservation_failed", self._on_stock_failed)

    def create_order(self, order_data: Dict) -> str:
        """Start order saga."""
        saga_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())

        self.orders[order_id] = {
            "saga_id": saga_id,
            "status": "pending",
            **order_data
        }

        # Publish order created event
        self.saga.publish_event(saga_id, "order_created", {
            "order_id": order_id,
            **order_data
        })

        return order_id

    def _on_payment_completed(self, event: SagaEvent):
        order_id = event.data.get("order_id")
        if order_id in self.orders:
            self.orders[order_id]["status"] = "paid"
            self.saga.publish_event(
                event.saga_id,
                "order_confirmed",
                {"order_id": order_id}
            )

    def _on_payment_failed(self, event: SagaEvent):
        order_id = event.data.get("order_id")
        if order_id in self.orders:
            self.orders[order_id]["status"] = "cancelled"

    def _on_stock_reserved(self, event: SagaEvent):
        order_id = event.data.get("order_id")
        # Trigger payment
        self.saga.publish_event(
            event.saga_id,
            "payment_requested",
            event.data
        )

    def _on_stock_failed(self, event: SagaEvent):
        order_id = event.data.get("order_id")
        if order_id in self.orders:
            self.orders[order_id]["status"] = "cancelled"

class InventoryService:
    def __init__(self, saga: ChoreographySaga):
        self.saga = saga
        self.stock: Dict[str, int] = {"item1": 100, "item2": 50}
        self.reservations: Dict[str, Dict] = {}

        saga.subscribe("order_created", self._on_order_created)
        saga.subscribe("payment_failed", self._on_payment_failed)
        saga.subscribe("order_confirmed", self._on_order_confirmed)

    def _on_order_created(self, event: SagaEvent):
        """Reserve stock for order."""
        order_id = event.data.get("order_id")
        items = event.data.get("items", [])

        # Check and reserve stock
        can_reserve = all(
            self.stock.get(item["id"], 0) >= item["qty"]
            for item in items
        )

        if can_reserve:
            # Reserve stock
            for item in items:
                self.stock[item["id"]] -= item["qty"]

            self.reservations[order_id] = items

            self.saga.publish_event(
                event.saga_id,
                "stock_reserved",
                {"order_id": order_id, "items": items}
            )
        else:
            self.saga.publish_event(
                event.saga_id,
                "stock_reservation_failed",
                {"order_id": order_id, "reason": "insufficient_stock"}
            )

    def _on_payment_failed(self, event: SagaEvent):
        """Compensate - release reserved stock."""
        order_id = event.data.get("order_id")
        if order_id in self.reservations:
            items = self.reservations.pop(order_id)
            for item in items:
                self.stock[item["id"]] += item["qty"]

            self.saga.publish_event(
                event.saga_id,
                "stock_released",
                {"order_id": order_id}
            )

    def _on_order_confirmed(self, event: SagaEvent):
        """Confirm reservation - remove from pending."""
        order_id = event.data.get("order_id")
        self.reservations.pop(order_id, None)
```

## Pattern 3: Saga State Machine

Implement saga as a state machine:

```python
import redis
import json
from typing import Dict, Any, Callable, Optional, Set
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class OrderSagaState(Enum):
    INITIAL = "initial"
    ORDER_CREATED = "order_created"
    STOCK_RESERVED = "stock_reserved"
    PAYMENT_PROCESSED = "payment_processed"
    SHIPPED = "shipped"
    COMPLETED = "completed"
    # Compensation states
    CANCELLING_SHIPMENT = "cancelling_shipment"
    REFUNDING_PAYMENT = "refunding_payment"
    RELEASING_STOCK = "releasing_stock"
    CANCELLING_ORDER = "cancelling_order"
    FAILED = "failed"

@dataclass
class StateTransition:
    from_state: str
    to_state: str
    action: Callable
    compensation_state: Optional[str] = None

class SagaStateMachine:
    def __init__(self, redis_client: redis.Redis, saga_type: str):
        self.redis = redis_client
        self.saga_type = saga_type
        self._transitions: Dict[str, Dict[str, StateTransition]] = {}
        self._state_handlers: Dict[str, Callable] = {}
        self._key_prefix = f"saga_sm:{saga_type}"

    def _saga_key(self, saga_id: str) -> str:
        return f"{self._key_prefix}:{saga_id}"

    def add_transition(self, from_state: str, event: str,
                       to_state: str, action: Callable,
                       compensation_state: Optional[str] = None):
        """Add state transition."""
        if from_state not in self._transitions:
            self._transitions[from_state] = {}

        self._transitions[from_state][event] = StateTransition(
            from_state=from_state,
            to_state=to_state,
            action=action,
            compensation_state=compensation_state
        )

    def on_state(self, state: str, handler: Callable):
        """Register handler for entering a state."""
        self._state_handlers[state] = handler

    def create(self, saga_id: str, initial_data: Dict[str, Any]) -> str:
        """Create new saga instance."""
        saga_data = {
            "saga_id": saga_id,
            "state": "initial",
            "data": initial_data,
            "history": [],
            "created_at": time.time()
        }

        self.redis.set(self._saga_key(saga_id), json.dumps(saga_data))
        return saga_id

    def get_state(self, saga_id: str) -> Optional[Dict]:
        """Get current saga state."""
        data = self.redis.get(self._saga_key(saga_id))
        if data:
            return json.loads(data)
        return None

    def _save_state(self, saga_id: str, saga_data: Dict):
        """Save saga state."""
        self.redis.set(self._saga_key(saga_id), json.dumps(saga_data))

    def send_event(self, saga_id: str, event: str,
                   event_data: Optional[Dict] = None) -> bool:
        """Send event to saga."""
        saga_data = self.get_state(saga_id)
        if not saga_data:
            return False

        current_state = saga_data["state"]

        # Find transition
        transitions = self._transitions.get(current_state, {})
        transition = transitions.get(event)

        if not transition:
            logger.warning(
                f"No transition from {current_state} for event {event}"
            )
            return False

        # Execute action
        try:
            context = {**saga_data["data"], **(event_data or {})}
            result = transition.action(context)

            # Update state
            saga_data["state"] = transition.to_state
            saga_data["data"].update(result or {})
            saga_data["history"].append({
                "from": current_state,
                "to": transition.to_state,
                "event": event,
                "timestamp": time.time()
            })

            self._save_state(saga_id, saga_data)

            # Call state handler
            if transition.to_state in self._state_handlers:
                self._state_handlers[transition.to_state](saga_data)

            logger.info(
                f"Saga {saga_id}: {current_state} -> {transition.to_state}"
            )
            return True

        except Exception as e:
            logger.error(f"Action failed: {e}")

            # Trigger compensation if defined
            if transition.compensation_state:
                saga_data["state"] = transition.compensation_state
                saga_data["error"] = str(e)
                self._save_state(saga_id, saga_data)
                self._run_compensation(saga_id, saga_data)

            return False

    def _run_compensation(self, saga_id: str, saga_data: Dict):
        """Run compensation chain."""
        # Implementation depends on your compensation strategy
        pass

# Example usage
import time

def create_order_action(context: Dict) -> Dict:
    """Create order action."""
    order_id = str(uuid.uuid4())
    return {"order_id": order_id}

def reserve_stock_action(context: Dict) -> Dict:
    """Reserve stock action."""
    # Call inventory service
    return {"reservation_id": str(uuid.uuid4())}

def process_payment_action(context: Dict) -> Dict:
    """Process payment action."""
    # Call payment service
    return {"payment_id": str(uuid.uuid4())}

# Setup state machine
r = redis.Redis()
sm = SagaStateMachine(r, "order")

sm.add_transition(
    "initial", "create_order", "order_created",
    create_order_action
)
sm.add_transition(
    "order_created", "reserve_stock", "stock_reserved",
    reserve_stock_action,
    compensation_state="cancelling_order"
)
sm.add_transition(
    "stock_reserved", "process_payment", "payment_processed",
    process_payment_action,
    compensation_state="releasing_stock"
)

# Create and run saga
saga_id = sm.create(str(uuid.uuid4()), {"customer_id": "123", "items": []})
sm.send_event(saga_id, "create_order")
sm.send_event(saga_id, "reserve_stock")
sm.send_event(saga_id, "process_payment")
```

## Saga Timeout Handling

Handle saga timeouts with Redis:

```python
import redis
import json
import time
import threading
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SagaTimeoutHandler:
    def __init__(self, redis_client: redis.Redis, orchestrator,
                 namespace: str = "saga"):
        self.redis = redis_client
        self.orchestrator = orchestrator
        self.namespace = namespace
        self._running = False
        self._timeout_key = f"{namespace}:timeouts"

    def set_timeout(self, saga_id: str, timeout_seconds: int):
        """Set timeout for a saga."""
        expire_at = time.time() + timeout_seconds
        self.redis.zadd(self._timeout_key, {saga_id: expire_at})

    def clear_timeout(self, saga_id: str):
        """Clear timeout for a saga."""
        self.redis.zrem(self._timeout_key, saga_id)

    def start_monitoring(self):
        """Start timeout monitoring."""
        self._running = True
        thread = threading.Thread(target=self._monitor_loop)
        thread.daemon = True
        thread.start()
        logger.info("Saga timeout monitoring started")

    def stop_monitoring(self):
        """Stop timeout monitoring."""
        self._running = False

    def _monitor_loop(self):
        """Monitor for timed out sagas."""
        while self._running:
            try:
                now = time.time()

                # Get expired sagas
                expired = self.redis.zrangebyscore(
                    self._timeout_key,
                    "-inf",
                    now,
                    start=0,
                    num=100
                )

                for saga_id in expired:
                    if isinstance(saga_id, bytes):
                        saga_id = saga_id.decode()

                    logger.warning(f"Saga {saga_id} timed out")

                    # Remove from timeout set
                    self.redis.zrem(self._timeout_key, saga_id)

                    # Trigger compensation
                    saga = self.orchestrator.get_saga(saga_id)
                    if saga and saga.status == SagaStatus.RUNNING.value:
                        saga.error = "Saga timeout"
                        self.orchestrator._compensate(
                            saga, saga.current_step
                        )

                time.sleep(1)

            except Exception as e:
                logger.error(f"Timeout monitor error: {e}")
                time.sleep(5)
```

## Best Practices

1. **Make steps idempotent** - Steps may be retried on failure
2. **Store enough context** - Compensation needs original data
3. **Use timeouts** - Prevent stuck sagas
4. **Log all state transitions** - Essential for debugging
5. **Test compensation paths** - They are equally important as forward paths
6. **Handle partial failures** - Compensation can also fail
7. **Monitor saga health** - Track completion rates and durations

## Conclusion

Redis provides robust coordination capabilities for implementing the Saga pattern. The orchestration approach offers centralized control, while choreography provides loose coupling between services. Choose based on your consistency requirements and team structure. Always thoroughly test compensation paths and implement proper timeout handling for production systems.
