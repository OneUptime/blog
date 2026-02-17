# How to Implement Connection Pooling for Cloud Spanner in a Spring Boot Application Using the Spanner JDBC Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Spring Boot, JDBC, Connection Pooling, Java

Description: Learn how to configure connection pooling for Cloud Spanner in a Spring Boot application using the Spanner JDBC driver and HikariCP for optimal performance.

---

Cloud Spanner is a distributed database, and connecting to it through JDBC is different from connecting to a traditional database like PostgreSQL or MySQL. The Spanner JDBC driver creates gRPC sessions under the hood, and how you configure your connection pool has a direct impact on performance and cost. Get it wrong and you end up with session leaks, high latency, or unnecessary resource consumption.

This post covers how to set up connection pooling for Cloud Spanner in a Spring Boot application using the official Spanner JDBC driver and HikariCP.

## Understanding Spanner Sessions

Before diving into configuration, it helps to understand what happens when you open a JDBC connection to Spanner. The Spanner JDBC driver manages a session pool internally. Each JDBC connection maps to a Spanner session, and sessions are the unit of work on Spanner. Sessions hold resources on the Spanner servers, so having too many idle sessions wastes resources.

The tricky part is that you effectively have two levels of pooling: HikariCP pools JDBC connections, and the Spanner JDBC driver pools Spanner sessions. You need to coordinate these two layers.

## Adding Dependencies

Start with the Spanner JDBC driver dependency:

```xml
<!-- Spanner JDBC driver -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-spanner-jdbc</artifactId>
    <version>2.15.0</version>
</dependency>

<!-- Spring Boot JDBC starter (includes HikariCP) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>

<!-- Spring Data JPA if you want ORM support -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

## Basic JDBC URL Configuration

The Spanner JDBC URL format includes the project, instance, and database:

```properties
# Spanner JDBC connection URL
spring.datasource.url=jdbc:cloudspanner:/projects/my-project/instances/my-instance/databases/my-database

# The Spanner JDBC driver class
spring.datasource.driver-class-name=com.google.cloud.spanner.jdbc.JdbcDriver
```

You do not need a username or password. The driver uses Application Default Credentials or the service account attached to the GCP environment.

## Configuring HikariCP for Spanner

Here is where the tuning matters. The HikariCP defaults are designed for traditional databases and do not work well with Spanner out of the box.

```properties
# HikariCP pool configuration optimized for Spanner
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.connection-timeout=10000
spring.datasource.hikari.keepalive-time=300000

# Disable connection test query - Spanner handles this differently
spring.datasource.hikari.connection-test-query=SELECT 1
```

Let me explain the key settings:

**maximum-pool-size**: Keep this modest. Each connection consumes a Spanner session, and sessions hold server-side resources. For most applications, 10-20 connections is plenty. If you are running multiple replicas, multiply this by the replica count to get the total sessions against your Spanner instance.

**minimum-idle**: Set this to match or be slightly less than the maximum pool size. Spanner session creation has some overhead, so you want to avoid creating sessions on every request.

**idle-timeout**: How long a connection can sit idle before being removed. Set this higher than you would for a traditional database because Spanner session creation is more expensive than a TCP connection.

**keepalive-time**: This sends periodic pings to keep idle connections alive. Spanner sessions time out after extended idle periods, so this prevents stale sessions.

## Advanced Configuration with Java Config

For more control, configure the DataSource programmatically:

```java
@Configuration
public class SpannerDataSourceConfig {

    @Value("${spanner.project}")
    private String project;

    @Value("${spanner.instance}")
    private String instance;

    @Value("${spanner.database}")
    private String database;

    // Configure the HikariCP data source with Spanner-specific settings
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Build the Spanner JDBC URL with session pool settings
        String jdbcUrl = String.format(
                "jdbc:cloudspanner:/projects/%s/instances/%s/databases/%s"
                + ";minSessions=5"
                + ";maxSessions=20"
                + ";numChannels=4"
                + ";autocommit=true",
                project, instance, database);

        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("com.google.cloud.spanner.jdbc.JdbcDriver");

        // HikariCP pool settings
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        config.setConnectionTimeout(10000);
        config.setKeepaliveTime(300000);

        // Pool name for monitoring
        config.setPoolName("spanner-pool");

        // Validation query
        config.setConnectionTestQuery("SELECT 1");

        return new HikariDataSource(config);
    }
}
```

The JDBC URL parameters `minSessions`, `maxSessions`, and `numChannels` control the Spanner session pool that sits underneath HikariCP.

## Coordinating the Two Pool Layers

This is the most important part. You need to align the HikariCP pool size with the Spanner session pool size.

```
HikariCP Pool (JDBC connections) --> Spanner Session Pool (gRPC sessions) --> Spanner Backend
```

The rule is: set the Spanner session pool `maxSessions` equal to or slightly larger than the HikariCP `maximum-pool-size`. If HikariCP can hand out 10 connections, the Spanner session pool needs at least 10 sessions.

Here is a well-coordinated configuration:

```java
// Coordinated pool configuration
@Bean
public DataSource coordinatedDataSource() {
    int poolSize = 10;

    HikariConfig config = new HikariConfig();

    // Spanner session pool matches HikariCP pool
    String jdbcUrl = String.format(
            "jdbc:cloudspanner:/projects/%s/instances/%s/databases/%s"
            + ";minSessions=%d"
            + ";maxSessions=%d",
            project, instance, database,
            poolSize,   // minSessions matches pool size for pre-warming
            poolSize);  // maxSessions matches pool size to prevent over-allocation

    config.setJdbcUrl(jdbcUrl);
    config.setDriverClassName("com.google.cloud.spanner.jdbc.JdbcDriver");
    config.setMaximumPoolSize(poolSize);
    config.setMinimumIdle(poolSize); // Keep all connections warm

    return new HikariDataSource(config);
}
```

## Using JdbcTemplate with the Pool

Once the DataSource is configured, you use it like any other JDBC connection:

```java
@Repository
public class ProductRepository {

    private final JdbcTemplate jdbcTemplate;

    // JdbcTemplate uses the HikariCP-managed DataSource
    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Product> findAll() {
        return jdbcTemplate.query(
                "SELECT product_id, name, price FROM products ORDER BY name",
                (rs, rowNum) -> new Product(
                        rs.getString("product_id"),
                        rs.getString("name"),
                        rs.getBigDecimal("price")));
    }

    public void create(Product product) {
        jdbcTemplate.update(
                "INSERT INTO products (product_id, name, price) VALUES (?, ?, ?)",
                product.getId(), product.getName(), product.getPrice());
    }

    // Transactions work through standard Spring @Transactional
    @Transactional
    public void transferInventory(String fromId, String toId, int quantity) {
        jdbcTemplate.update(
                "UPDATE products SET stock = stock - ? WHERE product_id = ?",
                quantity, fromId);
        jdbcTemplate.update(
                "UPDATE products SET stock = stock + ? WHERE product_id = ?",
                quantity, toId);
    }
}
```

## Monitoring the Connection Pool

Add Micrometer metrics to monitor pool health:

```properties
# Enable HikariCP metrics
management.metrics.enable.hikaricp=true
management.endpoints.web.exposure.include=health,metrics
```

You can then query metrics like `hikaricp_connections_active`, `hikaricp_connections_idle`, and `hikaricp_connections_pending` to understand pool utilization.

```java
// Custom monitoring endpoint for pool diagnostics
@RestController
@RequestMapping("/api/pool-stats")
public class PoolStatsController {

    private final HikariDataSource dataSource;

    public PoolStatsController(DataSource dataSource) {
        this.dataSource = (HikariDataSource) dataSource;
    }

    @GetMapping
    public Map<String, Object> getPoolStats() {
        HikariPoolMXBean pool = dataSource.getHikariPoolMXBean();
        return Map.of(
                "activeConnections", pool.getActiveConnections(),
                "idleConnections", pool.getIdleConnections(),
                "totalConnections", pool.getTotalConnections(),
                "threadsAwaitingConnection", pool.getThreadsAwaitingConnection());
    }
}
```

## Common Pitfalls

A few things that catch people off guard:

Do not set `max-lifetime` too low. When HikariCP retires a connection, the underlying Spanner session is destroyed and a new one must be created. Session creation involves a round trip to the Spanner servers.

Do not disable connection validation. Spanner sessions can become stale if the server-side resources are cleaned up. The validation query ensures you get a working session.

Watch out for session leaks. If your code opens a connection but does not return it to the pool (for example, by not closing it in a finally block), you will eventually exhaust the pool. Spring's `JdbcTemplate` handles this automatically, but if you are using raw JDBC connections, always close them.

## Wrapping Up

Connection pooling for Cloud Spanner requires coordinating two layers: HikariCP for JDBC connections and the Spanner JDBC driver's internal session pool. Align the pool sizes, set appropriate idle and keepalive timeouts, and monitor pool metrics to catch issues early. The key insight is that Spanner sessions are more expensive than traditional database connections, so right-size your pools and keep connections warm rather than creating them on demand.
