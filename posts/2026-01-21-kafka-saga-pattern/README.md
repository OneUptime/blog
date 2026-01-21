# How to Implement Saga Pattern with Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Saga Pattern, Distributed Transactions, Microservices, Event-Driven Architecture, Compensation

Description: A comprehensive guide to implementing the Saga pattern with Apache Kafka for managing distributed transactions across microservices.

---

The Saga pattern provides a way to manage distributed transactions across multiple microservices without using traditional two-phase commits. This guide covers how to implement sagas using Kafka as the messaging backbone.

## Understanding the Saga Pattern

A saga is a sequence of local transactions where each transaction publishes events that trigger the next transaction. If a transaction fails, compensating transactions are executed to undo previous changes.

## Saga Types

### Choreography-Based Saga
Services listen to events and react independently - no central coordinator.

### Orchestration-Based Saga
A central orchestrator coordinates the saga execution.

## Choreography Implementation

### Java Event Classes

```java
// Events
public abstract class OrderEvent {
    private String sagaId;
    private String orderId;
    private long timestamp;
    // Getters and setters
}

public class OrderCreatedEvent extends OrderEvent {
    private String customerId;
    private List<OrderItem> items;
    private BigDecimal totalAmount;
}

public class PaymentProcessedEvent extends OrderEvent {
    private String paymentId;
    private String status;
}

public class PaymentFailedEvent extends OrderEvent {
    private String reason;
}

public class InventoryReservedEvent extends OrderEvent {
    private List<String> reservationIds;
}

public class OrderCompletedEvent extends OrderEvent {}

public class OrderCancelledEvent extends OrderEvent {
    private String reason;
}
```

### Order Service

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class OrderService {

    private final KafkaProducer<String, String> producer;
    private final KafkaConsumer<String, String> consumer;
    private final ObjectMapper mapper = new ObjectMapper();

    public void createOrder(Order order) {
        String sagaId = UUID.randomUUID().toString();

        // Save order locally
        order.setStatus("PENDING");
        orderRepository.save(order);

        // Publish OrderCreatedEvent
        OrderCreatedEvent event = new OrderCreatedEvent();
        event.setSagaId(sagaId);
        event.setOrderId(order.getId());
        event.setCustomerId(order.getCustomerId());
        event.setItems(order.getItems());
        event.setTotalAmount(order.getTotalAmount());
        event.setTimestamp(System.currentTimeMillis());

        producer.send(new ProducerRecord<>("order-events",
            order.getId(), mapper.writeValueAsString(event)));
    }

    public void handlePaymentFailed(PaymentFailedEvent event) {
        // Compensate: Cancel the order
        Order order = orderRepository.findById(event.getOrderId());
        order.setStatus("CANCELLED");
        orderRepository.save(order);

        // Publish cancellation
        OrderCancelledEvent cancelEvent = new OrderCancelledEvent();
        cancelEvent.setSagaId(event.getSagaId());
        cancelEvent.setOrderId(event.getOrderId());
        cancelEvent.setReason("Payment failed: " + event.getReason());

        producer.send(new ProducerRecord<>("order-events",
            event.getOrderId(), mapper.writeValueAsString(cancelEvent)));
    }
}
```

### Payment Service

```java
public class PaymentService {

    @KafkaListener(topics = "order-events")
    public void handleOrderCreated(String message) {
        OrderCreatedEvent event = mapper.readValue(message, OrderCreatedEvent.class);

        try {
            // Process payment
            PaymentResult result = paymentGateway.charge(
                event.getCustomerId(),
                event.getTotalAmount()
            );

            // Publish success event
            PaymentProcessedEvent paymentEvent = new PaymentProcessedEvent();
            paymentEvent.setSagaId(event.getSagaId());
            paymentEvent.setOrderId(event.getOrderId());
            paymentEvent.setPaymentId(result.getPaymentId());
            paymentEvent.setStatus("SUCCESS");

            producer.send(new ProducerRecord<>("payment-events",
                event.getOrderId(), mapper.writeValueAsString(paymentEvent)));

        } catch (PaymentException e) {
            // Publish failure event
            PaymentFailedEvent failEvent = new PaymentFailedEvent();
            failEvent.setSagaId(event.getSagaId());
            failEvent.setOrderId(event.getOrderId());
            failEvent.setReason(e.getMessage());

            producer.send(new ProducerRecord<>("payment-events",
                event.getOrderId(), mapper.writeValueAsString(failEvent)));
        }
    }
}
```

## Orchestration Implementation

### Saga Orchestrator

```java
public class OrderSagaOrchestrator {

    private final Map<String, SagaState> sagaStates = new ConcurrentHashMap<>();

    public void startSaga(Order order) {
        String sagaId = UUID.randomUUID().toString();

        SagaState state = new SagaState();
        state.setSagaId(sagaId);
        state.setOrderId(order.getId());
        state.setCurrentStep(SagaStep.CREATE_ORDER);
        state.setStatus(SagaStatus.RUNNING);

        sagaStates.put(sagaId, state);

        // Execute first step
        executeStep(state);
    }

    private void executeStep(SagaState state) {
        switch (state.getCurrentStep()) {
            case CREATE_ORDER:
                sendCommand("order-commands", new CreateOrderCommand(state));
                break;
            case PROCESS_PAYMENT:
                sendCommand("payment-commands", new ProcessPaymentCommand(state));
                break;
            case RESERVE_INVENTORY:
                sendCommand("inventory-commands", new ReserveInventoryCommand(state));
                break;
            case COMPLETE:
                completeSaga(state);
                break;
        }
    }

    @KafkaListener(topics = "saga-responses")
    public void handleResponse(String message) {
        SagaResponse response = mapper.readValue(message, SagaResponse.class);
        SagaState state = sagaStates.get(response.getSagaId());

        if (response.isSuccess()) {
            state.setCurrentStep(state.getCurrentStep().next());
            executeStep(state);
        } else {
            // Start compensation
            startCompensation(state, response.getError());
        }
    }

    private void startCompensation(SagaState state, String reason) {
        state.setStatus(SagaStatus.COMPENSATING);

        // Execute compensations in reverse order
        List<SagaStep> completedSteps = state.getCompletedSteps();
        Collections.reverse(completedSteps);

        for (SagaStep step : completedSteps) {
            executeCompensation(state, step);
        }

        state.setStatus(SagaStatus.COMPENSATED);
    }

    private void executeCompensation(SagaState state, SagaStep step) {
        switch (step) {
            case CREATE_ORDER:
                sendCommand("order-commands", new CancelOrderCommand(state));
                break;
            case PROCESS_PAYMENT:
                sendCommand("payment-commands", new RefundPaymentCommand(state));
                break;
            case RESERVE_INVENTORY:
                sendCommand("inventory-commands", new ReleaseInventoryCommand(state));
                break;
        }
    }
}
```

## Python Implementation

```python
from confluent_kafka import Producer, Consumer
import json
from enum import Enum
from dataclasses import dataclass
from typing import List, Optional
import uuid

class SagaStep(Enum):
    CREATE_ORDER = 1
    PROCESS_PAYMENT = 2
    RESERVE_INVENTORY = 3
    COMPLETE = 4

@dataclass
class SagaState:
    saga_id: str
    order_id: str
    current_step: SagaStep
    completed_steps: List[SagaStep]
    status: str

class OrderSagaOrchestrator:
    def __init__(self, bootstrap_servers: str):
        self.producer = Producer({'bootstrap.servers': bootstrap_servers})
        self.sagas = {}

    def start_saga(self, order: dict) -> str:
        saga_id = str(uuid.uuid4())

        state = SagaState(
            saga_id=saga_id,
            order_id=order['id'],
            current_step=SagaStep.CREATE_ORDER,
            completed_steps=[],
            status='RUNNING'
        )

        self.sagas[saga_id] = state
        self._execute_step(state)
        return saga_id

    def _execute_step(self, state: SagaState):
        step = state.current_step

        if step == SagaStep.CREATE_ORDER:
            self._send_command('order-commands', {
                'type': 'CREATE_ORDER',
                'saga_id': state.saga_id,
                'order_id': state.order_id
            })
        elif step == SagaStep.PROCESS_PAYMENT:
            self._send_command('payment-commands', {
                'type': 'PROCESS_PAYMENT',
                'saga_id': state.saga_id,
                'order_id': state.order_id
            })
        elif step == SagaStep.RESERVE_INVENTORY:
            self._send_command('inventory-commands', {
                'type': 'RESERVE_INVENTORY',
                'saga_id': state.saga_id,
                'order_id': state.order_id
            })
        elif step == SagaStep.COMPLETE:
            self._complete_saga(state)

    def handle_response(self, response: dict):
        saga_id = response['saga_id']
        state = self.sagas.get(saga_id)

        if not state:
            return

        if response['success']:
            state.completed_steps.append(state.current_step)
            state.current_step = SagaStep(state.current_step.value + 1)
            self._execute_step(state)
        else:
            self._start_compensation(state, response['error'])

    def _start_compensation(self, state: SagaState, reason: str):
        state.status = 'COMPENSATING'

        for step in reversed(state.completed_steps):
            self._execute_compensation(state, step)

        state.status = 'COMPENSATED'

    def _execute_compensation(self, state: SagaState, step: SagaStep):
        compensations = {
            SagaStep.CREATE_ORDER: ('order-commands', 'CANCEL_ORDER'),
            SagaStep.PROCESS_PAYMENT: ('payment-commands', 'REFUND_PAYMENT'),
            SagaStep.RESERVE_INVENTORY: ('inventory-commands', 'RELEASE_INVENTORY')
        }

        topic, command_type = compensations[step]
        self._send_command(topic, {
            'type': command_type,
            'saga_id': state.saga_id,
            'order_id': state.order_id
        })

    def _send_command(self, topic: str, command: dict):
        self.producer.produce(topic, json.dumps(command).encode())
        self.producer.flush()

    def _complete_saga(self, state: SagaState):
        state.status = 'COMPLETED'
        print(f"Saga {state.saga_id} completed successfully")
```

## Best Practices

1. **Idempotent operations**: Ensure all operations can be safely retried
2. **Store saga state**: Persist saga state for recovery
3. **Use correlation IDs**: Track events across services
4. **Implement timeouts**: Handle stuck sagas
5. **Log everything**: Detailed logging for debugging

## Conclusion

The Saga pattern enables distributed transactions in microservices using Kafka. Whether using choreography for simple flows or orchestration for complex workflows, proper compensation handling and idempotency are essential for reliable saga execution.
