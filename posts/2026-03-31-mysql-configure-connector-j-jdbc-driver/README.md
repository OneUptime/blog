# How to Configure MySQL Connector/J (Java JDBC Driver)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connector/J, JDBC, Java, Connection Pool

Description: Configure MySQL Connector/J for production Java applications with connection pooling, SSL, performance tuning, and failover settings.

---

## MySQL Connector/J Overview

MySQL Connector/J is the official JDBC driver for connecting Java applications to MySQL. Proper configuration of connection URL parameters, SSL settings, and connection pool integration is critical for reliable, high-performance production deployments.

## Adding the Dependency

```xml
<!-- pom.xml (Maven) -->
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <version>9.1.0</version>
</dependency>
```

```kotlin
// build.gradle.kts
dependencies {
    runtimeOnly("com.mysql:mysql-connector-j:9.1.0")
}
```

## Basic Connection URL

```text
jdbc:mysql://hostname:3306/database?param1=value1&param2=value2
```

Key URL parameters explained:

```text
jdbc:mysql://db.example.com:3306/myapp
  ?sslMode=VERIFY_IDENTITY
  &serverTimezone=UTC
  &characterEncoding=UTF-8
  &autoReconnect=false
  &failOverReadOnly=false
  &connectTimeout=10000
  &socketTimeout=30000
```

## Production Configuration with HikariCP

HikariCP is the recommended connection pool for Java applications. Here is a complete production configuration:

```java
// DatabaseConfig.java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

public class DatabaseConfig {

    public static HikariDataSource createDataSource() {
        HikariConfig config = new HikariConfig();

        config.setJdbcUrl(
            "jdbc:mysql://db.example.com:3306/myapp"
            + "?sslMode=REQUIRED"
            + "&serverTimezone=UTC"
            + "&characterEncoding=utf8"
            + "&connectTimeout=10000"
            + "&socketTimeout=30000"
            + "&autoReconnect=false"
        );
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setDriverClassName("com.mysql.cj.jdbc.Driver");

        // Pool sizing
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);

        // Connection lifecycle
        config.setConnectionTimeout(30_000);     // 30s - wait for a connection from the pool
        config.setIdleTimeout(600_000);          // 10m - remove idle connections
        config.setMaxLifetime(1_800_000);        // 30m - recycle all connections periodically
        config.setKeepaliveTime(300_000);        // 5m - keepalive ping

        // Validation
        config.setConnectionTestQuery("SELECT 1");
        config.setPoolName("MySQLPool");

        return new HikariDataSource(config);
    }
}
```

## Spring Boot Configuration

In Spring Boot, configure Connector/J through `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:3306/${DB_NAME}?sslMode=REQUIRED&serverTimezone=UTC&characterEncoding=utf8
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      keepalive-time: 300000
      connection-test-query: SELECT 1
```

## Read/Write Splitting with Replication URL

Connector/J supports automatic read/write splitting with the `replication://` protocol:

```text
jdbc:mysql:replication://primary.db.example.com:3306,replica1.db.example.com:3306/myapp
  ?sslMode=REQUIRED
  &serverTimezone=UTC
  &readFromSourceWhenNoReplicas=true
```

In your code, set the connection to read-only for queries that should go to replicas:

```java
connection.setReadOnly(true);  // Routes to replica
// Run SELECT queries
connection.setReadOnly(false); // Routes to primary
// Run writes
```

## Debugging Connector/J Issues

Enable query logging:

```text
# In JDBC URL - logs all queries and execution times
&logger=com.mysql.cj.log.Slf4JLogger
&profileSQL=true
&slowQueryThresholdMillis=1000
&logSlowQueries=true
```

## Summary

Configuring MySQL Connector/J for production requires setting `serverTimezone=UTC`, enabling SSL via the `sslMode` property, tuning connection and socket timeouts, and pairing it with HikariCP for connection pooling. The `maxLifetime` setting ensures connections are recycled before MySQL's `wait_timeout` closes them, preventing `CommunicationsException` errors in long-running applications.
