# How to Deploy a Spring Boot + MySQL Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Spring Boot, MySQL, Java, Docker Compose, REST API

Description: Deploy a Spring Boot REST API with MySQL database using Docker Compose through Portainer, covering JPA configuration, connection pooling, Flyway migrations, and health checks.

## Introduction

Spring Boot is the most widely used Java web framework, and MySQL is a popular relational database choice for Java applications. Deploying both via Portainer with Docker Compose provides a containerized, production-ready environment with connection pooling, database migrations, and health checks managed through a clean interface.

## Prerequisites

- Portainer CE or BE managing a Docker Standalone environment with Docker Engine 20.10+
- A Spring Boot container image available to the Portainer-managed Docker host or in a registry, or a Dockerfile you can build into one before deploying the stack
- Basic knowledge of Spring Boot and JPA

## Step 1: Create the Spring Boot Dockerfile

```dockerfile
# Dockerfile (multi-stage build)

FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app
COPY pom.xml .
# Download dependencies separately for caching
RUN mvn dependency:go-offline -q
COPY src/ ./src/
RUN mvn package -DskipTests -q

# Runtime stage - much smaller image
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# JVM tuning for containers
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
```

Build this Dockerfile into an image and make that tag available to Portainer before deploying the stack (for example, by building it under **Images** in Portainer or by pushing it to a registry).

## Step 2: Create the Docker Compose Stack in Portainer

Navigate to **Stacks** → **Add stack** → **Web editor** and name it `springboot-app`:

```yaml
services:
  # MySQL database
  mysql:
    image: mysql:8.0
    container_name: spring-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DB:-springdb}
      MYSQL_USER: ${MYSQL_USER:-springuser}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-springpassword}
    volumes:
      - mysql_data:/var/lib/mysql
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    networks:
      - spring-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpassword}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  # Spring Boot application
  app:
    image: ${SPRING_IMAGE:-springboot-app:latest}
    container_name: spring-app
    restart: unless-stopped
    environment:
      # Spring datasource
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/${MYSQL_DB:-springdb}?sslMode=DISABLED&allowPublicKeyRetrieval=true&serverTimezone=UTC
      SPRING_DATASOURCE_USERNAME: ${MYSQL_USER:-springuser}
      SPRING_DATASOURCE_PASSWORD: ${MYSQL_PASSWORD:-springpassword}
      SPRING_DATASOURCE_DRIVERCLASSNAME: com.mysql.cj.jdbc.Driver

      # HikariCP connection pool
      SPRING_DATASOURCE_HIKARI_MAXIMUMPOOLSIZE: "20"
      SPRING_DATASOURCE_HIKARI_MINIMUMIDLE: "5"
      SPRING_DATASOURCE_HIKARI_CONNECTIONTIMEOUT: "30000"

      # JPA/Hibernate
      SPRING_JPA_HIBERNATE_DDLAUTO: validate   # Flyway handles migrations
      SPRING_JPA_SHOWSQL: "false"

      # Flyway migrations
      SPRING_FLYWAY_ENABLED: "true"
      SPRING_FLYWAY_BASELINEONMIGRATE: "true"

      # Actuator
      MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: health,info,metrics,prometheus

      # Application config
      SERVER_PORT: "8080"
      SPRING_PROFILES_ACTIVE: production
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - spring-net
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # phpMyAdmin for MySQL administration
  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    container_name: spring-phpmyadmin
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
    depends_on:
      - mysql
    networks:
      - spring-net

volumes:
  mysql_data:
    driver: local

networks:
  spring-net:
    driver: bridge
```

## Step 3: Spring Boot Application Configuration

```yaml
# src/main/resources/application-production.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: false

  flyway:
    enabled: true
    locations: classpath:db/migration

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
```

## Step 4: Flyway Migration Script

```sql
-- src/main/resources/db/migration/V1__Create_initial_schema.sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_name ON products(name);
```

## Step 5: Sample Spring Boot REST Controller

```java
// src/main/java/com/example/api/ProductController.java
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product createProduct(@RequestBody @Valid Product product) {
        return productRepository.save(product);
    }

    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }
}
```

## Step 6: Verify the Deployment

```bash
# Verify containers are running
docker ps | grep spring

# Check Spring Boot health
curl http://localhost:8080/actuator/health | jq .

# Test the API
curl http://localhost:8080/api/products

# Create a product
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","price":9.99,"stock":100}'

# View Flyway migration status
docker exec spring-mysql mysql -u springuser -pspringpassword springdb \
  -e "SELECT * FROM flyway_schema_history;"

# Watch startup logs
docker logs --tail 30 -f spring-app
```

## Conclusion

Deploying Spring Boot with MySQL via Portainer provides a robust Java application environment with HikariCP connection pooling for database efficiency, Flyway for version-controlled schema migrations, and Spring Actuator health checks for monitoring. The MySQL health check ensures Spring Boot only starts after the database is accepting connections, preventing the common `Connection refused` startup failure. For production, use Docker secrets or a secrets manager rather than environment variables for database credentials, and consider enabling MySQL SSL with `sslMode=REQUIRED` or `sslMode=VERIFY_IDENTITY` in the JDBC URL.
