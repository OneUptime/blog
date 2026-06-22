# How to Design Event Schemas for Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Event Schema Design, Event-Driven Architecture, Domain Event, Best Practice

Description: A comprehensive guide to designing event schemas for Apache Kafka, covering naming conventions, versioning strategies, and best practices for maintainable event-driven systems.

---

Well-designed event schemas are the foundation of maintainable event-driven architectures. This guide covers best practices for designing Kafka event schemas that are clear, evolvable, and interoperable.

## Event Schema Structure

### Standard Event Envelope

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["metadata", "data"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["eventId", "eventType", "timestamp", "version"],
      "properties": {
        "eventId": {"type": "string", "format": "uuid"},
        "eventType": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "version": {"type": "string"},
        "source": {"type": "string"},
        "correlationId": {"type": "string"},
        "causationId": {"type": "string"}
      }
    },
    "data": {"type": "object"}
  }
}
```

### Domain Event Example

```json
{
  "metadata": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "eventType": "com.example.orders.OrderCreated",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "source": "order-service",
    "correlationId": "request-123",
    "causationId": "command-456"
  },
  "data": {
    "orderId": "order-789",
    "customerId": "customer-123",
    "items": [
      {"productId": "prod-1", "quantity": 2, "price": 29.99}
    ],
    "totalAmount": 59.98,
    "currency": "USD"
  }
}
```

## Naming Conventions

### Event Type Naming

```text
{domain}.{aggregate}.{event}

Examples:
- orders.Order.Created
- payments.Payment.Processed
- inventory.Stock.Reserved
- shipping.Shipment.Delivered
```

### Topic Naming

```text
{domain}-{event-category}-events

Examples:
- orders-lifecycle-events
- payments-transaction-events
- inventory-stock-events
```

## Java Event Classes

```java
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Base Event
public abstract class DomainEvent {
    private EventMetadata metadata;

    protected DomainEvent() {
        this.metadata = new EventMetadata();
        this.metadata.setEventId(UUID.randomUUID().toString());
        this.metadata.setTimestamp(Instant.now().toString());
        this.metadata.setEventType(this.getClass().getName());
    }

    public EventMetadata getMetadata() { return metadata; }
    public void setMetadata(EventMetadata metadata) { this.metadata = metadata; }
}

class EventMetadata {
    private String eventId;
    private String eventType;
    private String timestamp;
    private String version;
    private String source;
    private String correlationId;
    private String causationId;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    public String getCausationId() { return causationId; }
    public void setCausationId(String causationId) { this.causationId = causationId; }
}

// Domain Events
class OrderCreatedEvent extends DomainEvent {
    private OrderData data;

    public OrderCreatedEvent(OrderData data) {
        super();
        this.data = data;
        this.getMetadata().setVersion("1.0");
    }

    public OrderData getData() { return data; }
}

class OrderData {
    private String orderId;
    private String customerId;
    private List<OrderItem> items;
    private BigDecimal totalAmount;
    private String currency;

    // Getters and setters
}

record OrderItem(String productId, int quantity, BigDecimal price) {}
```

## Python Event Classes

```python
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import List, Optional
import uuid

@dataclass
class EventMetadata:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat().replace("+00:00", "Z"))
    version: str = "1.0"
    source: str = ""
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None

@dataclass
class DomainEvent:
    metadata: EventMetadata = field(default_factory=EventMetadata)

    def __post_init__(self):
        if not self.metadata.event_type:
            self.metadata.event_type = f"{self.__module__}.{self.__class__.__name__}"

@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price: float

@dataclass
class OrderData:
    order_id: str = ""
    customer_id: str = ""
    items: List[OrderItem] = field(default_factory=list)
    total_amount: float = 0.0
    currency: str = "USD"

@dataclass
class OrderCreatedEvent(DomainEvent):
    data: OrderData = field(default_factory=OrderData)

    def __post_init__(self):
        super().__post_init__()
        self.metadata.source = "order-service"

# Usage

event = OrderCreatedEvent(
    data=OrderData(
        order_id="order-123",
        customer_id="customer-456",
        items=[OrderItem("prod-1", 2, 29.99)],
        total_amount=59.98
    )
)
```

## Schema Evolution Guidelines

### Safe Changes
- Add optional fields with defaults
- Add new event types
- Deprecate fields (but keep them)

### Breaking Changes (Avoid)
- Remove required fields
- Change field types
- Rename fields without aliases

### Versioning Strategy

```json
{
  "metadata": {
    "eventType": "orders.Order.Created",
    "version": "2.0"
  },
  "data": {
    "v1_compatible_fields": {},
    "v2_new_fields": {}
  }
}
```

## Event Catalog

Document your events:

```yaml
# event-catalog.yaml
events:
  - name: OrderCreated
    domain: orders
    version: "1.0"
    description: "Emitted when a new order is created"
    producers:
      - order-service
    consumers:
      - payment-service
      - inventory-service
      - notification-service
    schema: schemas/order-created-v1.avsc
    examples:
      - examples/order-created-example.json
```

## Best Practices

1. **Include metadata**: Event ID, timestamp, type, version, correlation ID
2. **Use past tense**: OrderCreated, PaymentProcessed, not CreateOrder
3. **Be specific**: CustomerEmailChanged, not CustomerUpdated
4. **Include what changed**: Include old and new values when relevant
5. **Use semantic versioning**: Major.Minor for schema versions
6. **Document thoroughly**: Maintain an event catalog

## Conclusion

Good event schema design is crucial for maintainable event-driven systems. By following consistent naming conventions, including proper metadata, and planning for evolution, you can build schemas that serve your system well over time.
