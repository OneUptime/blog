# How to Use MongoDB with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring Boot, Java, Backend Development, Framework

Description: A practical guide to integrating MongoDB with Spring Boot using Spring Data MongoDB, including repositories, queries, aggregation, transactions, and validation.

---

## Overview

Spring Data MongoDB provides a high-level abstraction over the MongoDB Java driver. It integrates with Spring Boot's auto-configuration to set up connections automatically. You get repository interfaces, query derivation, `MongoTemplate` for advanced operations, and transaction support.

```mermaid
flowchart LR
    SpringBoot[Spring Boot App] --> SDM[Spring Data MongoDB]
    SDM --> Repo[MongoRepository]
    SDM --> Template[MongoTemplate]
    SDM --> Driver[MongoDB Java Driver]
    Driver --> MongoDB
    Repo --> CRUD[CRUD + Derived Queries]
    Template --> AGG[Aggregation + Custom Queries]
```

## Maven Dependency

Add to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

## Configuration

In `application.yml` (or `application.properties`):

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://admin:password@127.0.0.1:27017/myapp?authSource=admin
      auto-index-creation: true
```

For a replica set with transactions:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://admin:password@mongo1:27017,mongo2:27017,mongo3:27017/myapp?authSource=admin&replicaSet=rs0
```

Spring Boot auto-configures `MongoClient`, `MongoDatabase`, and `MongoTemplate` beans based on the `spring.data.mongodb.uri` property.

## Defining a Document Entity

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Document(collection = "orders")
@CompoundIndex(name = "customer_date_idx", def = "{'customerId': 1, 'createdAt': -1}")
public class Order {

    @Id
    private String id;

    @Indexed
    private String customerId;

    private BigDecimal total;
    private String status;
    private List<OrderItem> items;

    @Field("createdAt")
    private Instant createdAt;

    // Getters and setters...
}
```

```java
public class OrderItem {
    private String productId;
    private int quantity;
    private BigDecimal price;

    // Getters and setters...
}
```

## Repository Interface

Spring Data MongoDB generates the implementation at startup:

```java
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends MongoRepository<Order, String> {

    // Derived query from method name
    List<Order> findByStatus(String status);

    List<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    long countByStatus(String status);

    List<Order> findByCreatedAtBetween(Instant start, Instant end);

    List<Order> findByStatusIn(List<String> statuses);

    // Custom query with @Query
    @Query("{ 'status': ?0, 'total': { '$gte': ?1 } }")
    List<Order> findByStatusAndMinTotal(String status, double minTotal);

    // Projection query
    @Query(value = "{ 'status': ?0 }", fields = "{ 'customerId': 1, 'total': 1 }")
    List<Order> findSummaryByStatus(String status);
}
```

## Using the Repository

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.math.BigDecimal;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public Order createOrder(String customerId, BigDecimal total) {
        Order order = new Order();
        order.setCustomerId(customerId);
        order.setTotal(total);
        order.setStatus("pending");
        order.setCreatedAt(Instant.now());
        return orderRepository.save(order);
    }

    public List<Order> getPendingOrders() {
        return orderRepository.findByStatus("pending");
    }

    public void shipOrder(String orderId) {
        orderRepository.findById(orderId).ifPresent(order -> {
            order.setStatus("shipped");
            orderRepository.save(order);
        });
    }

    public void deleteOldCancelledOrders(Instant before) {
        List<Order> old = orderRepository.findByCreatedAtBetween(Instant.EPOCH, before);
        old.stream()
            .filter(o -> "cancelled".equals(o.getStatus()))
            .forEach(o -> orderRepository.deleteById(o.getId()));
    }
}
```

## MongoTemplate for Advanced Operations

`MongoTemplate` gives you direct access to queries, updates, and aggregations.

```java
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.domain.Sort;

@Service
public class AdvancedOrderService {

    @Autowired
    private MongoTemplate mongoTemplate;

    // Find with complex criteria
    public List<Order> findLargeRecentOrders(double minTotal) {
        Query query = new Query(
            Criteria.where("status").in("pending", "processing")
                    .and("total").gte(minTotal)
                    .and("createdAt").gte(Instant.now().minusSeconds(86400))
        ).limit(50);

        return mongoTemplate.find(query, Order.class);
    }

    // Update without loading the document
    public long markOldOrdersAsExpired() {
        Query query = new Query(
            Criteria.where("status").is("pending")
                    .and("createdAt").lt(Instant.now().minusSeconds(7 * 86400))
        );
        Update update = new Update()
            .set("status", "expired")
            .currentDate("updatedAt");

        return mongoTemplate.updateMulti(query, update, Order.class).getModifiedCount();
    }

    // Aggregation
    public List<CustomerSummary> getTopCustomers(int limit) {
        Aggregation agg = Aggregation.newAggregation(
            Aggregation.match(Criteria.where("status").is("completed")),
            Aggregation.group("customerId")
                .sum("total").as("totalSpent")
                .count().as("orderCount"),
            Aggregation.sort(Sort.Direction.DESC, "totalSpent"),
            Aggregation.limit(limit)
        );

        return mongoTemplate.aggregate(agg, "orders", CustomerSummary.class).getMappedResults();
    }
}

class CustomerSummary {
    private String id;  // maps to _id from $group
    private double totalSpent;
    private long orderCount;
    // Getters and setters...
}
```

## Transactions with Spring

Enable transactions in the Spring configuration:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;

@Configuration
public class MongoConfig {

    @Bean
    MongoTransactionManager transactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }
}
```

Use `@Transactional` in your service:

```java
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransferService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Transactional
    public void transferFunds(String fromId, String toId, double amount) {
        Query fromQuery = new Query(Criteria.where("_id").is(fromId).and("balance").gte(amount));
        Update debit = new Update().inc("balance", -amount);

        if (mongoTemplate.updateFirst(fromQuery, debit, "accounts").getMatchedCount() == 0) {
            throw new IllegalStateException("Insufficient funds or account not found");
        }

        Query toQuery = new Query(Criteria.where("_id").is(toId));
        Update credit = new Update().inc("balance", amount);
        mongoTemplate.updateFirst(toQuery, credit, "accounts");
    }
}
```

## Validation with Jakarta Bean Validation

```java
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Document(collection = "orders")
public class Order {

    @Id
    private String id;

    @NotNull
    @Size(min = 1, max = 100)
    private String customerId;

    @NotNull
    @Positive
    private BigDecimal total;

    // ...
}
```

Add the validation starter:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

## Best Practices

- Enable `auto-index-creation: true` only in development; manage indexes explicitly in production with migration scripts.
- Use `MongoRepository` for standard CRUD and simple queries; use `MongoTemplate` for complex aggregations and bulk updates.
- Add `@CompoundIndex` on your entities for compound indexes that match your query patterns.
- Use `@Transactional` sparingly; require a replica set connection and keep transactions short.
- Use `BigDecimal` for monetary values instead of `double` to avoid floating-point precision issues.
- Configure `spring.data.mongodb.uuid-representation: standard` to store UUIDs in the standard binary format.

## Summary

Spring Data MongoDB integrates with Spring Boot through auto-configuration and provides `MongoRepository` for query-derived CRUD operations and `MongoTemplate` for complex queries and aggregations. Add `@Document` and `@Id` annotations to your entity classes, define repository interfaces extending `MongoRepository`, and use `@Transactional` with a `MongoTransactionManager` bean for multi-document transactions. Keep auto-index-creation disabled in production and manage indexes through migration tooling.
