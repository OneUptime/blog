# How to Bind Azure Spring Apps to Azure Database for MySQL and Redis Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Spring Apps, MySQL, Redis Cache, Service Binding, Spring Boot, Java, Database Configuration

Description: Learn how to connect Azure Spring Apps to Azure Database for MySQL and Azure Cache for Redis using service bindings for simplified configuration management.

---

Most Spring Boot applications need a database and a caching layer. In Azure, that typically means Azure Database for MySQL and Azure Cache for Redis. While you could manually configure connection strings and credentials in your application properties, Azure Spring Apps provides a service binding feature that injects connection information automatically. This guide covers both approaches and explains when each makes sense.

## Why Service Bindings

Hardcoding database credentials in application.yml is a security risk and a maintenance headache. Every time a password rotates or a connection string changes, you need to update the configuration and redeploy. Service bindings solve this by letting Azure Spring Apps inject the connection details as environment variables at runtime. Your application reads them through Spring's property resolution, and you never store credentials in your source code.

## Prerequisites

- Azure Spring Apps Standard or Enterprise tier
- Azure Database for MySQL Flexible Server
- Azure Cache for Redis
- Azure CLI with the spring extension
- A Spring Boot application with Spring Data JPA and Spring Data Redis dependencies

## Part 1: Setting Up Azure Database for MySQL

### Create the MySQL Server

If you do not already have a MySQL server, create one:

```bash
# Create Azure Database for MySQL Flexible Server
RESOURCE_GROUP="rg-spring-production"
MYSQL_SERVER="myorg-mysql-server"
ADMIN_USER="springadmin"
ADMIN_PASSWORD="$(openssl rand -base64 24)"

az mysql flexible-server create \
    --name $MYSQL_SERVER \
    --resource-group $RESOURCE_GROUP \
    --location eastus \
    --admin-user $ADMIN_USER \
    --admin-password "$ADMIN_PASSWORD" \
    --sku-name Standard_B2ms \
    --tier Burstable \
    --storage-size 32 \
    --version 8.0

# Create the application database
az mysql flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $MYSQL_SERVER \
    --database-name orderdb
```

### Configure Networking

Azure Spring Apps needs network access to your MySQL server. If both resources are in the same VNet, this is handled automatically. Otherwise, enable public access and add the Spring Apps outbound IPs to the firewall:

```bash
# Allow Azure services to connect (simplest option)
az mysql flexible-server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --name $MYSQL_SERVER \
    --rule-name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

For production, I recommend VNet integration instead of public access. But the firewall rule above works for getting started.

### Bind MySQL to Your Spring App

Now create the service binding between your Spring app and MySQL:

```bash
# Create a service binding for MySQL
# This automatically injects connection properties into your app
az spring connection create mysql-flexible \
    --resource-group $RESOURCE_GROUP \
    --service myorg-spring-apps \
    --app order-service \
    --target-resource-group $RESOURCE_GROUP \
    --server $MYSQL_SERVER \
    --database orderdb \
    --secret name=$ADMIN_USER secret="$ADMIN_PASSWORD" \
    --client-type springBoot
```

This command creates a service connector that injects the following properties into your Spring Boot application at runtime:

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`

Your Spring Boot application picks these up automatically through Spring Boot's auto-configuration. You do not need to set them in application.yml.

### Configure Your Spring Boot Application

Your pom.xml should include the MySQL driver and Spring Data JPA:

```xml
<!-- pom.xml dependencies for MySQL connectivity -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

In application.yml, you only need to set JPA-specific properties. The connection URL, username, and password come from the service binding:

```yaml
# application.yml
# Connection properties are injected by the service binding
# Only configure JPA behavior here
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
    show-sql: false
    open-in-view: false
```

Here is a simple entity and repository to verify the connection works:

```java
// Order.java - JPA entity for the orders table
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // Getters and setters omitted for brevity
}

// OrderRepository.java - Spring Data JPA repository
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Spring Data generates the query from the method name
    List<Order> findByCustomerNameContaining(String name);

    // Custom query for orders above a threshold
    @Query("SELECT o FROM Order o WHERE o.amount > :threshold ORDER BY o.createdAt DESC")
    List<Order> findHighValueOrders(@Param("threshold") BigDecimal threshold);
}
```

## Part 2: Setting Up Azure Cache for Redis

### Create the Redis Instance

```bash
# Create Azure Cache for Redis
REDIS_NAME="myorg-redis-cache"

az redis create \
    --name $REDIS_NAME \
    --resource-group $RESOURCE_GROUP \
    --location eastus \
    --sku Basic \
    --vm-size c0 \
    --enable-non-ssl-port false
```

For production workloads, use Standard or Premium tier. The Basic tier has no SLA and no replication. I am using it here just for demonstration.

### Bind Redis to Your Spring App

```bash
# Create a service binding for Redis
az spring connection create redis \
    --resource-group $RESOURCE_GROUP \
    --service myorg-spring-apps \
    --app order-service \
    --target-resource-group $RESOURCE_GROUP \
    --server $REDIS_NAME \
    --database 0 \
    --client-type springBoot
```

This injects the following properties:

- `spring.redis.host`
- `spring.redis.port`
- `spring.redis.password`
- `spring.redis.ssl`

### Configure Your Spring Boot Application for Redis

Add the Redis dependency to pom.xml:

```xml
<!-- Redis dependency for caching -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

Enable caching in your Spring Boot application:

```java
// Application.java - Enable caching at the application level
@SpringBootApplication
@EnableCaching
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

Configure the Redis cache manager in your application:

```java
// RedisCacheConfig.java - Custom cache configuration
@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Configure default cache TTL of 10 minutes
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer())
            );

        // Configure specific caches with different TTLs
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        cacheConfigs.put("orders", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("customers", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

Now use the `@Cacheable` annotation in your service layer:

```java
// OrderService.java - Service with Redis caching
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Cache the result with the order ID as the key
    // Subsequent calls with the same ID skip the database query
    @Cacheable(value = "orders", key = "#id")
    public Order getOrder(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }

    // Evict the cache entry when an order is updated
    @CacheEvict(value = "orders", key = "#id")
    public Order updateOrder(Long id, OrderUpdateRequest request) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
        order.setAmount(request.getAmount());
        return orderRepository.save(order);
    }
}
```

## Verifying the Bindings

After deploying your application, verify that both service bindings are active:

```bash
# List all service connections for the app
az spring connection list \
    --resource-group $RESOURCE_GROUP \
    --service myorg-spring-apps \
    --app order-service \
    --output table

# Validate the MySQL connection
az spring connection validate \
    --resource-group $RESOURCE_GROUP \
    --service myorg-spring-apps \
    --app order-service \
    --connection mysql_orderdb

# Validate the Redis connection
az spring connection validate \
    --resource-group $RESOURCE_GROUP \
    --service myorg-spring-apps \
    --app order-service \
    --connection redis_myorg
```

## Manual Configuration Alternative

If you prefer not to use service bindings (or need more control), you can set the connection properties manually as environment variables:

```bash
# Set connection properties directly as environment variables
az spring app update \
    --name order-service \
    --service myorg-spring-apps \
    --resource-group $RESOURCE_GROUP \
    --env \
        "SPRING_DATASOURCE_URL=jdbc:mysql://myorg-mysql-server.mysql.database.azure.com:3306/orderdb?useSSL=true" \
        "SPRING_DATASOURCE_USERNAME=springadmin" \
        "SPRING_DATASOURCE_PASSWORD=$ADMIN_PASSWORD" \
        "SPRING_REDIS_HOST=myorg-redis-cache.redis.cache.windows.net" \
        "SPRING_REDIS_PORT=6380" \
        "SPRING_REDIS_PASSWORD=$REDIS_KEY" \
        "SPRING_REDIS_SSL_ENABLED=true"
```

This approach works but has downsides: you are managing secrets manually, and credential rotation requires a redeployment. Service bindings with managed identity (available on the Enterprise tier) eliminate the password management entirely.

## Connection Pooling Considerations

For production MySQL connections, configure HikariCP connection pooling in application.yml:

```yaml
# Connection pool settings for production workloads
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 30000
      connection-timeout: 20000
      max-lifetime: 1800000
```

The default HikariCP pool size of 10 is fine for development but may be too small for production traffic. Size your pool based on your expected concurrent database operations and the MySQL server's maximum connections limit.

## Summary

Binding Azure Spring Apps to MySQL and Redis is simplest with service connectors, which inject connection properties automatically. Your Spring Boot application picks them up through auto-configuration, so you do not need to hardcode credentials. For production, use VNet integration for network security, managed identity for credential-free authentication, and proper connection pooling for MySQL. With both a database and a cache layer connected, your Spring Boot application has the foundation for handling production workloads efficiently.
