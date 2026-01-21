# How to Use Redis Streams for Event Sourcing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Streams, Event Sourcing, Message Queue, Consumer Groups, XADD, XREAD, Event-Driven

Description: A comprehensive guide to using Redis Streams for event sourcing and message processing, covering XADD, XREAD, consumer groups, exactly-once processing, and practical examples in Python, Node.js, and Go for building event-driven architectures.

---

Redis Streams is a powerful data structure for building event-driven architectures and implementing event sourcing patterns. Unlike Redis Pub/Sub, Streams persist messages and support consumer groups for distributed processing with delivery guarantees.

In this guide, we will explore Redis Streams in depth, covering essential commands, consumer groups, and practical implementations for event sourcing and message processing systems.

## Understanding Redis Streams

Redis Streams are append-only data structures that store messages with unique IDs. Each message consists of field-value pairs, similar to hash entries.

Key characteristics:
- Append-only log with automatic ID generation
- Persistent storage with optional trimming
- Consumer groups for distributed processing
- Message acknowledgment and pending entry lists
- Range queries by ID or time

Use cases:
- Event sourcing
- Activity logging
- Message queues
- Real-time data pipelines
- Audit trails

## Stream Entry IDs

Each stream entry has a unique ID in the format: `<millisecondsTime>-<sequenceNumber>`

```bash
# Auto-generated ID
XADD mystream * field value
# Returns something like: 1234567890123-0

# Explicit ID
XADD mystream 1234567890123-0 field value

# Partial auto ID (auto sequence)
XADD mystream 1234567890123-* field value
```

Special IDs:
- `*` - Auto-generate new ID
- `-` - Minimum possible ID
- `+` - Maximum possible ID
- `$` - Last entry ID (for XREAD)
- `>` - Never delivered entries (for XREADGROUP)
- `0` - Beginning of stream (for XREADGROUP)

## Essential Stream Commands

### Adding Entries (XADD)

```bash
# Add entry with auto ID
XADD events * type "order_created" order_id "123" amount "99.99"
# Returns: 1609459200000-0

# Add with max length (trim to ~1000 entries)
XADD events MAXLEN ~ 1000 * type "page_view" page "/home"

# Add with exact max length
XADD events MAXLEN 1000 * type "click" element "button"

# Add with MINID (trim entries older than ID)
XADD events MINID ~ 1609459200000-0 * type "event"
```

### Reading Entries

```bash
# Read range by ID
XRANGE events - +
# All entries

XRANGE events 1609459200000-0 1609459300000-0
# Entries within ID range

XRANGE events - + COUNT 10
# First 10 entries

# Reverse range
XREVRANGE events + - COUNT 10
# Last 10 entries

# Read with blocking
XREAD BLOCK 5000 STREAMS events $
# Block 5 seconds for new entries after last ID

XREAD COUNT 10 STREAMS events 0
# Read up to 10 entries from beginning

# Read from multiple streams
XREAD BLOCK 0 STREAMS events notifications 0 0
```

### Stream Information

```bash
# Get stream length
XLEN events

# Get stream info
XINFO STREAM events

# Get consumer groups info
XINFO GROUPS events

# Get consumers in a group
XINFO CONSUMERS events mygroup

# Get pending entries
XPENDING events mygroup
```

### Deleting and Trimming

```bash
# Delete specific entry
XDEL events 1609459200000-0

# Trim to max length
XTRIM events MAXLEN 1000

# Trim approximately (more efficient)
XTRIM events MAXLEN ~ 1000

# Trim by minimum ID
XTRIM events MINID 1609459200000-0
```

## Consumer Groups

Consumer groups enable distributed message processing with delivery tracking.

### Creating Consumer Groups

```bash
# Create group starting from beginning
XGROUP CREATE events mygroup 0

# Create group starting from end (new messages only)
XGROUP CREATE events mygroup $

# Create with MKSTREAM (create stream if not exists)
XGROUP CREATE events mygroup 0 MKSTREAM

# Create from specific ID
XGROUP CREATE events mygroup 1609459200000-0
```

### Reading with Consumer Groups

```bash
# Read new messages for consumer
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS events >

# Read pending messages (re-read unacknowledged)
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS events 0

# Blocking read
XREADGROUP GROUP mygroup consumer1 BLOCK 5000 COUNT 10 STREAMS events >
```

### Acknowledging Messages

```bash
# Acknowledge single message
XACK events mygroup 1609459200000-0

# Acknowledge multiple messages
XACK events mygroup 1609459200000-0 1609459200001-0 1609459200002-0
```

### Pending Entries

```bash
# Get pending entries summary
XPENDING events mygroup

# Get pending entries details
XPENDING events mygroup - + 10

# Get pending for specific consumer
XPENDING events mygroup - + 10 consumer1

# Get idle pending entries (older than 60 seconds)
XPENDING events mygroup IDLE 60000 - + 10
```

### Claiming Messages

```bash
# Claim messages from another consumer
XCLAIM events mygroup consumer2 60000 1609459200000-0
# Claim if idle > 60 seconds

# Auto-claim idle messages
XAUTOCLAIM events mygroup consumer2 60000 0 COUNT 10
# Returns: next ID, claimed messages, deleted IDs
```

### Managing Groups and Consumers

```bash
# Delete consumer group
XGROUP DESTROY events mygroup

# Delete consumer from group
XGROUP DELCONSUMER events mygroup consumer1

# Set group last ID
XGROUP SETID events mygroup 1609459200000-0
```

## Practical Examples

### Python Implementation

```python
import redis
import json
import time
import uuid
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, asdict

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Event Store
# =============================================================================

@dataclass
class Event:
    event_type: str
    aggregate_id: str
    data: Dict[str, Any]
    timestamp: str = None
    event_id: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
        if self.event_id is None:
            self.event_id = str(uuid.uuid4())


class EventStore:
    def __init__(self, stream_name: str):
        self.stream = stream_name

    def append(self, event: Event) -> str:
        """Append event to stream."""
        entry = {
            "event_type": event.event_type,
            "aggregate_id": event.aggregate_id,
            "data": json.dumps(event.data),
            "timestamp": event.timestamp,
            "event_id": event.event_id
        }
        return client.xadd(self.stream, entry)

    def get_events(self, start: str = "-", end: str = "+", count: int = None) -> List[tuple]:
        """Get events in range."""
        if count:
            return client.xrange(self.stream, start, end, count=count)
        return client.xrange(self.stream, start, end)

    def get_events_for_aggregate(self, aggregate_id: str) -> List[tuple]:
        """Get all events for an aggregate."""
        all_events = self.get_events()
        return [
            (eid, data) for eid, data in all_events
            if data.get("aggregate_id") == aggregate_id
        ]

    def get_last_event(self) -> Optional[tuple]:
        """Get the most recent event."""
        events = client.xrevrange(self.stream, "+", "-", count=1)
        return events[0] if events else None

    def stream_events(self, start: str = "$", block: int = 5000) -> tuple:
        """Stream new events (blocking)."""
        result = client.xread({self.stream: start}, block=block, count=1)
        if result:
            stream_name, messages = result[0]
            return messages[0] if messages else None
        return None


# =============================================================================
# Consumer Group Handler
# =============================================================================

class ConsumerGroupHandler:
    def __init__(self, stream: str, group: str, consumer: str):
        self.stream = stream
        self.group = group
        self.consumer = consumer
        self.running = False
        self._ensure_group_exists()

    def _ensure_group_exists(self):
        """Create consumer group if not exists."""
        try:
            client.xgroup_create(self.stream, self.group, "0", mkstream=True)
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    def read_messages(self, count: int = 10, block: int = 5000) -> List[tuple]:
        """Read new messages."""
        result = client.xreadgroup(
            self.group,
            self.consumer,
            {self.stream: ">"},
            count=count,
            block=block
        )
        if result:
            return result[0][1]  # Return messages
        return []

    def read_pending(self, count: int = 10) -> List[tuple]:
        """Read pending (unacknowledged) messages."""
        result = client.xreadgroup(
            self.group,
            self.consumer,
            {self.stream: "0"},
            count=count
        )
        if result:
            return result[0][1]
        return []

    def acknowledge(self, message_id: str) -> int:
        """Acknowledge message processing."""
        return client.xack(self.stream, self.group, message_id)

    def acknowledge_many(self, message_ids: List[str]) -> int:
        """Acknowledge multiple messages."""
        return client.xack(self.stream, self.group, *message_ids)

    def get_pending_info(self) -> Dict:
        """Get pending messages info."""
        return client.xpending(self.stream, self.group)

    def claim_idle_messages(self, min_idle_time: int = 60000, count: int = 10) -> List[tuple]:
        """Claim messages idle for too long."""
        result = client.xautoclaim(
            self.stream,
            self.group,
            self.consumer,
            min_idle_time,
            "0",
            count=count
        )
        # result = (next_id, claimed_messages, deleted_ids)
        return result[1] if result else []


# =============================================================================
# Event Processor
# =============================================================================

class EventProcessor:
    def __init__(self, stream: str, group: str, consumer: str):
        self.handler = ConsumerGroupHandler(stream, group, consumer)
        self.handlers: Dict[str, Callable] = {}
        self.running = False

    def register_handler(self, event_type: str, handler: Callable):
        """Register handler for event type."""
        self.handlers[event_type] = handler

    def process_message(self, message_id: str, message_data: Dict) -> bool:
        """Process a single message."""
        event_type = message_data.get("event_type")
        handler = self.handlers.get(event_type)

        if handler:
            try:
                # Parse data
                data = json.loads(message_data.get("data", "{}"))
                message_data["data"] = data

                # Call handler
                handler(message_id, message_data)
                return True
            except Exception as e:
                print(f"Error processing message {message_id}: {e}")
                return False
        else:
            print(f"No handler for event type: {event_type}")
            return True  # Acknowledge unknown events

    def start(self, batch_size: int = 10, block_time: int = 5000):
        """Start processing messages."""
        self.running = True
        print(f"Starting event processor for {self.handler.stream}")

        # First, process any pending messages
        pending = self.handler.read_pending(count=batch_size)
        for message_id, message_data in pending:
            if self.process_message(message_id, message_data):
                self.handler.acknowledge(message_id)

        # Then process new messages
        while self.running:
            messages = self.handler.read_messages(count=batch_size, block=block_time)

            for message_id, message_data in messages:
                if self.process_message(message_id, message_data):
                    self.handler.acknowledge(message_id)

            # Periodically claim idle messages
            idle_messages = self.handler.claim_idle_messages(min_idle_time=60000)
            for message_id, message_data in idle_messages:
                if self.process_message(message_id, message_data):
                    self.handler.acknowledge(message_id)

    def stop(self):
        """Stop processing."""
        self.running = False


# =============================================================================
# Event-Driven Order System
# =============================================================================

class OrderService:
    def __init__(self):
        self.event_store = EventStore("orders:events")

    def create_order(self, order_id: str, customer_id: str, items: List[Dict], total: float) -> str:
        """Create a new order."""
        event = Event(
            event_type="OrderCreated",
            aggregate_id=order_id,
            data={
                "customer_id": customer_id,
                "items": items,
                "total": total,
                "status": "created"
            }
        )
        return self.event_store.append(event)

    def confirm_order(self, order_id: str) -> str:
        """Confirm an order."""
        event = Event(
            event_type="OrderConfirmed",
            aggregate_id=order_id,
            data={"status": "confirmed"}
        )
        return self.event_store.append(event)

    def ship_order(self, order_id: str, tracking_number: str) -> str:
        """Ship an order."""
        event = Event(
            event_type="OrderShipped",
            aggregate_id=order_id,
            data={
                "status": "shipped",
                "tracking_number": tracking_number
            }
        )
        return self.event_store.append(event)

    def get_order_history(self, order_id: str) -> List[Dict]:
        """Get order event history."""
        events = self.event_store.get_events_for_aggregate(order_id)
        return [
            {
                "event_id": eid,
                "event_type": data["event_type"],
                "timestamp": data["timestamp"],
                "data": json.loads(data["data"])
            }
            for eid, data in events
        ]

    def rebuild_order_state(self, order_id: str) -> Dict:
        """Rebuild order state from events."""
        events = self.get_order_history(order_id)
        state = {}

        for event in events:
            if event["event_type"] == "OrderCreated":
                state = event["data"]
                state["order_id"] = order_id
            elif event["event_type"] == "OrderConfirmed":
                state["status"] = "confirmed"
            elif event["event_type"] == "OrderShipped":
                state["status"] = "shipped"
                state["tracking_number"] = event["data"].get("tracking_number")

        return state


# =============================================================================
# Notification Consumer
# =============================================================================

class NotificationConsumer:
    def __init__(self):
        self.processor = EventProcessor(
            stream="orders:events",
            group="notification-service",
            consumer="notification-worker-1"
        )
        self._register_handlers()

    def _register_handlers(self):
        self.processor.register_handler("OrderCreated", self._on_order_created)
        self.processor.register_handler("OrderConfirmed", self._on_order_confirmed)
        self.processor.register_handler("OrderShipped", self._on_order_shipped)

    def _on_order_created(self, message_id: str, data: Dict):
        order_data = data["data"]
        print(f"[Notification] Order {data['aggregate_id']} created for customer {order_data['customer_id']}")
        # Send confirmation email

    def _on_order_confirmed(self, message_id: str, data: Dict):
        print(f"[Notification] Order {data['aggregate_id']} confirmed")
        # Send payment confirmation

    def _on_order_shipped(self, message_id: str, data: Dict):
        tracking = data["data"].get("tracking_number")
        print(f"[Notification] Order {data['aggregate_id']} shipped with tracking {tracking}")
        # Send shipping notification

    def start(self):
        self.processor.start()


# =============================================================================
# Usage Examples
# =============================================================================

# Event Store
store = EventStore("app:events")
event = Event(
    event_type="UserRegistered",
    aggregate_id="user:123",
    data={"email": "user@example.com", "name": "Alice"}
)
event_id = store.append(event)
print(f"Event stored: {event_id}")

# Get all events
events = store.get_events()
print(f"All events: {len(events)}")

# Order Service
order_service = OrderService()

# Create order
order_id = "order:001"
order_service.create_order(
    order_id=order_id,
    customer_id="cust:123",
    items=[{"sku": "ITEM1", "qty": 2}],
    total=99.99
)

# Confirm and ship
order_service.confirm_order(order_id)
order_service.ship_order(order_id, "TRACK123456")

# Get order history
history = order_service.get_order_history(order_id)
print(f"Order history: {json.dumps(history, indent=2)}")

# Rebuild state
state = order_service.rebuild_order_state(order_id)
print(f"Current state: {state}")

# Start notification consumer (in separate thread/process)
# consumer = NotificationConsumer()
# consumer.start()
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Event Store
// =============================================================================

class Event {
  constructor(eventType, aggregateId, data) {
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.eventId = uuidv4();
  }
}

class EventStore {
  constructor(streamName) {
    this.stream = streamName;
  }

  async append(event) {
    const entry = {
      event_type: event.eventType,
      aggregate_id: event.aggregateId,
      data: JSON.stringify(event.data),
      timestamp: event.timestamp,
      event_id: event.eventId,
    };
    return await redis.xadd(this.stream, '*', ...Object.entries(entry).flat());
  }

  async getEvents(start = '-', end = '+', count = null) {
    if (count) {
      return await redis.xrange(this.stream, start, end, 'COUNT', count);
    }
    return await redis.xrange(this.stream, start, end);
  }

  async getEventsForAggregate(aggregateId) {
    const allEvents = await this.getEvents();
    return allEvents.filter(([id, fields]) => {
      const data = this._parseFields(fields);
      return data.aggregate_id === aggregateId;
    });
  }

  _parseFields(fields) {
    const result = {};
    for (let i = 0; i < fields.length; i += 2) {
      result[fields[i]] = fields[i + 1];
    }
    return result;
  }
}

// =============================================================================
// Consumer Group Handler
// =============================================================================

class ConsumerGroupHandler {
  constructor(stream, group, consumer) {
    this.stream = stream;
    this.group = group;
    this.consumer = consumer;
  }

  async ensureGroupExists() {
    try {
      await redis.xgroup('CREATE', this.stream, this.group, '0', 'MKSTREAM');
    } catch (err) {
      if (!err.message.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  async readMessages(count = 10, block = 5000) {
    const result = await redis.xreadgroup(
      'GROUP',
      this.group,
      this.consumer,
      'COUNT',
      count,
      'BLOCK',
      block,
      'STREAMS',
      this.stream,
      '>'
    );
    return result ? result[0][1] : [];
  }

  async readPending(count = 10) {
    const result = await redis.xreadgroup(
      'GROUP',
      this.group,
      this.consumer,
      'COUNT',
      count,
      'STREAMS',
      this.stream,
      '0'
    );
    return result ? result[0][1] : [];
  }

  async acknowledge(messageId) {
    return await redis.xack(this.stream, this.group, messageId);
  }

  async getPendingInfo() {
    return await redis.xpending(this.stream, this.group);
  }

  async claimIdleMessages(minIdleTime = 60000, count = 10) {
    const result = await redis.xautoclaim(
      this.stream,
      this.group,
      this.consumer,
      minIdleTime,
      '0',
      'COUNT',
      count
    );
    return result[1] || [];
  }
}

// =============================================================================
// Event Processor
// =============================================================================

class EventProcessor {
  constructor(stream, group, consumer) {
    this.handler = new ConsumerGroupHandler(stream, group, consumer);
    this.handlers = new Map();
    this.running = false;
  }

  registerHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
  }

  _parseFields(fields) {
    const result = {};
    for (let i = 0; i < fields.length; i += 2) {
      result[fields[i]] = fields[i + 1];
    }
    return result;
  }

  async processMessage(messageId, messageFields) {
    const messageData = this._parseFields(messageFields);
    const eventType = messageData.event_type;
    const handler = this.handlers.get(eventType);

    if (handler) {
      try {
        messageData.data = JSON.parse(messageData.data || '{}');
        await handler(messageId, messageData);
        return true;
      } catch (err) {
        console.error(`Error processing message ${messageId}:`, err);
        return false;
      }
    } else {
      console.log(`No handler for event type: ${eventType}`);
      return true;
    }
  }

  async start(batchSize = 10, blockTime = 5000) {
    this.running = true;
    await this.handler.ensureGroupExists();
    console.log(`Starting event processor for ${this.handler.stream}`);

    // Process pending messages first
    const pending = await this.handler.readPending(batchSize);
    for (const [messageId, fields] of pending) {
      if (await this.processMessage(messageId, fields)) {
        await this.handler.acknowledge(messageId);
      }
    }

    // Process new messages
    while (this.running) {
      const messages = await this.handler.readMessages(batchSize, blockTime);

      for (const [messageId, fields] of messages) {
        if (await this.processMessage(messageId, fields)) {
          await this.handler.acknowledge(messageId);
        }
      }

      // Claim idle messages
      const idleMessages = await this.handler.claimIdleMessages(60000);
      for (const [messageId, fields] of idleMessages) {
        if (await this.processMessage(messageId, fields)) {
          await this.handler.acknowledge(messageId);
        }
      }
    }
  }

  stop() {
    this.running = false;
  }
}

// =============================================================================
// Order Service
// =============================================================================

class OrderService {
  constructor() {
    this.eventStore = new EventStore('orders:events');
  }

  async createOrder(orderId, customerId, items, total) {
    const event = new Event('OrderCreated', orderId, {
      customer_id: customerId,
      items,
      total,
      status: 'created',
    });
    return await this.eventStore.append(event);
  }

  async confirmOrder(orderId) {
    const event = new Event('OrderConfirmed', orderId, { status: 'confirmed' });
    return await this.eventStore.append(event);
  }

  async shipOrder(orderId, trackingNumber) {
    const event = new Event('OrderShipped', orderId, {
      status: 'shipped',
      tracking_number: trackingNumber,
    });
    return await this.eventStore.append(event);
  }

  async getOrderHistory(orderId) {
    const events = await this.eventStore.getEventsForAggregate(orderId);
    return events.map(([id, fields]) => {
      const data = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }
      return {
        eventId: id,
        eventType: data.event_type,
        timestamp: data.timestamp,
        data: JSON.parse(data.data || '{}'),
      };
    });
  }

  async rebuildOrderState(orderId) {
    const events = await this.getOrderHistory(orderId);
    let state = {};

    for (const event of events) {
      if (event.eventType === 'OrderCreated') {
        state = { ...event.data, order_id: orderId };
      } else if (event.eventType === 'OrderConfirmed') {
        state.status = 'confirmed';
      } else if (event.eventType === 'OrderShipped') {
        state.status = 'shipped';
        state.tracking_number = event.data.tracking_number;
      }
    }

    return state;
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Event Store
  const store = new EventStore('app:events');
  const event = new Event('UserRegistered', 'user:123', {
    email: 'user@example.com',
    name: 'Alice',
  });
  const eventId = await store.append(event);
  console.log(`Event stored: ${eventId}`);

  // Order Service
  const orderService = new OrderService();
  const orderId = 'order:001';

  await orderService.createOrder(orderId, 'cust:123', [{ sku: 'ITEM1', qty: 2 }], 99.99);
  await orderService.confirmOrder(orderId);
  await orderService.shipOrder(orderId, 'TRACK123456');

  const history = await orderService.getOrderHistory(orderId);
  console.log('Order history:', JSON.stringify(history, null, 2));

  const state = await orderService.rebuildOrderState(orderId);
  console.log('Current state:', state);

  // Event Processor (would run continuously)
  // const processor = new EventProcessor('orders:events', 'notification-service', 'worker-1');
  // processor.registerHandler('OrderCreated', (id, data) => {
  //   console.log(`Order ${data.aggregate_id} created`);
  // });
  // await processor.start();

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/google/uuid"
    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Event
// =============================================================================

type Event struct {
    EventType   string                 `json:"event_type"`
    AggregateID string                 `json:"aggregate_id"`
    Data        map[string]interface{} `json:"data"`
    Timestamp   string                 `json:"timestamp"`
    EventID     string                 `json:"event_id"`
}

func NewEvent(eventType, aggregateID string, data map[string]interface{}) *Event {
    return &Event{
        EventType:   eventType,
        AggregateID: aggregateID,
        Data:        data,
        Timestamp:   time.Now().UTC().Format(time.RFC3339),
        EventID:     uuid.New().String(),
    }
}

// =============================================================================
// Event Store
// =============================================================================

type EventStore struct {
    Stream string
}

func NewEventStore(streamName string) *EventStore {
    return &EventStore{Stream: streamName}
}

func (e *EventStore) Append(event *Event) (string, error) {
    dataJSON, _ := json.Marshal(event.Data)

    return client.XAdd(ctx, &redis.XAddArgs{
        Stream: e.Stream,
        Values: map[string]interface{}{
            "event_type":   event.EventType,
            "aggregate_id": event.AggregateID,
            "data":         string(dataJSON),
            "timestamp":    event.Timestamp,
            "event_id":     event.EventID,
        },
    }).Result()
}

func (e *EventStore) GetEvents(start, end string) ([]redis.XMessage, error) {
    return client.XRange(ctx, e.Stream, start, end).Result()
}

func (e *EventStore) GetEventsForAggregate(aggregateID string) ([]redis.XMessage, error) {
    allEvents, err := e.GetEvents("-", "+")
    if err != nil {
        return nil, err
    }

    var filtered []redis.XMessage
    for _, msg := range allEvents {
        if msg.Values["aggregate_id"] == aggregateID {
            filtered = append(filtered, msg)
        }
    }
    return filtered, nil
}

// =============================================================================
// Consumer Group Handler
// =============================================================================

type ConsumerGroupHandler struct {
    Stream   string
    Group    string
    Consumer string
}

func NewConsumerGroupHandler(stream, group, consumer string) *ConsumerGroupHandler {
    return &ConsumerGroupHandler{
        Stream:   stream,
        Group:    group,
        Consumer: consumer,
    }
}

func (h *ConsumerGroupHandler) EnsureGroupExists() error {
    err := client.XGroupCreateMkStream(ctx, h.Stream, h.Group, "0").Err()
    if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
        return err
    }
    return nil
}

func (h *ConsumerGroupHandler) ReadMessages(count int64, block time.Duration) ([]redis.XMessage, error) {
    streams, err := client.XReadGroup(ctx, &redis.XReadGroupArgs{
        Group:    h.Group,
        Consumer: h.Consumer,
        Streams:  []string{h.Stream, ">"},
        Count:    count,
        Block:    block,
    }).Result()

    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    if len(streams) == 0 {
        return nil, nil
    }
    return streams[0].Messages, nil
}

func (h *ConsumerGroupHandler) Acknowledge(messageID string) error {
    return client.XAck(ctx, h.Stream, h.Group, messageID).Err()
}

// =============================================================================
// Order Service
// =============================================================================

type OrderService struct {
    EventStore *EventStore
}

func NewOrderService() *OrderService {
    return &OrderService{
        EventStore: NewEventStore("orders:events"),
    }
}

func (o *OrderService) CreateOrder(orderID, customerID string, items []map[string]interface{}, total float64) (string, error) {
    event := NewEvent("OrderCreated", orderID, map[string]interface{}{
        "customer_id": customerID,
        "items":       items,
        "total":       total,
        "status":      "created",
    })
    return o.EventStore.Append(event)
}

func (o *OrderService) ConfirmOrder(orderID string) (string, error) {
    event := NewEvent("OrderConfirmed", orderID, map[string]interface{}{
        "status": "confirmed",
    })
    return o.EventStore.Append(event)
}

func (o *OrderService) ShipOrder(orderID, trackingNumber string) (string, error) {
    event := NewEvent("OrderShipped", orderID, map[string]interface{}{
        "status":          "shipped",
        "tracking_number": trackingNumber,
    })
    return o.EventStore.Append(event)
}

func (o *OrderService) RebuildOrderState(orderID string) (map[string]interface{}, error) {
    events, err := o.EventStore.GetEventsForAggregate(orderID)
    if err != nil {
        return nil, err
    }

    state := make(map[string]interface{})

    for _, msg := range events {
        eventType := msg.Values["event_type"].(string)
        dataStr := msg.Values["data"].(string)

        var data map[string]interface{}
        json.Unmarshal([]byte(dataStr), &data)

        switch eventType {
        case "OrderCreated":
            state = data
            state["order_id"] = orderID
        case "OrderConfirmed":
            state["status"] = "confirmed"
        case "OrderShipped":
            state["status"] = "shipped"
            state["tracking_number"] = data["tracking_number"]
        }
    }

    return state, nil
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Event Store
    store := NewEventStore("app:events")
    event := NewEvent("UserRegistered", "user:123", map[string]interface{}{
        "email": "user@example.com",
        "name":  "Alice",
    })
    eventID, _ := store.Append(event)
    fmt.Printf("Event stored: %s\n", eventID)

    // Order Service
    orderService := NewOrderService()
    orderID := "order:001"

    orderService.CreateOrder(orderID, "cust:123", []map[string]interface{}{
        {"sku": "ITEM1", "qty": 2},
    }, 99.99)

    orderService.ConfirmOrder(orderID)
    orderService.ShipOrder(orderID, "TRACK123456")

    state, _ := orderService.RebuildOrderState(orderID)
    fmt.Printf("Current state: %v\n", state)
}
```

## Best Practices

1. **Use consumer groups** - For distributed processing with delivery guarantees
2. **Always acknowledge** - Prevent message reprocessing
3. **Handle pending messages** - Process on startup and periodically claim idle
4. **Trim streams** - Use MAXLEN or MINID to prevent unbounded growth
5. **Idempotent handlers** - Messages may be delivered multiple times

## Conclusion

Redis Streams provide a robust foundation for event sourcing and message processing. Key takeaways:

- Use streams for persistent, ordered event storage
- Consumer groups enable distributed processing with acknowledgments
- Combine XREADGROUP with XACK for reliable message delivery
- Use XAUTOCLAIM to recover stuck messages
- Trim streams to manage memory usage

Redis Streams' combination of persistence, ordering, and consumer groups makes them ideal for building event-driven architectures and event sourcing systems.
