# How to Implement Connection Pooling for MySQL in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pool, Java, HikariCP, Performance

Description: Learn how to implement MySQL connection pooling in Java using HikariCP and Apache DBCP2, including configuration best practices and connection validation.

---

## Introduction

Every MySQL connection consumes memory on both the client and server. Without pooling, a high-traffic Java application can exhaust MySQL's `max_connections` limit quickly. Connection pooling reuses established connections, keeping overhead low and throughput high.

## Option 1: HikariCP (Recommended)

HikariCP is the fastest and most popular JDBC connection pool for Java. Add the Maven dependency:

```xml
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>5.1.0</version>
</dependency>
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.2.0</version>
</dependency>
```

Configure and use HikariCP:

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import java.sql.*;

public class DatabasePool {

    private static final HikariDataSource dataSource;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb?sslMode=DISABLED&serverTimezone=UTC");
        config.setUsername("root");
        config.setPassword("password");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(300_000);        // 5 minutes
        config.setConnectionTimeout(30_000);   // 30 seconds
        config.setMaxLifetime(1_800_000);      // 30 minutes
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        dataSource = new HikariDataSource(config);
    }

    public static DataSource getDataSource() {
        return dataSource;
    }
}
```

Using the pool:

```java
public List<Product> findAffordableProducts(double maxPrice) throws SQLException {
    List<Product> products = new ArrayList<>();
    String sql = "SELECT id, name, price, stock FROM products WHERE price <= ? AND stock > 0 ORDER BY price";

    try (Connection conn = DatabasePool.getDataSource().getConnection();
         PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setDouble(1, maxPrice);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                products.add(new Product(
                    rs.getInt("id"),
                    rs.getString("name"),
                    rs.getDouble("price"),
                    rs.getInt("stock")
                ));
            }
        }
    }
    return products;
}
```

## Option 2: Apache DBCP2

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-dbcp2</artifactId>
    <version>2.12.0</version>
</dependency>
```

```java
import org.apache.commons.dbcp2.BasicDataSource;
import java.time.Duration;

BasicDataSource ds = new BasicDataSource();
ds.setUrl("jdbc:mysql://localhost:3306/mydb?sslMode=DISABLED&serverTimezone=UTC");
ds.setUsername("root");
ds.setPassword("password");
ds.setInitialSize(5);
ds.setMaxTotal(20);
ds.setMaxIdle(10);
ds.setMinIdle(5);
ds.setMaxWait(Duration.ofSeconds(30));
ds.setValidationQuery("SELECT 1");
ds.setTestOnBorrow(true);
ds.setTestWhileIdle(true);
ds.setDurationBetweenEvictionRuns(Duration.ofSeconds(60));
```

## Spring Boot Integration

Spring Boot auto-configures HikariCP when it is on the classpath:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb?sslMode=DISABLED&serverTimezone=UTC
    username: root
    password: password
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 30000
      max-lifetime: 1800000
```

## Monitoring Pool Usage

```java
HikariPoolMXBean poolMXBean = ((HikariDataSource) dataSource).getHikariPoolMXBean();
System.out.println("Active: " + poolMXBean.getActiveConnections());
System.out.println("Idle: " + poolMXBean.getIdleConnections());
System.out.println("Total: " + poolMXBean.getTotalConnections());
System.out.println("Waiting: " + poolMXBean.getThreadsAwaitingConnection());
```

## Summary

HikariCP is the recommended connection pool for Java MySQL applications due to its low latency and minimal overhead. Configure `maximumPoolSize` based on your workload (typically 10-20 for OLTP) and monitor pool metrics in production. With JDBC4 drivers like MySQL Connector/J 8.x, HikariCP automatically uses `Connection.isValid()` to detect stale connections, so you do not need to set `connectionTestQuery`. Spring Boot auto-configures HikariCP when the dependency is present.
