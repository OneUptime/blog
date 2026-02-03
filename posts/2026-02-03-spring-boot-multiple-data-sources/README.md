# How to Configure Multiple Data Sources in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Database, JPA, Multiple Data Sources

Description: Learn how to configure multiple data sources in Spring Boot. This guide covers separate entity managers, transaction management, and repository configuration.

---

> In enterprise applications, connecting to multiple databases is a common requirement. Whether you need to read from a replica, integrate with a legacy system, or separate concerns across different databases, Spring Boot provides the flexibility to configure multiple data sources cleanly.

Many real-world applications need to work with more than one database. You might have a primary database for your core business logic, a read replica for reporting queries, or a separate database for audit logs. Spring Boot's auto-configuration handles single data sources beautifully, but when you need multiple connections, you have to take manual control. This guide walks you through the entire process.

---

## Understanding the Architecture

When working with multiple data sources in Spring Boot, each database connection requires its own set of components:

| Component | Purpose | One Per Data Source? |
|-----------|---------|---------------------|
| **DataSource** | Database connection pool | Yes |
| **EntityManagerFactory** | Creates EntityManager instances | Yes |
| **TransactionManager** | Manages transactions | Yes |
| **Repository Package** | Contains JPA repositories | Yes (separate packages) |
| **Entity Package** | Contains entity classes | Yes (separate packages) |

The key insight is that each data source needs its own complete JPA stack. Spring Boot's auto-configuration only handles one data source, so we configure the rest manually.

---

## Project Structure

Before diving into the code, here is how your project should be organized. Keeping entities and repositories in separate packages for each data source is essential - Spring uses these package paths to wire everything together correctly.

```
src/main/java/com/example/demo/
├── config/
│   ├── PrimaryDataSourceConfig.java    # Primary database configuration
│   └── SecondaryDataSourceConfig.java  # Secondary database configuration
├── primary/
│   ├── entity/
│   │   └── User.java                   # Entities for primary database
│   └── repository/
│       └── UserRepository.java         # Repositories for primary database
├── secondary/
│   ├── entity/
│   │   └── AuditLog.java               # Entities for secondary database
│   └── repository/
│       └── AuditLogRepository.java     # Repositories for secondary database
└── service/
    └── UserService.java                # Service using both data sources
```

---

## Configuration Properties

Start by defining the connection properties for both databases in your `application.yml` or `application.properties` file. Using YAML makes the hierarchical structure clearer.

```yaml
# application.yml
# Configuration for multiple data sources in Spring Boot

# Primary database - main application data
spring:
  datasource:
    primary:
      url: jdbc:postgresql://localhost:5432/primary_db
      username: ${PRIMARY_DB_USERNAME:postgres}
      password: ${PRIMARY_DB_PASSWORD:password}
      driver-class-name: org.postgresql.Driver
      # HikariCP connection pool settings
      hikari:
        pool-name: PrimaryHikariPool
        maximum-pool-size: 10
        minimum-idle: 5
        idle-timeout: 300000
        connection-timeout: 20000
        max-lifetime: 1200000

    # Secondary database - audit logs or legacy system
    secondary:
      url: jdbc:mysql://localhost:3306/secondary_db
      username: ${SECONDARY_DB_USERNAME:root}
      password: ${SECONDARY_DB_PASSWORD:password}
      driver-class-name: com.mysql.cj.jdbc.Driver
      hikari:
        pool-name: SecondaryHikariPool
        maximum-pool-size: 5
        minimum-idle: 2
        idle-timeout: 300000
        connection-timeout: 20000
        max-lifetime: 1200000

  # JPA settings - these apply globally but we override per data source
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

For applications using `application.properties`, here is the equivalent configuration:

```properties
# application.properties
# Primary database configuration
spring.datasource.primary.url=jdbc:postgresql://localhost:5432/primary_db
spring.datasource.primary.username=postgres
spring.datasource.primary.password=password
spring.datasource.primary.driver-class-name=org.postgresql.Driver
spring.datasource.primary.hikari.pool-name=PrimaryHikariPool
spring.datasource.primary.hikari.maximum-pool-size=10
spring.datasource.primary.hikari.minimum-idle=5

# Secondary database configuration
spring.datasource.secondary.url=jdbc:mysql://localhost:3306/secondary_db
spring.datasource.secondary.username=root
spring.datasource.secondary.password=password
spring.datasource.secondary.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.secondary.hikari.pool-name=SecondaryHikariPool
spring.datasource.secondary.hikari.maximum-pool-size=5
spring.datasource.secondary.hikari.minimum-idle=2
```

---

## Primary Data Source Configuration

The primary data source is marked with `@Primary`, which tells Spring to use it as the default when no specific qualifier is provided. This configuration class sets up the complete JPA stack for your main database.

```java
// PrimaryDataSourceConfig.java
// Configuration for the primary database connection

package com.example.demo.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    // Tell Spring where to find repositories for this data source
    basePackages = "com.example.demo.primary.repository",
    // Reference the entity manager factory bean by name
    entityManagerFactoryRef = "primaryEntityManagerFactory",
    // Reference the transaction manager bean by name
    transactionManagerRef = "primaryTransactionManager"
)
public class PrimaryDataSourceConfig {

    /**
     * Load data source properties from application.yml
     * The @Primary annotation makes this the default DataSourceProperties bean
     */
    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    public DataSourceProperties primaryDataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Create the actual DataSource using properties loaded above
     * HikariCP is the default connection pool in Spring Boot
     */
    @Primary
    @Bean(name = "primaryDataSource")
    @ConfigurationProperties("spring.datasource.primary.hikari")
    public DataSource primaryDataSource() {
        // Build a HikariDataSource from the properties
        return primaryDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }

    /**
     * Create the EntityManagerFactory for the primary database
     * This factory creates EntityManager instances for JPA operations
     */
    @Primary
    @Bean(name = "primaryEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean primaryEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("primaryDataSource") DataSource dataSource) {

        return builder
            .dataSource(dataSource)
            // Scan this package for @Entity classes
            .packages("com.example.demo.primary.entity")
            // Persistence unit name - useful for debugging
            .persistenceUnit("primary")
            // Set JPA/Hibernate properties
            .properties(jpaProperties())
            .build();
    }

    /**
     * Create the transaction manager for the primary database
     * Each data source needs its own transaction manager
     */
    @Primary
    @Bean(name = "primaryTransactionManager")
    public PlatformTransactionManager primaryTransactionManager(
            @Qualifier("primaryEntityManagerFactory")
            LocalContainerEntityManagerFactoryBean primaryEntityManagerFactory) {

        return new JpaTransactionManager(
            primaryEntityManagerFactory.getObject()
        );
    }

    /**
     * JPA and Hibernate properties for the primary database
     * Customize these based on your database vendor and requirements
     */
    private Map<String, Object> jpaProperties() {
        Map<String, Object> props = new HashMap<>();

        // Hibernate dialect - PostgreSQL in this case
        props.put("hibernate.dialect",
            "org.hibernate.dialect.PostgreSQLDialect");

        // Schema generation strategy
        // Options: none, validate, update, create, create-drop
        props.put("hibernate.hbm2ddl.auto", "validate");

        // Show SQL in logs (disable in production)
        props.put("hibernate.show_sql", "true");
        props.put("hibernate.format_sql", "true");

        // Batch insert optimization
        props.put("hibernate.jdbc.batch_size", "50");
        props.put("hibernate.order_inserts", "true");
        props.put("hibernate.order_updates", "true");

        // Statistics for monitoring (disable in production)
        props.put("hibernate.generate_statistics", "false");

        return props;
    }
}
```

---

## Secondary Data Source Configuration

The secondary data source configuration follows the same pattern but without the `@Primary` annotation. Notice that we use different bean names and point to different packages for entities and repositories.

```java
// SecondaryDataSourceConfig.java
// Configuration for the secondary database connection

package com.example.demo.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    // Repositories for the secondary data source live here
    basePackages = "com.example.demo.secondary.repository",
    entityManagerFactoryRef = "secondaryEntityManagerFactory",
    transactionManagerRef = "secondaryTransactionManager"
)
public class SecondaryDataSourceConfig {

    /**
     * Load properties for the secondary data source
     * Note: No @Primary here - this is not the default
     */
    @Bean
    @ConfigurationProperties("spring.datasource.secondary")
    public DataSourceProperties secondaryDataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Create the secondary DataSource
     * Using a different database (MySQL in this example)
     */
    @Bean(name = "secondaryDataSource")
    @ConfigurationProperties("spring.datasource.secondary.hikari")
    public DataSource secondaryDataSource() {
        return secondaryDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }

    /**
     * EntityManagerFactory for the secondary database
     * Scans a separate package for entity classes
     */
    @Bean(name = "secondaryEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean secondaryEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("secondaryDataSource") DataSource dataSource) {

        return builder
            .dataSource(dataSource)
            // Different package for secondary entities
            .packages("com.example.demo.secondary.entity")
            .persistenceUnit("secondary")
            .properties(jpaProperties())
            .build();
    }

    /**
     * Transaction manager for the secondary database
     * Use @Transactional("secondaryTransactionManager") in services
     */
    @Bean(name = "secondaryTransactionManager")
    public PlatformTransactionManager secondaryTransactionManager(
            @Qualifier("secondaryEntityManagerFactory")
            LocalContainerEntityManagerFactoryBean secondaryEntityManagerFactory) {

        return new JpaTransactionManager(
            secondaryEntityManagerFactory.getObject()
        );
    }

    /**
     * JPA properties for the secondary database
     * Different dialect since this is MySQL
     */
    private Map<String, Object> jpaProperties() {
        Map<String, Object> props = new HashMap<>();

        // MySQL dialect
        props.put("hibernate.dialect",
            "org.hibernate.dialect.MySQL8Dialect");

        // Validate schema on startup
        props.put("hibernate.hbm2ddl.auto", "validate");

        props.put("hibernate.show_sql", "true");
        props.put("hibernate.format_sql", "true");

        // MySQL-specific optimizations
        props.put("hibernate.jdbc.batch_size", "50");
        props.put("hibernate.order_inserts", "true");

        return props;
    }
}
```

---

## Entity Classes

Each database has its own set of entity classes in separate packages. This separation is critical - the `@EnableJpaRepositories` annotation uses package scanning to associate entities with the correct data source.

### Primary Database Entity

```java
// User.java
// Entity class for the primary database

package com.example.demo.primary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "users",
    indexes = {
        // Index on email for faster lookups
        @Index(name = "idx_users_email", columnList = "email"),
        // Index on status for filtering active users
        @Index(name = "idx_users_status", columnList = "status")
    }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Default constructor required by JPA
    public User() {}

    // Constructor for creating new users
    public User(String name, String email) {
        this.name = name;
        this.email = email;
        this.status = "ACTIVE";
    }

    /**
     * Set timestamps before persisting a new entity
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Update the timestamp before any update
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Override
    public String toString() {
        return "User{id=" + id + ", name='" + name + "', email='" + email + "'}";
    }
}
```

### Secondary Database Entity

```java
// AuditLog.java
// Entity class for the secondary database (audit logs)

package com.example.demo.secondary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "audit_logs",
    indexes = {
        // Index for querying logs by entity type and ID
        @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id"),
        // Index for time-based queries
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        // Index for filtering by action type
        @Index(name = "idx_audit_action", columnList = "action")
    }
)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Lob
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Lob
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    // Default constructor
    public AuditLog() {}

    /**
     * Builder-style constructor for creating audit logs
     */
    public AuditLog(String entityType, Long entityId, String action, String performedBy) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.performedBy = performedBy;
    }

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }

    // Fluent setters for building audit logs
    public AuditLog withOldValue(String oldValue) {
        this.oldValue = oldValue;
        return this;
    }

    public AuditLog withNewValue(String newValue) {
        this.newValue = newValue;
        return this;
    }

    public AuditLog withIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
        return this;
    }

    // Standard getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }

    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
```

---

## Repository Interfaces

Repositories must be in separate packages so Spring can associate them with the correct data source. The package path specified in `@EnableJpaRepositories` determines which EntityManagerFactory handles the repository.

### Primary Database Repository

```java
// UserRepository.java
// Repository for User entities in the primary database

package com.example.demo.primary.repository;

import com.example.demo.primary.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by email address
     * Email is unique so this returns Optional
     */
    Optional<User> findByEmail(String email);

    /**
     * Find all users with a specific status
     * Returns paginated results
     */
    Page<User> findByStatus(String status, Pageable pageable);

    /**
     * Find users by name containing a search term (case insensitive)
     */
    List<User> findByNameContainingIgnoreCase(String name);

    /**
     * Check if a user exists with the given email
     * More efficient than findByEmail when you only need existence check
     */
    boolean existsByEmail(String email);

    /**
     * Custom query to find recently active users
     * Uses JPQL for database-agnostic queries
     */
    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' " +
           "AND u.updatedAt >= :since ORDER BY u.updatedAt DESC")
    List<User> findRecentlyActiveUsers(@Param("since") LocalDateTime since);

    /**
     * Bulk update user status
     * @Modifying required for UPDATE/DELETE queries
     */
    @Modifying
    @Query("UPDATE User u SET u.status = :newStatus WHERE u.status = :oldStatus")
    int updateUserStatus(
        @Param("oldStatus") String oldStatus,
        @Param("newStatus") String newStatus
    );

    /**
     * Count users by status for dashboard statistics
     */
    @Query("SELECT u.status, COUNT(u) FROM User u GROUP BY u.status")
    List<Object[]> countUsersByStatus();

    /**
     * Native query example - when you need database-specific features
     * Use sparingly as it ties you to a specific database
     */
    @Query(
        value = "SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
        nativeQuery = true
    )
    List<User> findUsersCreatedLastWeek();
}
```

### Secondary Database Repository

```java
// AuditLogRepository.java
// Repository for AuditLog entities in the secondary database

package com.example.demo.secondary.repository;

import com.example.demo.secondary.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Find all audit logs for a specific entity
     * Useful for viewing the history of a single record
     */
    List<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(
        String entityType,
        Long entityId
    );

    /**
     * Find audit logs by action type
     * Returns paginated results for large datasets
     */
    Page<AuditLog> findByAction(String action, Pageable pageable);

    /**
     * Find all actions performed by a specific user
     */
    Page<AuditLog> findByPerformedByOrderByTimestampDesc(
        String performedBy,
        Pageable pageable
    );

    /**
     * Find audit logs within a time range
     * Useful for compliance reporting
     */
    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :start AND :end " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findByTimestampBetween(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    /**
     * Count actions by type for analytics
     */
    @Query("SELECT a.action, COUNT(a) FROM AuditLog a " +
           "WHERE a.timestamp >= :since GROUP BY a.action")
    List<Object[]> countActionsSince(@Param("since") LocalDateTime since);

    /**
     * Find recent audit logs for a specific entity type
     */
    @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType " +
           "AND a.timestamp >= :since ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentByEntityType(
        @Param("entityType") String entityType,
        @Param("since") LocalDateTime since
    );

    /**
     * Delete old audit logs for data retention compliance
     * Be careful - this permanently removes data
     */
    void deleteByTimestampBefore(LocalDateTime timestamp);
}
```

---

## Service Layer with Multiple Data Sources

The service layer coordinates operations across both data sources. Pay attention to how transaction managers are specified for operations on the secondary database.

```java
// UserService.java
// Service that uses both primary and secondary data sources

package com.example.demo.service;

import com.example.demo.primary.entity.User;
import com.example.demo.primary.repository.UserRepository;
import com.example.demo.secondary.entity.AuditLog;
import com.example.demo.secondary.repository.AuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    // Constructor injection - preferred over field injection
    public UserService(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Create a new user and log the action
     * Uses the primary transaction manager (default) for user creation
     */
    @Transactional  // Uses primaryTransactionManager by default
    public User createUser(String name, String email, String performedBy) {
        logger.info("Creating user with email: {}", email);

        // Check if email already exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered: " + email);
        }

        // Create and save the user in the primary database
        User user = new User(name, email);
        User savedUser = userRepository.save(user);

        // Log the creation in the secondary database
        // Note: This is a separate transaction
        logAuditEvent(
            "User",
            savedUser.getId(),
            "CREATE",
            performedBy,
            null,
            toJson(savedUser)
        );

        logger.info("User created successfully: {}", savedUser.getId());
        return savedUser;
    }

    /**
     * Update an existing user
     * Captures the old state for audit logging
     */
    @Transactional
    public User updateUser(Long userId, String name, String email, String performedBy) {
        logger.info("Updating user: {}", userId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Capture old state for audit log
        String oldValue = toJson(user);

        // Update fields
        user.setName(name);
        user.setEmail(email);

        User updatedUser = userRepository.save(user);

        // Log the update
        logAuditEvent(
            "User",
            userId,
            "UPDATE",
            performedBy,
            oldValue,
            toJson(updatedUser)
        );

        return updatedUser;
    }

    /**
     * Soft delete a user by changing status
     */
    @Transactional
    public void deactivateUser(Long userId, String performedBy) {
        logger.info("Deactivating user: {}", userId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String oldValue = toJson(user);

        user.setStatus("INACTIVE");
        userRepository.save(user);

        logAuditEvent(
            "User",
            userId,
            "DEACTIVATE",
            performedBy,
            oldValue,
            toJson(user)
        );
    }

    /**
     * Find a user by ID
     * Read-only transaction for optimization
     */
    @Transactional(readOnly = true)
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * Find users by status with pagination
     */
    @Transactional(readOnly = true)
    public Page<User> findByStatus(String status, Pageable pageable) {
        return userRepository.findByStatus(status, pageable);
    }

    /**
     * Get audit history for a specific user
     * Uses the secondary transaction manager explicitly
     */
    @Transactional(
        value = "secondaryTransactionManager",
        readOnly = true
    )
    public List<AuditLog> getUserAuditHistory(Long userId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(
            "User",
            userId
        );
    }

    /**
     * Get all audit logs with pagination
     */
    @Transactional(
        value = "secondaryTransactionManager",
        readOnly = true
    )
    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    /**
     * Log an audit event to the secondary database
     * This method uses a separate transaction for the audit log
     */
    @Transactional("secondaryTransactionManager")
    public void logAuditEvent(
            String entityType,
            Long entityId,
            String action,
            String performedBy,
            String oldValue,
            String newValue) {

        AuditLog auditLog = new AuditLog(entityType, entityId, action, performedBy)
            .withOldValue(oldValue)
            .withNewValue(newValue);

        auditLogRepository.save(auditLog);
        logger.debug("Audit log saved: {} {} {}", action, entityType, entityId);
    }

    /**
     * Convert object to JSON for audit logging
     */
    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            logger.warn("Failed to serialize object to JSON", e);
            return "{}";
        }
    }
}
```

---

## Handling Cross-Database Transactions

Spring does not support distributed transactions across multiple data sources by default. Here are strategies for handling this limitation.

### Strategy 1: Eventual Consistency with Compensation

```java
// UserServiceWithCompensation.java
// Handles failures with compensating transactions

package com.example.demo.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserServiceWithCompensation {

    private static final Logger logger = LoggerFactory.getLogger(
        UserServiceWithCompensation.class
    );

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public UserServiceWithCompensation(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Create user with compensating transaction pattern
     * If audit logging fails, the user creation is rolled back
     */
    public User createUserWithAudit(String name, String email, String performedBy) {
        User savedUser = null;

        try {
            // Step 1: Save user to primary database
            savedUser = saveUser(name, email);

            // Step 2: Save audit log to secondary database
            saveAuditLog(savedUser, performedBy);

            return savedUser;

        } catch (Exception e) {
            // Compensate: If audit log fails, delete the user
            if (savedUser != null && savedUser.getId() != null) {
                logger.error(
                    "Audit log failed, compensating by deleting user: {}",
                    savedUser.getId()
                );
                compensateUserCreation(savedUser.getId());
            }
            throw new RuntimeException("Failed to create user with audit", e);
        }
    }

    @Transactional  // Primary database transaction
    protected User saveUser(String name, String email) {
        User user = new User(name, email);
        return userRepository.save(user);
    }

    @Transactional("secondaryTransactionManager")
    protected void saveAuditLog(User user, String performedBy) {
        AuditLog auditLog = new AuditLog("User", user.getId(), "CREATE", performedBy);
        auditLogRepository.save(auditLog);
    }

    @Transactional  // Compensating transaction
    protected void compensateUserCreation(Long userId) {
        userRepository.deleteById(userId);
        logger.info("Compensating transaction completed: deleted user {}", userId);
    }
}
```

### Strategy 2: Async Audit Logging

```java
// AsyncAuditService.java
// Asynchronous audit logging for better performance

package com.example.demo.service;

import com.example.demo.secondary.entity.AuditLog;
import com.example.demo.secondary.repository.AuditLogRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.CompletableFuture;

@Service
public class AsyncAuditService {

    private static final Logger logger = LoggerFactory.getLogger(AsyncAuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AsyncAuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Log audit event asynchronously
     * This does not block the main transaction
     * Trade-off: Audit log might be lost if the application crashes
     */
    @Async("auditExecutor")  // Use a dedicated thread pool
    @Transactional("secondaryTransactionManager")
    public CompletableFuture<Void> logAuditEventAsync(
            String entityType,
            Long entityId,
            String action,
            String performedBy,
            String oldValue,
            String newValue) {

        try {
            AuditLog auditLog = new AuditLog(entityType, entityId, action, performedBy)
                .withOldValue(oldValue)
                .withNewValue(newValue);

            auditLogRepository.save(auditLog);
            logger.debug("Async audit log saved: {} {} {}", action, entityType, entityId);

        } catch (Exception e) {
            // Log the error but don't fail the main operation
            logger.error("Failed to save audit log: {} {} {}",
                action, entityType, entityId, e);
        }

        return CompletableFuture.completedFuture(null);
    }
}
```

### Thread Pool Configuration for Async Operations

```java
// AsyncConfig.java
// Configuration for async audit logging thread pool

package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Dedicated thread pool for audit logging
     * Prevents audit operations from blocking main threads
     */
    @Bean(name = "auditExecutor")
    public Executor auditExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Core pool size - threads always kept alive
        executor.setCorePoolSize(2);

        // Maximum pool size - upper limit under heavy load
        executor.setMaxPoolSize(5);

        // Queue capacity - tasks waiting when all threads are busy
        executor.setQueueCapacity(100);

        // Thread name prefix for debugging
        executor.setThreadNamePrefix("audit-");

        // What to do when queue is full and max threads reached
        // CallerRunsPolicy: Execute in the calling thread (backpressure)
        executor.setRejectedExecutionHandler(
            new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy()
        );

        executor.initialize();
        return executor;
    }
}
```

---

## Testing with Multiple Data Sources

Testing requires proper configuration to ensure both data sources are set up correctly in the test environment.

### Test Configuration

```java
// TestDataSourceConfig.java
// Test configuration using embedded databases

package com.example.demo.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

import javax.sql.DataSource;

@TestConfiguration
public class TestDataSourceConfig {

    /**
     * Primary test database - H2 in-memory
     */
    @Primary
    @Bean(name = "primaryDataSource")
    public DataSource primaryDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .setName("primary_test_db")
            .build();
    }

    /**
     * Secondary test database - separate H2 instance
     */
    @Bean(name = "secondaryDataSource")
    public DataSource secondaryDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .setName("secondary_test_db")
            .build();
    }
}
```

### Integration Test

```java
// UserServiceIntegrationTest.java
// Integration test for multiple data sources

package com.example.demo.service;

import com.example.demo.config.TestDataSourceConfig;
import com.example.demo.primary.entity.User;
import com.example.demo.primary.repository.UserRepository;
import com.example.demo.secondary.entity.AuditLog;
import com.example.demo.secondary.repository.AuditLogRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestDataSourceConfig.class)
class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        // Clean up both databases before each test
        auditLogRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createUser_shouldSaveUserAndAuditLog() {
        // Given
        String name = "John Doe";
        String email = "john.doe@example.com";
        String performedBy = "admin";

        // When
        User user = userService.createUser(name, email, performedBy);

        // Then - verify user was created in primary database
        assertThat(user.getId()).isNotNull();
        assertThat(user.getName()).isEqualTo(name);
        assertThat(user.getEmail()).isEqualTo(email);

        // Verify user exists in primary database
        User foundUser = userRepository.findById(user.getId()).orElse(null);
        assertThat(foundUser).isNotNull();

        // Verify audit log was created in secondary database
        List<AuditLog> auditLogs = auditLogRepository
            .findByEntityTypeAndEntityIdOrderByTimestampDesc("User", user.getId());

        assertThat(auditLogs).hasSize(1);
        assertThat(auditLogs.get(0).getAction()).isEqualTo("CREATE");
        assertThat(auditLogs.get(0).getPerformedBy()).isEqualTo(performedBy);
    }

    @Test
    void createUser_withDuplicateEmail_shouldThrowException() {
        // Given - create first user
        userService.createUser("User 1", "duplicate@example.com", "admin");

        // When/Then - creating second user with same email should fail
        assertThatThrownBy(() ->
            userService.createUser("User 2", "duplicate@example.com", "admin")
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Email already registered");
    }

    @Test
    void updateUser_shouldUpdateAndLogChanges() {
        // Given - create a user first
        User user = userService.createUser("Original Name", "user@example.com", "admin");

        // When - update the user
        User updatedUser = userService.updateUser(
            user.getId(),
            "Updated Name",
            "updated@example.com",
            "admin"
        );

        // Then - verify update
        assertThat(updatedUser.getName()).isEqualTo("Updated Name");
        assertThat(updatedUser.getEmail()).isEqualTo("updated@example.com");

        // Verify audit logs (should have CREATE and UPDATE)
        List<AuditLog> auditLogs = auditLogRepository
            .findByEntityTypeAndEntityIdOrderByTimestampDesc("User", user.getId());

        assertThat(auditLogs).hasSize(2);
        assertThat(auditLogs.get(0).getAction()).isEqualTo("UPDATE");
        assertThat(auditLogs.get(1).getAction()).isEqualTo("CREATE");
    }

    @Test
    void getUserAuditHistory_shouldReturnOrderedLogs() {
        // Given - create and update a user
        User user = userService.createUser("Test User", "test@example.com", "admin");
        userService.updateUser(user.getId(), "Updated User", "test@example.com", "admin");
        userService.deactivateUser(user.getId(), "admin");

        // When
        List<AuditLog> history = userService.getUserAuditHistory(user.getId());

        // Then - should have 3 logs in reverse chronological order
        assertThat(history).hasSize(3);
        assertThat(history.get(0).getAction()).isEqualTo("DEACTIVATE");
        assertThat(history.get(1).getAction()).isEqualTo("UPDATE");
        assertThat(history.get(2).getAction()).isEqualTo("CREATE");
    }
}
```

---

## Best Practices and Common Pitfalls

### 1. Always Use Separate Packages

```java
// GOOD: Clear separation
@EnableJpaRepositories(
    basePackages = "com.example.demo.primary.repository",
    entityManagerFactoryRef = "primaryEntityManagerFactory"
)

// BAD: Mixed packages cause confusion
@EnableJpaRepositories(
    basePackages = "com.example.demo.repository",  // All repos in one place
    entityManagerFactoryRef = "primaryEntityManagerFactory"
)
```

### 2. Mark One Data Source as Primary

```java
// GOOD: One primary, others qualified
@Primary
@Bean(name = "primaryDataSource")
public DataSource primaryDataSource() { ... }

@Bean(name = "secondaryDataSource")  // No @Primary
public DataSource secondaryDataSource() { ... }

// BAD: Multiple primaries cause ambiguity
@Primary
@Bean(name = "primaryDataSource")
public DataSource primaryDataSource() { ... }

@Primary  // Don't do this!
@Bean(name = "secondaryDataSource")
public DataSource secondaryDataSource() { ... }
```

### 3. Specify Transaction Manager Explicitly

```java
// GOOD: Explicit transaction manager for non-primary
@Transactional("secondaryTransactionManager")
public void saveToSecondary() { ... }

// BAD: Relying on default for non-primary operations
@Transactional  // Will use primary - probably not what you want
public void saveToSecondary() { ... }
```

### 4. Use Read-Only Transactions Where Appropriate

```java
// GOOD: Read-only for query-only methods
@Transactional(readOnly = true)
public List<User> findAllUsers() {
    return userRepository.findAll();
}

// This tells Hibernate it can skip dirty checking and flush operations
```

### 5. Handle Connection Pool Sizing

```yaml
# Size pools based on actual usage patterns
spring:
  datasource:
    primary:
      hikari:
        maximum-pool-size: 20  # Higher for main app traffic
    secondary:
      hikari:
        maximum-pool-size: 5   # Lower for audit logging
```

### 6. Monitor Both Connection Pools

```java
// HealthIndicator for multiple data sources
@Component
public class DataSourceHealthIndicator implements HealthIndicator {

    @Autowired
    @Qualifier("primaryDataSource")
    private HikariDataSource primaryDataSource;

    @Autowired
    @Qualifier("secondaryDataSource")
    private HikariDataSource secondaryDataSource;

    @Override
    public Health health() {
        try {
            // Check both pools
            int primaryActive = primaryDataSource.getHikariPoolMXBean()
                .getActiveConnections();
            int secondaryActive = secondaryDataSource.getHikariPoolMXBean()
                .getActiveConnections();

            return Health.up()
                .withDetail("primaryActiveConnections", primaryActive)
                .withDetail("secondaryActiveConnections", secondaryActive)
                .build();

        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

---

## Conclusion

Configuring multiple data sources in Spring Boot requires understanding how the JPA components work together. The key points to remember:

1. **Separate Packages**: Keep entities and repositories for each data source in their own packages. This is how Spring knows which EntityManagerFactory to use.

2. **One Primary**: Mark one data source as `@Primary` so Spring has a default to fall back on.

3. **Explicit Transactions**: Always specify the transaction manager when working with non-primary data sources.

4. **No Distributed Transactions**: Spring does not support XA transactions out of the box. Use compensating transactions or eventual consistency patterns.

5. **Test Both**: Integration tests should verify that both data sources work correctly and independently.

With these patterns in place, you can cleanly separate concerns across multiple databases while maintaining the productivity that Spring Boot provides.

---

*Managing multiple databases in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for all your database connections - track connection pool health, query latency, and get alerted before issues impact your users. Start monitoring your Spring Boot applications today.*
