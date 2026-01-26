# How to Use Spring Data JPA with PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring Boot, Spring Data JPA, PostgreSQL, Database, Backend, ORM

Description: A practical guide to integrating Spring Data JPA with PostgreSQL, covering project setup, entity mapping, repository patterns, custom queries, and production-ready configurations with real-world examples.

---

Spring Data JPA simplifies database access in Java applications by reducing boilerplate code and providing a repository abstraction over JPA. Combined with PostgreSQL - a robust, feature-rich relational database - it forms a solid foundation for building production-grade applications. This guide walks you through setting up a Spring Boot project with Spring Data JPA and PostgreSQL, from initial configuration to advanced query patterns.

## Project Setup

### Dependencies

Start by adding the required dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Data JPA - provides repository abstraction -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- PostgreSQL JDBC driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Lombok reduces boilerplate (optional but recommended) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Validation support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

If you prefer Gradle, add these to your `build.gradle`:

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'org.postgresql:postgresql'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
}
```

### Database Configuration

Configure your PostgreSQL connection in `application.yml`:

```yaml
spring:
  datasource:
    # Connection URL - adjust host, port, and database name as needed
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
    # HikariCP connection pool settings
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000

  jpa:
    # Use PostgreSQL-specific dialect for optimized SQL generation
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      # Options: none, validate, update, create, create-drop
      # Use 'validate' or 'none' in production with proper migrations
      ddl-auto: validate
    properties:
      hibernate:
        # Format SQL for readable logs during development
        format_sql: true
        # Batch inserts for better performance
        jdbc:
          batch_size: 25
        order_inserts: true
        order_updates: true

  # Show SQL queries in logs (disable in production)
  jpa.show-sql: false

logging:
  level:
    # Enable SQL logging for debugging (use sparingly in production)
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

## Entity Definition

### Basic Entity

JPA entities map Java classes to database tables. Here is a User entity with common patterns:

```java
package com.example.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
    // Create database index on email for faster lookups
    @Index(name = "idx_users_email", columnList = "email", unique = true),
    @Index(name = "idx_users_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    // PostgreSQL supports JSONB - useful for flexible data
    @Column(columnDefinition = "jsonb")
    private String preferences;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // One-to-many relationship with lazy loading
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<Order> orders = new HashSet<>();

    // Helper method to maintain bidirectional relationship
    public void addOrder(Order order) {
        orders.add(order);
        order.setUser(this);
    }

    public void removeOrder(Order order) {
        orders.remove(order);
        order.setUser(null);
    }
}
```

```java
package com.example.domain;

public enum UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED,
    DELETED
}
```

### Related Entity with Foreign Key

```java
package com.example.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_user_id", columnList = "user_id"),
    @Index(name = "idx_orders_status", columnList = "status"),
    @Index(name = "idx_orders_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    // Many orders belong to one user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```

## Repository Layer

Spring Data JPA repositories provide CRUD operations automatically. You can extend them with custom query methods.

### Basic Repository

```java
package com.example.repository;

import com.example.domain.User;
import com.example.domain.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>,
                                        JpaSpecificationExecutor<User> {

    // Spring Data JPA generates the query from method name
    Optional<User> findByEmail(String email);

    // Find users by status
    List<User> findByStatus(UserStatus status);

    // Check existence without loading entity
    boolean existsByEmail(String email);

    // Multiple conditions
    List<User> findByStatusAndCreatedAtAfter(UserStatus status, LocalDateTime after);

    // Case-insensitive search
    List<User> findByNameContainingIgnoreCase(String namePart);

    // Count queries
    long countByStatus(UserStatus status);
}
```

### Custom Queries with JPQL and Native SQL

For complex queries, use `@Query` annotation:

```java
package com.example.repository;

import com.example.domain.Order;
import com.example.domain.OrderStatus;
import com.example.dto.OrderSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // JPQL query - uses entity and field names, not table/column names
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status = :status")
    List<Order> findUserOrdersByStatus(
        @Param("userId") Long userId,
        @Param("status") OrderStatus status
    );

    // JPQL with JOIN FETCH to avoid N+1 queries
    @Query("SELECT o FROM Order o JOIN FETCH o.user WHERE o.id = :id")
    Optional<Order> findByIdWithUser(@Param("id") Long id);

    // Pagination support
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId ORDER BY o.createdAt DESC")
    Page<Order> findUserOrdersPaged(@Param("userId") Long userId, Pageable pageable);

    // Native PostgreSQL query - useful for database-specific features
    @Query(value = """
        SELECT o.* FROM orders o
        WHERE o.created_at >= :startDate
        AND o.total_amount > :minAmount
        ORDER BY o.created_at DESC
        """, nativeQuery = true)
    List<Order> findRecentLargeOrders(
        @Param("startDate") LocalDateTime startDate,
        @Param("minAmount") BigDecimal minAmount
    );

    // Projection to DTO - avoids loading unnecessary fields
    @Query("""
        SELECT new com.example.dto.OrderSummary(
            o.id,
            o.orderNumber,
            o.totalAmount,
            o.status,
            o.createdAt
        )
        FROM Order o
        WHERE o.user.id = :userId
        """)
    List<OrderSummary> findOrderSummariesByUser(@Param("userId") Long userId);

    // Aggregate query
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.user.id = :userId AND o.status = 'COMPLETED'")
    BigDecimal calculateUserTotalSpent(@Param("userId") Long userId);

    // Update query - requires @Modifying
    @Modifying
    @Query("UPDATE Order o SET o.status = :newStatus WHERE o.status = :oldStatus AND o.createdAt < :before")
    int updateOldOrderStatuses(
        @Param("oldStatus") OrderStatus oldStatus,
        @Param("newStatus") OrderStatus newStatus,
        @Param("before") LocalDateTime before
    );

    // Delete query
    @Modifying
    @Query("DELETE FROM Order o WHERE o.status = 'CANCELLED' AND o.createdAt < :before")
    int deleteOldCancelledOrders(@Param("before") LocalDateTime before);
}
```

## Service Layer

Encapsulate business logic in service classes:

```java
package com.example.service;

import com.example.domain.User;
import com.example.domain.UserStatus;
import com.example.dto.CreateUserRequest;
import com.example.dto.UpdateUserRequest;
import com.example.exception.UserNotFoundException;
import com.example.exception.DuplicateEmailException;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Read operations use readOnly transaction for performance
    @Transactional(readOnly = true)
    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }

    @Transactional(readOnly = true)
    public Page<User> findActiveUsers(Pageable pageable) {
        return userRepository.findAll(
            (root, query, cb) -> cb.equal(root.get("status"), UserStatus.ACTIVE),
            pageable
        );
    }

    @Transactional
    public User createUser(CreateUserRequest request) {
        // Check for duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
            .email(request.getEmail())
            .name(request.getName())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .status(UserStatus.ACTIVE)
            .build();

        User saved = userRepository.save(user);
        log.info("Created user: id={}, email={}", saved.getId(), saved.getEmail());

        return saved;
    }

    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = findById(id);

        // Check email uniqueness if changing
        if (!user.getEmail().equals(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email already in use: " + request.getEmail());
        }

        user.setEmail(request.getEmail());
        user.setName(request.getName());

        // JPA automatically saves changes at transaction commit
        // No explicit save() call needed, but you can add it for clarity
        return user;
    }

    @Transactional
    public void deactivateUser(Long id) {
        User user = findById(id);
        user.setStatus(UserStatus.INACTIVE);
        log.info("Deactivated user: id={}", id);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found: " + id);
        }
        userRepository.deleteById(id);
        log.info("Deleted user: id={}", id);
    }
}
```

## Advanced Query Patterns

### Specifications for Dynamic Queries

When you need to build queries dynamically based on multiple optional filters, use Specifications:

```java
package com.example.specification;

import com.example.domain.User;
import com.example.domain.UserStatus;
import com.example.dto.UserSearchCriteria;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class UserSpecifications {

    public static Specification<User> hasEmail(String email) {
        return (root, query, cb) ->
            email == null ? null : cb.equal(root.get("email"), email);
    }

    public static Specification<User> hasStatus(UserStatus status) {
        return (root, query, cb) ->
            status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<User> nameContains(String name) {
        return (root, query, cb) ->
            name == null ? null : cb.like(
                cb.lower(root.get("name")),
                "%" + name.toLowerCase() + "%"
            );
    }

    public static Specification<User> createdAfter(LocalDateTime date) {
        return (root, query, cb) ->
            date == null ? null : cb.greaterThan(root.get("createdAt"), date);
    }

    public static Specification<User> createdBefore(LocalDateTime date) {
        return (root, query, cb) ->
            date == null ? null : cb.lessThan(root.get("createdAt"), date);
    }

    // Combine multiple criteria
    public static Specification<User> fromCriteria(UserSearchCriteria criteria) {
        return Specification
            .where(hasStatus(criteria.getStatus()))
            .and(nameContains(criteria.getName()))
            .and(createdAfter(criteria.getCreatedAfter()))
            .and(createdBefore(criteria.getCreatedBefore()));
    }
}
```

Usage in service:

```java
@Transactional(readOnly = true)
public Page<User> searchUsers(UserSearchCriteria criteria, Pageable pageable) {
    Specification<User> spec = UserSpecifications.fromCriteria(criteria);
    return userRepository.findAll(spec, pageable);
}
```

### Avoiding N+1 Queries

N+1 queries are a common performance problem. Here is how to handle them:

```java
// Problem: This causes N+1 queries when accessing user.orders
@Query("SELECT u FROM User u WHERE u.status = :status")
List<User> findByStatus(@Param("status") UserStatus status);

// Solution 1: JOIN FETCH loads related entities in single query
@Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.orders WHERE u.status = :status")
List<User> findByStatusWithOrders(@Param("status") UserStatus status);

// Solution 2: Entity Graph for flexible fetching
@EntityGraph(attributePaths = {"orders"})
@Query("SELECT u FROM User u WHERE u.status = :status")
List<User> findByStatusWithOrdersGraph(@Param("status") UserStatus status);
```

Define reusable entity graphs on the entity:

```java
@Entity
@NamedEntityGraph(
    name = "User.withOrders",
    attributeNodes = @NamedAttributeNode("orders")
)
public class User {
    // ...
}
```

Use in repository:

```java
@EntityGraph("User.withOrders")
Optional<User> findWithOrdersById(Long id);
```

## PostgreSQL-Specific Features

### Using JSONB Columns

PostgreSQL's JSONB type is useful for flexible schema data:

```java
// Entity with JSONB field
@Column(columnDefinition = "jsonb")
private String metadata;

// Native query to search within JSONB
@Query(value = """
    SELECT * FROM users
    WHERE preferences->>'theme' = :theme
    """, nativeQuery = true)
List<User> findByPreferenceTheme(@Param("theme") String theme);

// Query JSONB array contains
@Query(value = """
    SELECT * FROM users
    WHERE preferences->'tags' ? :tag
    """, nativeQuery = true)
List<User> findByPreferenceTag(@Param("tag") String tag);
```

### Full-Text Search

PostgreSQL has powerful full-text search capabilities:

```java
@Query(value = """
    SELECT * FROM users
    WHERE to_tsvector('english', name || ' ' || COALESCE(bio, ''))
    @@ plainto_tsquery('english', :searchTerm)
    """, nativeQuery = true)
List<User> fullTextSearch(@Param("searchTerm") String searchTerm);
```

## Database Migration with Flyway

Avoid `ddl-auto: update` in production. Use Flyway for versioned migrations:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

Create migration files in `src/main/resources/db/migration/`:

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    preferences JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- V2__create_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

## Production Considerations

### Connection Pool Tuning

```yaml
spring:
  datasource:
    hikari:
      # Set based on: connections = (core_count * 2) + effective_spindle_count
      # For most web apps, 10-20 connections is sufficient
      maximum-pool-size: 15
      minimum-idle: 5
      # How long to wait for connection from pool
      connection-timeout: 30000
      # Max time a connection can sit idle
      idle-timeout: 600000
      # Max lifetime of a connection
      max-lifetime: 1800000
      # Test connection validity
      connection-test-query: SELECT 1
```

### Query Performance

```yaml
spring:
  jpa:
    properties:
      hibernate:
        # Enable query plan caching
        query.plan_cache_max_size: 2048
        query.plan_parameter_metadata_max_size: 128
        # Generate statistics for monitoring
        generate_statistics: true
```

### Auditing

Track who created/modified records:

```java
@Configuration
@EnableJpaAuditing
public class JpaConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext())
            .map(SecurityContext::getAuthentication)
            .filter(Authentication::isAuthenticated)
            .map(Authentication::getName);
    }
}
```

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

## Summary

| Component | Purpose |
|-----------|---------|
| **Entity** | Maps Java class to database table |
| **Repository** | Provides data access methods |
| **@Query** | Custom JPQL or native SQL queries |
| **Specification** | Dynamic query building |
| **JOIN FETCH** | Prevents N+1 queries |
| **Flyway** | Version-controlled schema migrations |
| **HikariCP** | Connection pooling |

Spring Data JPA with PostgreSQL provides a robust foundation for data access in Java applications. Start with the generated query methods, graduate to JPQL for complex queries, and use native SQL when you need PostgreSQL-specific features. Always use proper migrations in production and monitor your query performance to catch N+1 issues early.
