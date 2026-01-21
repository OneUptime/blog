# How to Implement Event Versioning in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Event Versioning, Schema Evolution, Event-Driven Architecture, Breaking Changes, Migration

Description: A comprehensive guide to implementing event versioning in Apache Kafka, covering strategies for handling breaking changes, version migrations, and maintaining backward compatibility.

---

Event versioning is essential for evolving event-driven systems without breaking existing consumers. This guide covers strategies for versioning events in Kafka while maintaining system stability.

## Why Event Versioning Matters

- **System evolution**: Business requirements change over time
- **Multiple consumers**: Different services may need different versions
- **Backward compatibility**: Old consumers must continue working
- **Migration flexibility**: Gradual rollout of new versions

## Versioning Strategies

### Strategy 1: Version in Event Type

```json
{
  "eventType": "com.example.orders.OrderCreated.v2",
  "data": {
    "orderId": "order-123",
    "customerInfo": {
      "id": "customer-456",
      "email": "customer@example.com"
    }
  }
}
```

### Strategy 2: Version in Metadata

```json
{
  "metadata": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "eventType": "OrderCreated",
    "version": "2.0",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "data": {}
}
```

### Strategy 3: Separate Topics per Version

```
orders-events-v1
orders-events-v2
orders-events-v3
```

## Java Implementation

### Version Router

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class EventVersionRouter {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, EventHandler> handlers = new HashMap<>();

    public void registerHandler(String version, EventHandler handler) {
        handlers.put(version, handler);
    }

    public void processEvent(String eventJson) throws Exception {
        JsonNode event = mapper.readTree(eventJson);
        String version = extractVersion(event);

        EventHandler handler = handlers.get(version);
        if (handler != null) {
            handler.handle(event);
        } else {
            // Use default handler or throw exception
            handleUnknownVersion(version, event);
        }
    }

    private String extractVersion(JsonNode event) {
        // Check metadata version first
        if (event.has("metadata") && event.get("metadata").has("version")) {
            return event.get("metadata").get("version").asText();
        }

        // Check event type for version suffix
        if (event.has("eventType")) {
            String eventType = event.get("eventType").asText();
            if (eventType.contains(".v")) {
                return eventType.substring(eventType.lastIndexOf(".v") + 2);
            }
        }

        return "1.0"; // Default version
    }

    private void handleUnknownVersion(String version, JsonNode event) {
        System.out.println("Unknown version: " + version);
        // Could: log, send to DLQ, or attempt best-effort processing
    }
}

interface EventHandler {
    void handle(JsonNode event) throws Exception;
}
```

### Versioned Event Classes

```java
// Base event with version support
public abstract class VersionedEvent {
    private EventMetadata metadata;

    public abstract String getSchemaVersion();

    public EventMetadata getMetadata() { return metadata; }
    public void setMetadata(EventMetadata metadata) { this.metadata = metadata; }
}

// V1 Order Created Event
public class OrderCreatedEventV1 extends VersionedEvent {
    private String orderId;
    private String customerId;
    private BigDecimal amount;

    @Override
    public String getSchemaVersion() { return "1.0"; }

    // Getters and setters
}

// V2 Order Created Event - breaking change: customerInfo object
public class OrderCreatedEventV2 extends VersionedEvent {
    private String orderId;
    private CustomerInfo customerInfo;  // Changed from customerId
    private MonetaryAmount amount;       // Changed from BigDecimal

    @Override
    public String getSchemaVersion() { return "2.0"; }

    // Getters and setters
}

public class CustomerInfo {
    private String id;
    private String email;
    private String name;
    // Getters and setters
}

public class MonetaryAmount {
    private BigDecimal value;
    private String currency;
    // Getters and setters
}
```

### Event Upcaster (Version Transformer)

```java
public class EventUpcaster {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Transform V1 event to V2 format
     */
    public OrderCreatedEventV2 upcastV1ToV2(OrderCreatedEventV1 v1Event) {
        OrderCreatedEventV2 v2Event = new OrderCreatedEventV2();

        // Copy metadata
        EventMetadata metadata = v1Event.getMetadata();
        metadata.setVersion("2.0");
        v2Event.setMetadata(metadata);

        // Transform fields
        v2Event.setOrderId(v1Event.getOrderId());

        // Convert customerId to customerInfo
        CustomerInfo customerInfo = new CustomerInfo();
        customerInfo.setId(v1Event.getCustomerId());
        v2Event.setCustomerInfo(customerInfo);

        // Convert amount to MonetaryAmount
        MonetaryAmount amount = new MonetaryAmount();
        amount.setValue(v1Event.getAmount());
        amount.setCurrency("USD"); // Default currency
        v2Event.setAmount(amount);

        return v2Event;
    }

    /**
     * Generic upcast from JSON
     */
    public String upcastEvent(String eventJson, String targetVersion) throws Exception {
        JsonNode event = mapper.readTree(eventJson);
        String currentVersion = event.get("metadata").get("version").asText();

        if (currentVersion.equals(targetVersion)) {
            return eventJson;
        }

        // Chain upcasts
        JsonNode transformed = event;
        if (currentVersion.equals("1.0") && targetVersion.equals("2.0")) {
            transformed = upcastV1ToV2Json(event);
        }

        return mapper.writeValueAsString(transformed);
    }

    private JsonNode upcastV1ToV2Json(JsonNode v1Event) {
        ObjectNode v2Event = mapper.createObjectNode();

        // Copy and update metadata
        ObjectNode metadata = (ObjectNode) v1Event.get("metadata").deepCopy();
        metadata.put("version", "2.0");
        v2Event.set("metadata", metadata);

        // Transform data
        ObjectNode data = mapper.createObjectNode();
        JsonNode v1Data = v1Event.get("data");

        data.put("orderId", v1Data.get("orderId").asText());

        // Transform customerId to customerInfo
        ObjectNode customerInfo = mapper.createObjectNode();
        customerInfo.put("id", v1Data.get("customerId").asText());
        data.set("customerInfo", customerInfo);

        // Transform amount to MonetaryAmount
        ObjectNode amount = mapper.createObjectNode();
        amount.put("value", v1Data.get("amount").asDouble());
        amount.put("currency", "USD");
        data.set("amount", amount);

        v2Event.set("data", data);

        return v2Event;
    }
}
```

### Multi-Version Consumer

```java
public class MultiVersionConsumer {

    private final KafkaConsumer<String, String> consumer;
    private final ObjectMapper mapper = new ObjectMapper();
    private final EventUpcaster upcaster = new EventUpcaster();

    public MultiVersionConsumer(Properties props) {
        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                try {
                    processEvent(record.value());
                } catch (Exception e) {
                    handleError(record, e);
                }
            }
        }
    }

    private void processEvent(String eventJson) throws Exception {
        JsonNode event = mapper.readTree(eventJson);
        String version = event.get("metadata").get("version").asText();

        // Always process as latest version
        String upcastedEvent = upcaster.upcastEvent(eventJson, "2.0");
        OrderCreatedEventV2 orderEvent = mapper.readValue(
            mapper.readTree(upcastedEvent).get("data").toString(),
            OrderCreatedEventV2.class
        );

        // Process the event
        System.out.printf("Processing order: %s for customer: %s%n",
            orderEvent.getOrderId(),
            orderEvent.getCustomerInfo().getId());
    }

    private void handleError(ConsumerRecord<String, String> record, Exception e) {
        System.err.println("Failed to process: " + record.key());
        e.printStackTrace();
    }
}
```

## Python Implementation

```python
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, Callable
from abc import ABC, abstractmethod
import json
from datetime import datetime
import uuid

@dataclass
class EventMetadata:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    version: str = "1.0"
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class VersionedEvent(ABC):
    @abstractmethod
    def get_schema_version(self) -> str:
        pass

# V1 Event
@dataclass
class OrderCreatedEventV1(VersionedEvent):
    metadata: EventMetadata = field(default_factory=EventMetadata)
    order_id: str = ""
    customer_id: str = ""
    amount: float = 0.0

    def get_schema_version(self) -> str:
        return "1.0"

# V2 Event
@dataclass
class CustomerInfo:
    id: str = ""
    email: str = ""
    name: str = ""

@dataclass
class MonetaryAmount:
    value: float = 0.0
    currency: str = "USD"

@dataclass
class OrderCreatedEventV2(VersionedEvent):
    metadata: EventMetadata = field(default_factory=EventMetadata)
    order_id: str = ""
    customer_info: CustomerInfo = field(default_factory=CustomerInfo)
    amount: MonetaryAmount = field(default_factory=MonetaryAmount)

    def get_schema_version(self) -> str:
        return "2.0"


class EventUpcaster:
    """Transforms events from older versions to newer versions"""

    def upcast_v1_to_v2(self, v1_event: OrderCreatedEventV1) -> OrderCreatedEventV2:
        """Transform V1 event to V2 format"""
        v2_event = OrderCreatedEventV2(
            metadata=EventMetadata(
                event_id=v1_event.metadata.event_id,
                event_type=v1_event.metadata.event_type,
                version="2.0",
                timestamp=v1_event.metadata.timestamp
            ),
            order_id=v1_event.order_id,
            customer_info=CustomerInfo(id=v1_event.customer_id),
            amount=MonetaryAmount(value=v1_event.amount, currency="USD")
        )
        return v2_event

    def upcast_json(self, event_json: str, target_version: str) -> str:
        """Upcast event JSON to target version"""
        event = json.loads(event_json)
        current_version = event.get("metadata", {}).get("version", "1.0")

        if current_version == target_version:
            return event_json

        # Chain upcasts
        if current_version == "1.0" and target_version == "2.0":
            return json.dumps(self._upcast_v1_to_v2_json(event))

        return event_json

    def _upcast_v1_to_v2_json(self, v1_event: Dict) -> Dict:
        """Transform V1 JSON to V2 format"""
        v1_data = v1_event.get("data", {})

        return {
            "metadata": {
                **v1_event.get("metadata", {}),
                "version": "2.0"
            },
            "data": {
                "orderId": v1_data.get("orderId"),
                "customerInfo": {
                    "id": v1_data.get("customerId"),
                    "email": "",
                    "name": ""
                },
                "amount": {
                    "value": v1_data.get("amount", 0),
                    "currency": "USD"
                }
            }
        }


class EventVersionRouter:
    """Routes events to appropriate handlers based on version"""

    def __init__(self):
        self.handlers: Dict[str, Callable] = {}
        self.upcaster = EventUpcaster()

    def register_handler(self, version: str, handler: Callable):
        self.handlers[version] = handler

    def process_event(self, event_json: str):
        event = json.loads(event_json)
        version = self._extract_version(event)

        handler = self.handlers.get(version)
        if handler:
            handler(event)
        else:
            self._handle_unknown_version(version, event)

    def _extract_version(self, event: Dict) -> str:
        # Check metadata version
        if "metadata" in event and "version" in event["metadata"]:
            return event["metadata"]["version"]

        # Check event type for version suffix
        event_type = event.get("eventType", "")
        if ".v" in event_type:
            return event_type.split(".v")[-1]

        return "1.0"

    def _handle_unknown_version(self, version: str, event: Dict):
        print(f"Unknown version: {version}")


class MultiVersionConsumer:
    """Consumer that handles multiple event versions"""

    def __init__(self, bootstrap_servers: str, group_id: str):
        from confluent_kafka import Consumer

        self.consumer = Consumer({
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest'
        })
        self.upcaster = EventUpcaster()

    def consume(self, topic: str, target_version: str = "2.0"):
        self.consumer.subscribe([topic])

        while True:
            msg = self.consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                print(f"Error: {msg.error()}")
                continue

            try:
                event_json = msg.value().decode('utf-8')
                # Upcast to target version
                upcasted = self.upcaster.upcast_json(event_json, target_version)
                self._process_event(upcasted)
            except Exception as e:
                print(f"Failed to process: {e}")

    def _process_event(self, event_json: str):
        event = json.loads(event_json)
        data = event.get("data", {})
        print(f"Processing order: {data.get('orderId')} "
              f"for customer: {data.get('customerInfo', {}).get('id')}")


# Example usage
def main():
    # Create router with version-specific handlers
    router = EventVersionRouter()

    def handle_v1(event):
        print(f"V1 Handler: {event}")

    def handle_v2(event):
        print(f"V2 Handler: {event}")

    router.register_handler("1.0", handle_v1)
    router.register_handler("2.0", handle_v2)

    # Test with V1 event
    v1_event = json.dumps({
        "metadata": {"version": "1.0", "eventType": "OrderCreated"},
        "data": {"orderId": "123", "customerId": "456", "amount": 99.99}
    })

    router.process_event(v1_event)

    # Upcast V1 to V2
    upcaster = EventUpcaster()
    v2_event = upcaster.upcast_json(v1_event, "2.0")
    print(f"Upcasted event: {v2_event}")


if __name__ == '__main__':
    main()
```

## Migration Strategies

### Dual-Write Pattern

```java
public class DualWriteProducer {

    private final KafkaProducer<String, String> producer;
    private final ObjectMapper mapper = new ObjectMapper();

    public void publishOrder(OrderCreatedEventV2 event) throws Exception {
        String key = event.getOrderId();

        // Write V2 to new topic
        producer.send(new ProducerRecord<>("orders-v2", key,
            mapper.writeValueAsString(event)));

        // Convert and write V1 to old topic for backward compatibility
        OrderCreatedEventV1 v1Event = downcastToV1(event);
        producer.send(new ProducerRecord<>("orders-v1", key,
            mapper.writeValueAsString(v1Event)));
    }

    private OrderCreatedEventV1 downcastToV1(OrderCreatedEventV2 v2Event) {
        OrderCreatedEventV1 v1Event = new OrderCreatedEventV1();
        v1Event.setOrderId(v2Event.getOrderId());
        v1Event.setCustomerId(v2Event.getCustomerInfo().getId());
        v1Event.setAmount(v2Event.getAmount().getValue());
        return v1Event;
    }
}
```

### Gradual Migration with Consumer Groups

```java
public class MigrationConsumer {

    public void startMigration(String oldTopic, String newTopic, String targetVersion) {
        // Phase 1: Read from old topic, upcast, write to new topic
        ExecutorService executor = Executors.newFixedThreadPool(2);

        // Old topic consumer
        executor.submit(() -> {
            KafkaConsumer<String, String> consumer = createConsumer("migration-old");
            consumer.subscribe(Collections.singletonList(oldTopic));

            while (!Thread.interrupted()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                for (ConsumerRecord<String, String> record : records) {
                    String upcasted = upcaster.upcastEvent(record.value(), targetVersion);
                    producer.send(new ProducerRecord<>(newTopic, record.key(), upcasted));
                }
                consumer.commitSync();
            }
        });

        // New topic consumer (for application processing)
        executor.submit(() -> {
            KafkaConsumer<String, String> consumer = createConsumer("migration-new");
            consumer.subscribe(Collections.singletonList(newTopic));

            while (!Thread.interrupted()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                for (ConsumerRecord<String, String> record : records) {
                    processLatestVersion(record.value());
                }
            }
        });
    }
}
```

## Best Practices

1. **Use semantic versioning**: Major.Minor for breaking vs non-breaking changes
2. **Document all versions**: Maintain a version changelog
3. **Test upcasters thoroughly**: Ensure data integrity during transformation
4. **Support N-1 versions**: At minimum, support current and previous version
5. **Use schema registry**: Leverage Avro/Protobuf for evolution support
6. **Plan deprecation**: Set timelines for version sunsets

## Conclusion

Event versioning is critical for evolving event-driven systems. By implementing version routing, upcasting, and migration strategies, you can evolve your events without disrupting existing consumers. Choose the strategy that best fits your system's needs and consumer landscape.
