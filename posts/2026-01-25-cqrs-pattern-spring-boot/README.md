# How to Implement CQRS Pattern in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, CQRS, Architecture, Event Sourcing

Description: A practical guide to implementing the Command Query Responsibility Segregation (CQRS) pattern in Spring Boot, with working code examples and real-world considerations for separating your read and write models.

---

If you've ever worked on a system where the data model that's perfect for writes becomes a nightmare for reads, CQRS might be the answer. Command Query Responsibility Segregation is an architectural pattern that separates the responsibility for reading data from the responsibility for writing it. Instead of forcing a single model to serve both purposes, you build two: one optimized for commands (writes), another optimized for queries (reads).

This guide walks through a practical implementation in Spring Boot. We'll build a simple order management system where commands and queries take different paths through your application.

## Why Consider CQRS?

Most CRUD applications start with a single model that handles everything. That works fine until your read and write requirements diverge. Common signs you might benefit from CQRS:

- Your read queries need denormalized data, but your write model is normalized for consistency
- Read and write workloads scale differently
- You need different optimization strategies for reads vs. writes
- Complex domain logic on the write side makes the read path confusing

CQRS isn't free, though. You're trading simplicity for flexibility. For many applications, a well-designed single model is perfectly adequate. But when the fit is right, CQRS can dramatically simplify both sides of your data access layer.

## Project Structure

We'll organize the code to make the separation explicit:

```
src/main/java/com/example/orders/
├── command/
│   ├── CreateOrderCommand.java
│   ├── OrderCommandHandler.java
│   └── OrderWriteRepository.java
├── query/
│   ├── OrderQueryService.java
│   ├── OrderReadRepository.java
│   └── OrderView.java
├── domain/
│   └── Order.java
└── api/
    └── OrderController.java
```

The `command` package handles all write operations. The `query` package handles reads. They share the underlying database but use different models and repositories.

## The Domain Model

First, let's define our core domain entity:

```java
// domain/Order.java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String customerId;
    private String productId;
    private Integer quantity;
    private BigDecimal totalPrice;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Protected constructor for JPA
    protected Order() {}

    // Factory method enforces business rules on creation
    public static Order create(String customerId, String productId,
                               Integer quantity, BigDecimal unitPrice) {
        Order order = new Order();
        order.customerId = customerId;
        order.productId = productId;
        order.quantity = quantity;
        order.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        order.status = OrderStatus.PENDING;
        order.createdAt = LocalDateTime.now();
        order.updatedAt = order.createdAt;
        return order;
    }

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("Only pending orders can be confirmed");
        }
        this.status = OrderStatus.CONFIRMED;
        this.updatedAt = LocalDateTime.now();
    }

    // Getters omitted for brevity
}
```

## The Command Side

Commands represent intentions to change state. Each command is a simple data class:

```java
// command/CreateOrderCommand.java
public record CreateOrderCommand(
    String customerId,
    String productId,
    Integer quantity,
    BigDecimal unitPrice
) {}
```

The command handler contains the business logic for processing commands:

```java
// command/OrderCommandHandler.java
@Service
@Transactional
public class OrderCommandHandler {

    private final OrderWriteRepository writeRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderCommandHandler(OrderWriteRepository writeRepository,
                               ApplicationEventPublisher eventPublisher) {
        this.writeRepository = writeRepository;
        this.eventPublisher = eventPublisher;
    }

    public UUID handle(CreateOrderCommand command) {
        // Apply business rules and create the aggregate
        Order order = Order.create(
            command.customerId(),
            command.productId(),
            command.quantity(),
            command.unitPrice()
        );

        // Persist the order
        writeRepository.save(order);

        // Publish an event so the read side can update
        eventPublisher.publishEvent(new OrderCreatedEvent(
            order.getId(),
            order.getCustomerId(),
            order.getProductId(),
            order.getQuantity(),
            order.getTotalPrice(),
            order.getStatus()
        ));

        return order.getId();
    }

    public void handle(ConfirmOrderCommand command) {
        Order order = writeRepository.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));

        order.confirm();
        writeRepository.save(order);

        eventPublisher.publishEvent(new OrderConfirmedEvent(order.getId()));
    }
}
```

The write repository is straightforward:

```java
// command/OrderWriteRepository.java
@Repository
public interface OrderWriteRepository extends JpaRepository<Order, UUID> {
    // Write-focused methods only
}
```

## The Query Side

The query side uses a different model optimized for reading. This view can be denormalized and shaped exactly how consumers need it:

```java
// query/OrderView.java
@Entity
@Table(name = "order_views")
public class OrderView {

    @Id
    private UUID orderId;
    private String customerId;
    private String customerName;  // Denormalized from customer service
    private String productId;
    private String productName;   // Denormalized from product service
    private Integer quantity;
    private BigDecimal totalPrice;
    private String status;
    private LocalDateTime createdAt;

    // Getters and setters
}
```

The query service provides read-optimized methods:

```java
// query/OrderQueryService.java
@Service
@Transactional(readOnly = true)
public class OrderQueryService {

    private final OrderReadRepository readRepository;

    public OrderQueryService(OrderReadRepository readRepository) {
        this.readRepository = readRepository;
    }

    public Optional<OrderView> findById(UUID orderId) {
        return readRepository.findById(orderId);
    }

    public List<OrderView> findByCustomer(String customerId) {
        return readRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public Page<OrderView> findPendingOrders(Pageable pageable) {
        return readRepository.findByStatus("PENDING", pageable);
    }
}
```

The read repository can include complex queries without affecting the write side:

```java
// query/OrderReadRepository.java
@Repository
public interface OrderReadRepository extends JpaRepository<OrderView, UUID> {

    List<OrderView> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    Page<OrderView> findByStatus(String status, Pageable pageable);

    @Query("SELECT o FROM OrderView o WHERE o.totalPrice > :minAmount")
    List<OrderView> findHighValueOrders(@Param("minAmount") BigDecimal minAmount);
}
```

## Synchronizing Read and Write Models

The read model needs to stay in sync with writes. We use Spring's event system for this:

```java
// query/OrderViewProjection.java
@Component
public class OrderViewProjection {

    private final OrderReadRepository readRepository;
    private final CustomerClient customerClient;  // Fetches customer details
    private final ProductClient productClient;    // Fetches product details

    public OrderViewProjection(OrderReadRepository readRepository,
                               CustomerClient customerClient,
                               ProductClient productClient) {
        this.readRepository = readRepository;
        this.customerClient = customerClient;
        this.productClient = productClient;
    }

    @EventListener
    @Transactional
    public void on(OrderCreatedEvent event) {
        // Build the denormalized view
        OrderView view = new OrderView();
        view.setOrderId(event.orderId());
        view.setCustomerId(event.customerId());
        view.setCustomerName(customerClient.getCustomerName(event.customerId()));
        view.setProductId(event.productId());
        view.setProductName(productClient.getProductName(event.productId()));
        view.setQuantity(event.quantity());
        view.setTotalPrice(event.totalPrice());
        view.setStatus(event.status().name());
        view.setCreatedAt(LocalDateTime.now());

        readRepository.save(view);
    }

    @EventListener
    @Transactional
    public void on(OrderConfirmedEvent event) {
        readRepository.findById(event.orderId()).ifPresent(view -> {
            view.setStatus("CONFIRMED");
            readRepository.save(view);
        });
    }
}
```

## The REST API

The controller wires everything together, routing commands and queries appropriately:

```java
// api/OrderController.java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderCommandHandler commandHandler;
    private final OrderQueryService queryService;

    public OrderController(OrderCommandHandler commandHandler,
                          OrderQueryService queryService) {
        this.commandHandler = commandHandler;
        this.queryService = queryService;
    }

    // Command endpoints
    @PostMapping
    public ResponseEntity<UUID> createOrder(@RequestBody CreateOrderCommand command) {
        UUID orderId = commandHandler.handle(command);
        return ResponseEntity.created(URI.create("/api/orders/" + orderId))
                           .body(orderId);
    }

    @PostMapping("/{orderId}/confirm")
    public ResponseEntity<Void> confirmOrder(@PathVariable UUID orderId) {
        commandHandler.handle(new ConfirmOrderCommand(orderId));
        return ResponseEntity.ok().build();
    }

    // Query endpoints
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderView> getOrder(@PathVariable UUID orderId) {
        return queryService.findById(orderId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<OrderView> getCustomerOrders(@RequestParam String customerId) {
        return queryService.findByCustomer(customerId);
    }
}
```

## Handling Eventual Consistency

With CQRS, there's typically a delay between when a command completes and when the read model reflects the change. This is eventual consistency, and you need to account for it:

1. **Return IDs from commands** - so clients can poll for the created resource
2. **Use optimistic UI updates** - show the expected result immediately, then reconcile
3. **Add correlation IDs** - to track commands through to their read model updates
4. **Consider read-your-writes patterns** - redirect to the write database for immediate reads after a write

## When to Skip CQRS

CQRS adds complexity. Skip it when:

- Your read and write models are essentially the same
- You don't have significant scale differences between reads and writes
- Your team is small and the cognitive overhead isn't worth it
- You're building a prototype or MVP

## Wrapping Up

CQRS is a powerful pattern when your application's read and write requirements genuinely differ. The key insight is that you don't have to force one model to do everything. By separating concerns, you can optimize each path independently.

Start simple. You can introduce CQRS incrementally, applying it only to the parts of your system that benefit. The order management example here shows the mechanics, but the real value comes when you apply it to solve actual pain points in your domain.
