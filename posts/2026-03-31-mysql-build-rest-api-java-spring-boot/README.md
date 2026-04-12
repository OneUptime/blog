# How to Build a REST API with MySQL and Java Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spring Boot, Java, REST API, JPA

Description: Build a production-ready REST API using Java Spring Boot and MySQL with Spring Data JPA, HikariCP connection pooling, and proper exception handling.

---

## Project Setup

Spring Boot with Spring Data JPA provides a powerful foundation for MySQL-backed REST APIs. HikariCP, the default connection pool, provides high-performance connection management out of the box.

Create a new project with Spring Initializr or add these dependencies to `pom.xml`:

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
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
</dependencies>
```

## Application Configuration

```yaml
# src/main/resources/application.yml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:myapp}?useSSL=true&requireSSL=false&serverTimezone=UTC
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 600000
      connection-timeout: 30000
      max-lifetime: 1800000
      pool-name: MySQLHikariPool

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
```

## Order Entity

```java
// src/main/java/com/example/api/model/Order.java
package com.example.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and setters omitted for brevity
}
```

## Repository

```java
// src/main/java/com/example/api/repository/OrderRepository.java
package com.example.api.repository;

import com.example.api.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT o FROM Order o WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findByStatus(String status);
}
```

## REST Controller

```java
// src/main/java/com/example/api/controller/OrderController.java
package com.example.api.controller;

import com.example.api.model.Order;
import com.example.api.repository.OrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepo;
    private static final Set<String> VALID_STATUSES =
        Set.of("pending", "processing", "shipped", "completed", "cancelled");

    public OrderController(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    @GetMapping
    public List<Order> listOrders() {
        return orderRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        return orderRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        order.setStatus("pending");
        Order saved = orderRepo.save(order);
        return ResponseEntity.status(201).body(saved);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || !VALID_STATUSES.contains(newStatus)) {
            return ResponseEntity.badRequest().build();
        }
        return orderRepo.findById(id).map(order -> {
            order.setStatus(newStatus);
            return ResponseEntity.ok(orderRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }
}
```

## Health Check

```java
@RestController
public class HealthController {
    @GetMapping("/health")
    public java.util.Map<String, String> health() {
        return java.util.Map.of("status", "ok");
    }
}
```

## Summary

Spring Boot's auto-configuration wires MySQL, HikariCP, and JPA together with minimal boilerplate. Spring Data JPA provides query generation from method names, and the `@RestController` annotation handles JSON serialization automatically. HikariCP's connection pool configuration in `application.yml` ensures the application handles concurrent requests efficiently without exhausting database connections.
