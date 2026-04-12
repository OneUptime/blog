# How to Use MySQL with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spring Boot, Java, JPA, Hibernate, Database Configuration

Description: Learn how to connect Spring Boot to MySQL, configure JPA and Hibernate, manage connection pooling with HikariCP, and handle migrations with Flyway.

---

## Prerequisites

You need Java 17+, Maven or Gradle, a Spring Boot 3.x project, and a running MySQL 8.0+ instance.

## Adding Dependencies

For Maven, add the MySQL connector and Spring Data JPA to `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

For Gradle in `build.gradle`:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
runtimeOnly 'com.mysql:mysql-connector-j'
```

## Configuring application.properties

```properties
# DataSource
spring.datasource.url=jdbc:mysql://localhost:3306/myapp_db?useSSL=false&serverTimezone=UTC&characterEncoding=UTF-8
spring.datasource.username=myapp_user
spring.datasource.password=secretpassword
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA / Hibernate
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true

# HikariCP connection pool
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.max-lifetime=1800000
```

## Creating the Database and User

```sql
CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'secretpassword';
GRANT ALL PRIVILEGES ON myapp_db.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
```

## Defining a JPA Entity

```java
package com.example.myapp.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products",
       indexes = {
           @Index(name = "idx_product_name", columnList = "name")
       })
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // getters and setters
}
```

## Creating a Repository

```java
package com.example.myapp.repository;

import com.example.myapp.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByNameContainingIgnoreCase(String name);

    List<Product> findByPriceLessThanEqual(BigDecimal maxPrice);

    @Query("SELECT p FROM Product p WHERE p.stock > 0 ORDER BY p.price ASC")
    List<Product> findAvailableProducts();

    @Query(value = "SELECT * FROM products WHERE MATCH(name, description) AGAINST (:term IN BOOLEAN MODE)",
           nativeQuery = true)
    List<Product> fullTextSearch(@Param("term") String term);
}
```

## Using Transactions in a Service

```java
package com.example.myapp.service;

import com.example.myapp.model.Product;
import com.example.myapp.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final ProductRepository productRepository;

    public OrderService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    public void placeOrder(Long productId, int quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getStock() < quantity) {
            throw new RuntimeException("Insufficient stock");
        }

        product.setStock(product.getStock() - quantity);
        productRepository.save(product);
        // additional order creation logic
    }
}
```

## Database Migrations with Flyway

Add Flyway to handle schema evolution:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

Configure in `application.properties`:

```properties
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.jpa.hibernate.ddl-auto=validate
```

Create migration files in `src/main/resources/db/migration/`:

```sql
-- V1__Create_products_table.sql
CREATE TABLE products (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_product_name (name),
    FULLTEXT INDEX ft_name_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Summary

Connecting Spring Boot to MySQL requires the `mysql-connector-j` dependency, a properly configured DataSource in `application.properties`, and JPA entities annotated with `@Entity`. HikariCP is the default connection pool in Spring Boot and should be tuned to match your database's `max_connections`. Use Flyway for repeatable, version-controlled schema migrations rather than `spring.jpa.hibernate.ddl-auto=update` in production environments.
