# How to Implement Event Sourcing with Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Event Sourcing, CQRS, Event Store, Domain Events, Microservices, Java

Description: A comprehensive guide to implementing event sourcing with Apache Kafka, covering event store design, aggregate reconstruction, snapshots, projections, and best practices for building event-driven systems.

---

Event sourcing stores the complete history of state changes as a sequence of events. Combined with Kafka's append-only log, this pattern enables powerful capabilities like audit trails, temporal queries, and system replay. This guide covers implementing event sourcing patterns with Kafka.

## Understanding Event Sourcing

### Core Concepts

- **Event**: Immutable record of something that happened
- **Event Store**: Append-only log of events (Kafka topic)
- **Aggregate**: Domain object reconstructed from events
- **Projection**: Read model built from events
- **Snapshot**: Checkpoint to speed up reconstruction

### Benefits

1. Complete audit trail
2. Temporal queries (what was state at time X?)
3. Debug by replaying events
4. Easy integration with other systems
5. Enables CQRS pattern

## Event Design

### Event Structure

```java
public abstract class DomainEvent {
    private final String eventId;
    private final String aggregateId;
    private final String eventType;
    private final long timestamp;
    private final int version;
    private final Map<String, String> metadata;

    protected DomainEvent(String aggregateId, String eventType, int version) {
        this.eventId = UUID.randomUUID().toString();
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.timestamp = System.currentTimeMillis();
        this.version = version;
        this.metadata = new HashMap<>();
    }

    // Getters...
}

// Concrete events
public class OrderCreated extends DomainEvent {
    private final String customerId;
    private final List<OrderItem> items;
    private final BigDecimal totalAmount;

    public OrderCreated(String orderId, String customerId,
                       List<OrderItem> items, BigDecimal totalAmount, int version) {
        super(orderId, "OrderCreated", version);
        this.customerId = customerId;
        this.items = items;
        this.totalAmount = totalAmount;
    }
}

public class OrderItemAdded extends DomainEvent {
    private final String productId;
    private final int quantity;
    private final BigDecimal price;

    public OrderItemAdded(String orderId, String productId,
                         int quantity, BigDecimal price, int version) {
        super(orderId, "OrderItemAdded", version);
        this.productId = productId;
        this.quantity = quantity;
        this.price = price;
    }
}

public class OrderConfirmed extends DomainEvent {
    private final LocalDateTime confirmedAt;

    public OrderConfirmed(String orderId, LocalDateTime confirmedAt, int version) {
        super(orderId, "OrderConfirmed", version);
        this.confirmedAt = confirmedAt;
    }
}

public class OrderCancelled extends DomainEvent {
    private final String reason;

    public OrderCancelled(String orderId, String reason, int version) {
        super(orderId, "OrderCancelled", version);
        this.reason = reason;
    }
}
```

### Event Serialization

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

public class EventSerializer {
    private final ObjectMapper mapper;

    public EventSerializer() {
        this.mapper = new ObjectMapper();
        mapper.activateDefaultTyping(
            BasicPolymorphicTypeValidator.builder()
                .allowIfBaseType(DomainEvent.class)
                .build(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        mapper.findAndRegisterModules();
    }

    public byte[] serialize(DomainEvent event) {
        try {
            return mapper.writeValueAsBytes(event);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize event", e);
        }
    }

    public DomainEvent deserialize(byte[] data) {
        try {
            return mapper.readValue(data, DomainEvent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize event", e);
        }
    }
}
```

## Event Store Implementation

### Kafka Event Store

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;

public class KafkaEventStore {
    private final Producer<String, byte[]> producer;
    private final Consumer<String, byte[]> consumer;
    private final EventSerializer serializer;
    private final String eventsTopic;

    public KafkaEventStore(String bootstrapServers, String eventsTopic) {
        this.eventsTopic = eventsTopic;
        this.serializer = new EventSerializer();

        // Producer configuration
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArraySerializer");
        producerProps.put(ProducerConfig.ACKS_CONFIG, "all");
        producerProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        this.producer = new KafkaProducer<>(producerProps);

        // Consumer configuration
        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArrayDeserializer");
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        this.consumer = new KafkaConsumer<>(consumerProps);
    }

    // Append event to store
    public void append(DomainEvent event) {
        ProducerRecord<String, byte[]> record = new ProducerRecord<>(
            eventsTopic,
            event.getAggregateId(),
            serializer.serialize(event)
        );

        // Add headers
        record.headers().add("eventType", event.getEventType().getBytes());
        record.headers().add("version", String.valueOf(event.getVersion()).getBytes());

        try {
            producer.send(record).get();  // Sync for consistency
        } catch (Exception e) {
            throw new RuntimeException("Failed to append event", e);
        }
    }

    // Append multiple events atomically
    public void appendAll(List<DomainEvent> events) {
        producer.beginTransaction();
        try {
            for (DomainEvent event : events) {
                append(event);
            }
            producer.commitTransaction();
        } catch (Exception e) {
            producer.abortTransaction();
            throw new RuntimeException("Failed to append events", e);
        }
    }

    // Load events for aggregate
    public List<DomainEvent> loadEvents(String aggregateId) {
        List<DomainEvent> events = new ArrayList<>();

        // Assign to all partitions
        List<TopicPartition> partitions = consumer.partitionsFor(eventsTopic)
            .stream()
            .map(info -> new TopicPartition(eventsTopic, info.partition()))
            .toList();
        consumer.assign(partitions);
        consumer.seekToBeginning(partitions);

        // Read all events for this aggregate
        boolean done = false;
        while (!done) {
            ConsumerRecords<String, byte[]> records = consumer.poll(Duration.ofMillis(1000));

            if (records.isEmpty()) {
                done = true;
            }

            for (ConsumerRecord<String, byte[]> record : records) {
                if (aggregateId.equals(record.key())) {
                    events.add(serializer.deserialize(record.value()));
                }
            }
        }

        // Sort by version
        events.sort(Comparator.comparingInt(DomainEvent::getVersion));
        return events;
    }

    // Load events after a specific version (for optimistic locking)
    public List<DomainEvent> loadEventsAfterVersion(String aggregateId, int version) {
        return loadEvents(aggregateId).stream()
            .filter(e -> e.getVersion() > version)
            .toList();
    }

    public void close() {
        producer.close();
        consumer.close();
    }
}
```

## Aggregate Implementation

### Base Aggregate Class

```java
public abstract class Aggregate {
    protected String id;
    protected int version = 0;
    private final List<DomainEvent> uncommittedEvents = new ArrayList<>();

    protected Aggregate() {}

    public String getId() { return id; }
    public int getVersion() { return version; }

    // Apply event and track as uncommitted
    protected void applyChange(DomainEvent event) {
        applyEvent(event);
        uncommittedEvents.add(event);
    }

    // Apply event without tracking (for reconstruction)
    protected abstract void applyEvent(DomainEvent event);

    // Get uncommitted events
    public List<DomainEvent> getUncommittedEvents() {
        return new ArrayList<>(uncommittedEvents);
    }

    // Clear uncommitted events after save
    public void markEventsAsCommitted() {
        uncommittedEvents.clear();
    }

    // Reconstruct from event history
    public void loadFromHistory(List<DomainEvent> history) {
        for (DomainEvent event : history) {
            applyEvent(event);
            version = event.getVersion();
        }
    }
}
```

### Order Aggregate

```java
public class Order extends Aggregate {
    private String customerId;
    private List<OrderItem> items = new ArrayList<>();
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private OrderStatus status = OrderStatus.DRAFT;

    // For reconstruction
    public Order() {}

    // Create new order
    public static Order create(String orderId, String customerId,
                               List<OrderItem> items) {
        Order order = new Order();
        order.id = orderId;

        BigDecimal total = items.stream()
            .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.applyChange(new OrderCreated(orderId, customerId, items, total, 1));
        return order;
    }

    // Add item
    public void addItem(String productId, int quantity, BigDecimal price) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify confirmed order");
        }
        applyChange(new OrderItemAdded(id, productId, quantity, price, version + 1));
    }

    // Confirm order
    public void confirm() {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Order already processed");
        }
        if (items.isEmpty()) {
            throw new IllegalStateException("Cannot confirm empty order");
        }
        applyChange(new OrderConfirmed(id, LocalDateTime.now(), version + 1));
    }

    // Cancel order
    public void cancel(String reason) {
        if (status == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Order already cancelled");
        }
        if (status == OrderStatus.SHIPPED) {
            throw new IllegalStateException("Cannot cancel shipped order");
        }
        applyChange(new OrderCancelled(id, reason, version + 1));
    }

    @Override
    protected void applyEvent(DomainEvent event) {
        switch (event) {
            case OrderCreated e -> {
                this.id = e.getAggregateId();
                this.customerId = e.getCustomerId();
                this.items = new ArrayList<>(e.getItems());
                this.totalAmount = e.getTotalAmount();
                this.status = OrderStatus.DRAFT;
            }
            case OrderItemAdded e -> {
                this.items.add(new OrderItem(e.getProductId(), e.getQuantity(), e.getPrice()));
                this.totalAmount = totalAmount.add(
                    e.getPrice().multiply(BigDecimal.valueOf(e.getQuantity())));
            }
            case OrderConfirmed e -> {
                this.status = OrderStatus.CONFIRMED;
            }
            case OrderCancelled e -> {
                this.status = OrderStatus.CANCELLED;
            }
            default -> throw new IllegalArgumentException("Unknown event type");
        }
        this.version = event.getVersion();
    }

    // Getters
    public String getCustomerId() { return customerId; }
    public List<OrderItem> getItems() { return Collections.unmodifiableList(items); }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public OrderStatus getStatus() { return status; }
}

enum OrderStatus {
    DRAFT, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}
```

## Repository Pattern

```java
public class OrderRepository {
    private final KafkaEventStore eventStore;

    public OrderRepository(KafkaEventStore eventStore) {
        this.eventStore = eventStore;
    }

    public void save(Order order) {
        List<DomainEvent> events = order.getUncommittedEvents();
        if (!events.isEmpty()) {
            // Optimistic locking check
            List<DomainEvent> existingEvents =
                eventStore.loadEventsAfterVersion(order.getId(), order.getVersion());
            if (!existingEvents.isEmpty()) {
                throw new ConcurrencyException("Order was modified by another process");
            }

            eventStore.appendAll(events);
            order.markEventsAsCommitted();
        }
    }

    public Optional<Order> findById(String orderId) {
        List<DomainEvent> events = eventStore.loadEvents(orderId);
        if (events.isEmpty()) {
            return Optional.empty();
        }

        Order order = new Order();
        order.loadFromHistory(events);
        return Optional.of(order);
    }
}
```

## Projections (Read Models)

### Projection Handler

```java
public class OrderProjectionHandler {
    private final Consumer<String, byte[]> consumer;
    private final EventSerializer serializer;
    private final OrderReadModelRepository readModelRepo;

    public void startProjection(String groupId) {
        consumer.subscribe(Collections.singletonList("events.orders"));

        while (true) {
            ConsumerRecords<String, byte[]> records = consumer.poll(Duration.ofMillis(100));

            for (ConsumerRecord<String, byte[]> record : records) {
                DomainEvent event = serializer.deserialize(record.value());
                projectEvent(event);
            }

            consumer.commitSync();
        }
    }

    private void projectEvent(DomainEvent event) {
        switch (event) {
            case OrderCreated e -> {
                OrderReadModel model = new OrderReadModel();
                model.setOrderId(e.getAggregateId());
                model.setCustomerId(e.getCustomerId());
                model.setTotalAmount(e.getTotalAmount());
                model.setStatus("DRAFT");
                model.setCreatedAt(Instant.ofEpochMilli(e.getTimestamp()));
                model.setItemCount(e.getItems().size());
                readModelRepo.save(model);
            }
            case OrderConfirmed e -> {
                readModelRepo.updateStatus(e.getAggregateId(), "CONFIRMED");
            }
            case OrderCancelled e -> {
                readModelRepo.updateStatus(e.getAggregateId(), "CANCELLED");
            }
            default -> { /* ignore other events */ }
        }
    }
}

// Read model for queries
public class OrderReadModel {
    private String orderId;
    private String customerId;
    private BigDecimal totalAmount;
    private String status;
    private Instant createdAt;
    private int itemCount;

    // Getters/setters...
}
```

## Snapshots

### Snapshot Store

```java
public class SnapshotStore {
    private final Producer<String, byte[]> producer;
    private final Consumer<String, byte[]> consumer;
    private final String snapshotTopic;

    public void saveSnapshot(Aggregate aggregate) {
        Snapshot snapshot = new Snapshot(
            aggregate.getId(),
            aggregate.getVersion(),
            serializeAggregate(aggregate),
            System.currentTimeMillis()
        );

        producer.send(new ProducerRecord<>(
            snapshotTopic,
            aggregate.getId(),
            serializeSnapshot(snapshot)
        ));
    }

    public Optional<Snapshot> loadLatestSnapshot(String aggregateId) {
        // Read from compacted snapshot topic
        // Return latest snapshot for aggregate
        return Optional.empty();
    }
}

// Enhanced repository with snapshots
public class SnapshotOrderRepository {
    private final KafkaEventStore eventStore;
    private final SnapshotStore snapshotStore;
    private final int snapshotFrequency = 100;

    public Optional<Order> findById(String orderId) {
        // Try to load from snapshot first
        Optional<Snapshot> snapshot = snapshotStore.loadLatestSnapshot(orderId);

        Order order;
        int fromVersion;

        if (snapshot.isPresent()) {
            order = deserializeOrder(snapshot.get().getData());
            fromVersion = snapshot.get().getVersion();
        } else {
            order = new Order();
            fromVersion = 0;
        }

        // Load events after snapshot
        List<DomainEvent> events = eventStore.loadEventsAfterVersion(orderId, fromVersion);
        order.loadFromHistory(events);

        return order.getId() != null ? Optional.of(order) : Optional.empty();
    }

    public void save(Order order) {
        eventStore.appendAll(order.getUncommittedEvents());

        // Create snapshot if needed
        if (order.getVersion() % snapshotFrequency == 0) {
            snapshotStore.saveSnapshot(order);
        }

        order.markEventsAsCommitted();
    }
}
```

## Best Practices

### 1. Design Events as Facts

```java
// Good - describes what happened
public class OrderShipped extends DomainEvent { }

// Bad - describes intent
public class ShipOrder extends DomainEvent { }
```

### 2. Include All Relevant Data

```java
// Good - event is self-contained
public class OrderCreated {
    private final String customerId;
    private final String customerName;  // Denormalized
    private final List<OrderItem> items;
    private final BigDecimal totalAmount;
}
```

### 3. Use Topic Per Aggregate Type

```
events.orders      -> Order events
events.customers   -> Customer events
events.inventory   -> Inventory events
```

### 4. Handle Schema Evolution

```java
// Add new optional fields with defaults
public class OrderCreated {
    private final String orderId;
    private final String customerId;
    private final String currency = "USD";  // New field with default
}
```

## Conclusion

Event sourcing with Kafka provides powerful capabilities:

1. **Complete history**: Every state change is recorded
2. **Temporal queries**: Query state at any point in time
3. **Audit trail**: Built-in compliance and debugging
4. **Event replay**: Rebuild projections or fix bugs
5. **Integration**: Natural fit for event-driven architectures

Start with simple aggregates, add projections for queries, and implement snapshots when event streams grow large.
