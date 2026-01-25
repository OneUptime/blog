# How to Implement Saga Pattern in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Saga Pattern, Distributed Transactions, Microservices

Description: A practical guide to implementing the Saga pattern in Spring Boot for managing distributed transactions across microservices, with working code examples using both choreography and orchestration approaches.

---

When you split a monolith into microservices, you lose the ability to wrap everything in a single database transaction. That ACID guarantee you relied on? Gone. Now your order service, payment service, and inventory service each have their own database, and you need a way to keep them consistent when things go wrong.

The Saga pattern solves this problem. Instead of one big transaction, you break the work into a series of local transactions. Each service does its part and publishes an event or calls the next service. If something fails midway, you execute compensating transactions to undo the previous steps.

This guide walks through implementing Sagas in Spring Boot using both the choreography approach (event-driven) and the orchestration approach (central coordinator).

---

## When to Use the Saga Pattern

Before diving into code, let's be clear about when Sagas make sense:

- You have multiple services that need to coordinate
- Each service owns its own data store
- You need eventual consistency (not strict ACID)
- Operations can be logically reversed with compensating actions

If you can get away with a single database and traditional transactions, do that. Sagas add complexity. Use them when distributed data ownership forces your hand.

---

## The Two Approaches

**Choreography**: Services communicate through events. Each service listens for events and decides what to do next. No central coordinator. Works well for simple flows with few participants.

**Orchestration**: A central orchestrator tells each service what to do and when. The orchestrator knows the full workflow and handles failures. Better for complex flows with many steps.

Let's implement both.

---

## Project Setup

We'll build an e-commerce order flow: Order Service creates an order, Payment Service charges the customer, and Inventory Service reserves stock. If any step fails, we roll back.

First, the Maven dependencies:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

---

## Choreography-Based Saga

In choreography, services react to events without a central brain. Let's start with the Order Service.

### Order Service - Publishing Events

```java
// OrderService.java
@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public OrderService(OrderRepository orderRepository,
                        KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.orderRepository = orderRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    public Order createOrder(OrderRequest request) {
        // Create order in PENDING state
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setProductId(request.getProductId());
        order.setQuantity(request.getQuantity());
        order.setAmount(request.getAmount());
        order.setStatus(OrderStatus.PENDING);

        Order savedOrder = orderRepository.save(order);

        // Publish event for other services to react
        OrderEvent event = new OrderEvent(
            savedOrder.getId(),
            savedOrder.getCustomerId(),
            savedOrder.getProductId(),
            savedOrder.getQuantity(),
            savedOrder.getAmount(),
            "ORDER_CREATED"
        );
        kafkaTemplate.send("order-events", event);

        return savedOrder;
    }

    // Compensating transaction - called when payment or inventory fails
    @KafkaListener(topics = "saga-rollback", groupId = "order-service")
    public void handleRollback(RollbackEvent event) {
        if (event.getOrderId() != null) {
            Order order = orderRepository.findById(event.getOrderId())
                .orElseThrow();
            order.setStatus(OrderStatus.CANCELLED);
            order.setFailureReason(event.getReason());
            orderRepository.save(order);
        }
    }
}
```

### Payment Service - Reacting to Events

```java
// PaymentService.java
@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "order-events", groupId = "payment-service")
    public void handleOrderEvent(OrderEvent event) {
        if (!"ORDER_CREATED".equals(event.getEventType())) {
            return;
        }

        try {
            // Attempt to process payment
            Payment payment = new Payment();
            payment.setOrderId(event.getOrderId());
            payment.setCustomerId(event.getCustomerId());
            payment.setAmount(event.getAmount());

            // Simulate payment processing - could fail
            boolean success = processPaymentWithProvider(payment);

            if (success) {
                payment.setStatus(PaymentStatus.COMPLETED);
                paymentRepository.save(payment);

                // Notify inventory service to proceed
                PaymentEvent paymentEvent = new PaymentEvent(
                    event.getOrderId(),
                    event.getProductId(),
                    event.getQuantity(),
                    "PAYMENT_COMPLETED"
                );
                kafkaTemplate.send("payment-events", paymentEvent);
            } else {
                throw new PaymentFailedException("Payment declined");
            }

        } catch (Exception e) {
            // Payment failed - trigger rollback
            RollbackEvent rollback = new RollbackEvent(
                event.getOrderId(),
                "Payment failed: " + e.getMessage()
            );
            kafkaTemplate.send("saga-rollback", rollback);
        }
    }

    // Compensating transaction
    @KafkaListener(topics = "saga-rollback", groupId = "payment-service")
    public void handleRollback(RollbackEvent event) {
        paymentRepository.findByOrderId(event.getOrderId())
            .ifPresent(payment -> {
                // Refund the payment
                refundPayment(payment);
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(payment);
            });
    }
}
```

### Inventory Service - Final Step

```java
// InventoryService.java
@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "payment-events", groupId = "inventory-service")
    public void handlePaymentEvent(PaymentEvent event) {
        if (!"PAYMENT_COMPLETED".equals(event.getEventType())) {
            return;
        }

        try {
            Inventory inventory = inventoryRepository
                .findByProductId(event.getProductId())
                .orElseThrow(() -> new ProductNotFoundException("Product not found"));

            if (inventory.getAvailableQuantity() < event.getQuantity()) {
                throw new InsufficientStockException("Not enough stock");
            }

            // Reserve the inventory
            inventory.setAvailableQuantity(
                inventory.getAvailableQuantity() - event.getQuantity()
            );
            inventory.setReservedQuantity(
                inventory.getReservedQuantity() + event.getQuantity()
            );
            inventoryRepository.save(inventory);

            // Saga completed successfully
            SagaCompleteEvent complete = new SagaCompleteEvent(
                event.getOrderId(),
                "ORDER_COMPLETED"
            );
            kafkaTemplate.send("saga-complete", complete);

        } catch (Exception e) {
            // Inventory reservation failed - trigger full rollback
            RollbackEvent rollback = new RollbackEvent(
                event.getOrderId(),
                "Inventory reservation failed: " + e.getMessage()
            );
            kafkaTemplate.send("saga-rollback", rollback);
        }
    }

    // Compensating transaction
    @KafkaListener(topics = "saga-rollback", groupId = "inventory-service")
    public void handleRollback(RollbackEvent event) {
        // Release any reserved inventory
        reservationRepository.findByOrderId(event.getOrderId())
            .ifPresent(this::releaseReservation);
    }
}
```

The choreography approach keeps services decoupled, but tracking the overall saga state becomes tricky. You need good observability to debug failures.

---

## Orchestration-Based Saga

With orchestration, a central service coordinates the entire flow. This makes the logic easier to follow and modify.

### Saga Orchestrator

```java
// OrderSagaOrchestrator.java
@Service
public class OrderSagaOrchestrator {

    private final OrderServiceClient orderClient;
    private final PaymentServiceClient paymentClient;
    private final InventoryServiceClient inventoryClient;
    private final SagaStateRepository sagaStateRepository;

    @Transactional
    public SagaResult executeSaga(OrderRequest request) {
        // Initialize saga state for tracking
        SagaState saga = new SagaState();
        saga.setStatus(SagaStatus.STARTED);
        saga.setRequest(request);
        sagaStateRepository.save(saga);

        List<Runnable> compensations = new ArrayList<>();

        try {
            // Step 1: Create the order
            Order order = orderClient.createOrder(request);
            saga.setOrderId(order.getId());
            saga.setCurrentStep("ORDER_CREATED");
            sagaStateRepository.save(saga);

            // Register compensation for this step
            compensations.add(() -> orderClient.cancelOrder(order.getId()));

            // Step 2: Process payment
            Payment payment = paymentClient.processPayment(
                order.getId(),
                request.getCustomerId(),
                request.getAmount()
            );
            saga.setPaymentId(payment.getId());
            saga.setCurrentStep("PAYMENT_COMPLETED");
            sagaStateRepository.save(saga);

            // Register compensation
            compensations.add(() -> paymentClient.refundPayment(payment.getId()));

            // Step 3: Reserve inventory
            Reservation reservation = inventoryClient.reserveStock(
                order.getId(),
                request.getProductId(),
                request.getQuantity()
            );
            saga.setReservationId(reservation.getId());
            saga.setCurrentStep("INVENTORY_RESERVED");
            saga.setStatus(SagaStatus.COMPLETED);
            sagaStateRepository.save(saga);

            return SagaResult.success(order.getId());

        } catch (Exception e) {
            // Something failed - execute compensations in reverse order
            saga.setStatus(SagaStatus.COMPENSATING);
            saga.setFailureReason(e.getMessage());
            sagaStateRepository.save(saga);

            executeCompensations(compensations, saga);

            saga.setStatus(SagaStatus.COMPENSATED);
            sagaStateRepository.save(saga);

            return SagaResult.failed(e.getMessage());
        }
    }

    private void executeCompensations(List<Runnable> compensations, SagaState saga) {
        // Execute in reverse order
        Collections.reverse(compensations);

        for (Runnable compensation : compensations) {
            try {
                compensation.run();
            } catch (Exception e) {
                // Log but continue with other compensations
                // In production, you might want to retry or alert
                log.error("Compensation failed for saga {}: {}",
                    saga.getId(), e.getMessage());
            }
        }
    }
}
```

### Handling Partial Failures

Real systems need to handle cases where compensations themselves fail. Here's a more robust approach:

```java
// SagaStep.java - Represents one step in the saga
public class SagaStep<T> {
    private final String name;
    private final Supplier<T> action;
    private final Consumer<T> compensation;
    private final int maxRetries;

    public SagaStep(String name, Supplier<T> action,
                    Consumer<T> compensation, int maxRetries) {
        this.name = name;
        this.action = action;
        this.compensation = compensation;
        this.maxRetries = maxRetries;
    }

    public T execute() {
        return action.get();
    }

    public void compensate(T result) {
        int attempts = 0;
        while (attempts < maxRetries) {
            try {
                compensation.accept(result);
                return;
            } catch (Exception e) {
                attempts++;
                if (attempts >= maxRetries) {
                    throw new CompensationFailedException(
                        "Failed to compensate step: " + name, e);
                }
                // Exponential backoff
                sleep(1000 * (long) Math.pow(2, attempts));
            }
        }
    }
}
```

### Using the Step Builder

```java
// Building the saga with typed steps
public SagaResult executeSaga(OrderRequest request) {
    SagaExecutor executor = new SagaExecutor();

    executor.addStep(new SagaStep<>(
        "create-order",
        () -> orderClient.createOrder(request),
        order -> orderClient.cancelOrder(order.getId()),
        3  // max retries for compensation
    ));

    executor.addStep(new SagaStep<>(
        "process-payment",
        () -> paymentClient.processPayment(/*...*/),
        payment -> paymentClient.refundPayment(payment.getId()),
        3
    ));

    executor.addStep(new SagaStep<>(
        "reserve-inventory",
        () -> inventoryClient.reserveStock(/*...*/),
        reservation -> inventoryClient.releaseReservation(reservation.getId()),
        3
    ));

    return executor.run();
}
```

---

## Idempotency is Critical

Distributed systems have unreliable networks. Messages get duplicated. Services retry. Your saga steps must be idempotent - running them multiple times should produce the same result as running them once.

```java
// Idempotent payment processing
@Transactional
public Payment processPayment(String idempotencyKey, PaymentRequest request) {
    // Check if we already processed this request
    Optional<Payment> existing = paymentRepository
        .findByIdempotencyKey(idempotencyKey);

    if (existing.isPresent()) {
        // Already processed - return the same result
        return existing.get();
    }

    // Process new payment
    Payment payment = new Payment();
    payment.setIdempotencyKey(idempotencyKey);
    // ... rest of processing

    return paymentRepository.save(payment);
}
```

---

## Monitoring Your Sagas

Without visibility into saga execution, debugging failures becomes painful. Add metrics and tracing:

```java
@Aspect
@Component
public class SagaMetricsAspect {

    private final MeterRegistry meterRegistry;

    @Around("@annotation(SagaStep)")
    public Object measureStep(ProceedingJoinPoint joinPoint) throws Throwable {
        String stepName = joinPoint.getSignature().getName();
        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            Object result = joinPoint.proceed();
            meterRegistry.counter("saga.step.success", "step", stepName).increment();
            return result;
        } catch (Exception e) {
            meterRegistry.counter("saga.step.failure", "step", stepName).increment();
            throw e;
        } finally {
            sample.stop(meterRegistry.timer("saga.step.duration", "step", stepName));
        }
    }
}
```

---

## Choosing Between Approaches

**Use Choreography when:**
- You have a simple flow with 2-3 services
- Services are owned by different teams
- You want maximum decoupling

**Use Orchestration when:**
- The flow has many steps or conditional logic
- You need clear visibility into saga state
- One team owns the entire business process

Most production systems end up with orchestration because debugging choreographed sagas across multiple services gets messy fast.

---

## Summary

The Saga pattern trades ACID guarantees for eventual consistency across services. Each step must be compensatable, and idempotency is not optional. Start with the orchestration approach unless you have a specific reason to prefer choreography.

Key takeaways:
- Store saga state persistently for recovery
- Make all operations idempotent
- Design compensations carefully - they must undo partial work
- Add comprehensive logging and metrics
- Test failure scenarios explicitly

Distributed transactions are hard. Sagas don't make them easy, but they make them possible.
