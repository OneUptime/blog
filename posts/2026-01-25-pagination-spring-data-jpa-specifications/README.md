# How to Build Pagination with Spring Data JPA Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Data JPA, Pagination, Specifications, Query

Description: Learn how to combine Spring Data JPA Specifications with pagination to build flexible, type-safe queries that scale. This guide covers dynamic filtering, sorting, and pagination patterns for real-world applications.

---

Building search functionality in a Spring Boot application usually starts simple. You add a few query methods to your repository, maybe a custom JPQL query, and call it done. But then requirements grow. Users want to filter by status, date range, and category - all at once or in any combination. Suddenly your repository is cluttered with dozens of method permutations, and adding a new filter means changing code in multiple places.

Specifications solve this problem by letting you compose query predicates dynamically. Combined with pagination, you get a clean pattern for building searchable, performant APIs. Here's how to put it together.

## The Problem with Static Query Methods

Consider a typical repository for managing orders:

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Start simple
    List<Order> findByStatus(OrderStatus status);

    // Then this happens
    List<Order> findByStatusAndCustomerId(OrderStatus status, Long customerId);
    List<Order> findByStatusAndCustomerIdAndCreatedAtBetween(
        OrderStatus status, Long customerId, LocalDateTime start, LocalDateTime end);
    List<Order> findByCustomerIdAndCreatedAtBetween(
        Long customerId, LocalDateTime start, LocalDateTime end);
    // ... and on it goes
}
```

This approach breaks down fast. Every new filter combination requires a new method. You can use `@Query` with conditional logic, but that gets messy too. Specifications give you composable building blocks instead.

## Setting Up Specifications

First, make your repository extend `JpaSpecificationExecutor`:

```java
public interface OrderRepository extends
    JpaRepository<Order, Long>,
    JpaSpecificationExecutor<Order> {
}
```

This adds methods like `findAll(Specification<Order> spec, Pageable pageable)` that accept dynamic query criteria.

Now create a specifications class. I prefer a dedicated class with static factory methods:

```java
public class OrderSpecifications {

    // Filter by status
    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) -> {
            if (status == null) {
                return cb.conjunction(); // Always true - no filter
            }
            return cb.equal(root.get("status"), status);
        };
    }

    // Filter by customer
    public static Specification<Order> hasCustomer(Long customerId) {
        return (root, query, cb) -> {
            if (customerId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("customerId"), customerId);
        };
    }

    // Filter by date range
    public static Specification<Order> createdBetween(
            LocalDateTime start, LocalDateTime end) {
        return (root, query, cb) -> {
            if (start == null && end == null) {
                return cb.conjunction();
            }
            if (start != null && end != null) {
                return cb.between(root.get("createdAt"), start, end);
            }
            if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("createdAt"), start);
            }
            return cb.lessThanOrEqualTo(root.get("createdAt"), end);
        };
    }

    // Search by order number or description
    public static Specification<Order> containsText(String searchTerm) {
        return (root, query, cb) -> {
            if (searchTerm == null || searchTerm.isBlank()) {
                return cb.conjunction();
            }
            String pattern = "%" + searchTerm.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("orderNumber")), pattern),
                cb.like(cb.lower(root.get("description")), pattern)
            );
        };
    }
}
```

Each method returns a `Specification<Order>` that encapsulates one filter. The lambda parameters give you access to the JPA Criteria API: `root` is your entity, `query` lets you modify the query structure, and `cb` (CriteriaBuilder) creates predicates.

## Combining Specifications with Pagination

Now wire it up in your service layer. The key is composing specifications with `and()` and passing a `Pageable`:

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Page<Order> searchOrders(OrderSearchRequest request) {
        // Build the composite specification
        Specification<Order> spec = Specification
            .where(OrderSpecifications.hasStatus(request.getStatus()))
            .and(OrderSpecifications.hasCustomer(request.getCustomerId()))
            .and(OrderSpecifications.createdBetween(
                request.getStartDate(), request.getEndDate()))
            .and(OrderSpecifications.containsText(request.getSearchTerm()));

        // Build pagination with sorting
        Pageable pageable = PageRequest.of(
            request.getPage(),
            request.getSize(),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return orderRepository.findAll(spec, pageable);
    }
}
```

The `Page<Order>` response includes everything you need: the content, total elements, total pages, and pagination metadata. Your controller can pass this directly to the frontend:

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public Page<Order> searchOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                LocalDateTime startDate,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        OrderSearchRequest request = new OrderSearchRequest(
            status, customerId, startDate, endDate, search, page, size);

        return orderService.searchOrders(request);
    }
}
```

## Handling Dynamic Sorting

Static sorting works for simple cases, but users often want to sort by different columns. Build the `Sort` object from request parameters:

```java
public Page<Order> searchOrders(OrderSearchRequest request) {
    Specification<Order> spec = buildSpecification(request);

    // Dynamic sorting with validation
    Sort sort = buildSort(request.getSortBy(), request.getSortDirection());
    Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

    return orderRepository.findAll(spec, pageable);
}

private Sort buildSort(String sortBy, String direction) {
    // Whitelist allowed sort fields to prevent injection
    Set<String> allowedFields = Set.of("createdAt", "orderNumber", "total", "status");

    String field = allowedFields.contains(sortBy) ? sortBy : "createdAt";
    Sort.Direction dir = "asc".equalsIgnoreCase(direction)
        ? Sort.Direction.ASC
        : Sort.Direction.DESC;

    return Sort.by(dir, field);
}
```

Always validate sort fields against a whitelist. Accepting arbitrary field names opens the door to errors or information disclosure.

## Joins and Related Entities

Specifications handle joins cleanly. Say you want to filter orders by customer name:

```java
public static Specification<Order> customerNameContains(String name) {
    return (root, query, cb) -> {
        if (name == null || name.isBlank()) {
            return cb.conjunction();
        }
        // Join to the customer entity
        Join<Order, Customer> customer = root.join("customer", JoinType.LEFT);
        return cb.like(
            cb.lower(customer.get("name")),
            "%" + name.toLowerCase() + "%"
        );
    };
}
```

For queries that fetch related entities, watch out for N+1 problems. Use fetch joins when you know you need the related data:

```java
public static Specification<Order> withCustomerFetched() {
    return (root, query, cb) -> {
        // Only fetch for the main query, not count queries
        if (query.getResultType() != Long.class) {
            root.fetch("customer", JoinType.LEFT);
        }
        return cb.conjunction();
    };
}
```

The `query.getResultType()` check prevents fetch joins from breaking the count query that Spring uses for pagination.

## Performance Considerations

A few things to watch:

**Index your filter columns.** Specifications generate normal SQL, and those WHERE clauses need index support. Run `EXPLAIN` on the generated queries to verify your indexes are being used.

**Limit page sizes.** Set a maximum in your controller to prevent clients from requesting 10,000 rows at once:

```java
int safeSize = Math.min(size, 100);
Pageable pageable = PageRequest.of(page, safeSize, sort);
```

**Consider count query cost.** The `Page` response requires a count query, which can be expensive on large tables. If you only need "has more" information, use `Slice` instead:

```java
Slice<Order> searchOrders(Specification<Order> spec, Pageable pageable);
```

Slices skip the count and just fetch one extra row to determine if more results exist.

## Wrapping Up

Specifications might feel like overkill for a simple CRUD app, but they pay off quickly as filtering requirements grow. The pattern scales well: adding a new filter means writing one specification method and composing it into your query. No repository changes, no combinatorial explosion of query methods.

The combination with pagination handles the mechanics of paging through results without loading everything into memory. Together they give you a solid foundation for building searchable APIs that stay maintainable as requirements evolve.

Start with the basics shown here, then extend as needed. The JPA Criteria API has more capabilities - subqueries, aggregations, multiselect projections - that you can tap into when simpler approaches fall short.
