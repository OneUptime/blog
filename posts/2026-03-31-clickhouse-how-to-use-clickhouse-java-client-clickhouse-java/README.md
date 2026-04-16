# How to Use ClickHouse Java Client (clickhouse-java)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Java, JDBC, Client, Database

Description: Learn how to connect to ClickHouse from Java using the clickhouse-java client library and JDBC driver to run queries, insert data, and manage connections.

---

## Adding Dependencies

### Maven

```xml
<dependency>
    <groupId>com.clickhouse</groupId>
    <artifactId>clickhouse-jdbc</artifactId>
    <version>0.9.8</version>
    <classifier>all</classifier>
</dependency>
```

### Gradle

```groovy
implementation 'com.clickhouse:clickhouse-jdbc:0.9.8:all'
```

## Connecting via JDBC

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ClickHouseExample {

    public static void main(String[] args) throws Exception {
        String url = "jdbc:ch://localhost:8123/default";
        String user = "default";
        String password = "";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to ClickHouse");

            try (Statement stmt = conn.createStatement()) {
                ResultSet rs = stmt.executeQuery("SELECT count() FROM system.tables");
                if (rs.next()) {
                    System.out.println("Tables count: " + rs.getLong(1));
                }
            }
        }
    }
}
```

## Using Prepared Statements

```java
import java.sql.*;

String sql = "SELECT user_id, event_type, ts FROM user_events WHERE event_type = ? LIMIT 100";

try (Connection conn = DriverManager.getConnection(url, user, password);
     PreparedStatement pstmt = conn.prepareStatement(sql)) {

    pstmt.setString(1, "purchase");

    try (ResultSet rs = pstmt.executeQuery()) {
        while (rs.next()) {
            long userId = rs.getLong("user_id");
            String eventType = rs.getString("event_type");
            Timestamp ts = rs.getTimestamp("ts");
            System.out.printf("User %d did %s at %s%n", userId, eventType, ts);
        }
    }
}
```

## Creating Tables

```java
try (Connection conn = DriverManager.getConnection(url, user, password);
     Statement stmt = conn.createStatement()) {

    stmt.execute("""
        CREATE TABLE IF NOT EXISTS user_events (
            user_id    UInt64,
            event_type String,
            ts         DateTime
        ) ENGINE = MergeTree()
        ORDER BY (user_id, ts)
    """);

    System.out.println("Table created");
}
```

## Batch Inserting Data

```java
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

String insertSql = "INSERT INTO user_events (user_id, event_type, ts) VALUES (?, ?, ?)";

try (Connection conn = DriverManager.getConnection(url, user, password);
     PreparedStatement pstmt = conn.prepareStatement(insertSql)) {

    for (int i = 0; i < 10000; i++) {
        pstmt.setLong(1, i);
        pstmt.setString(2, "login");
        pstmt.setTimestamp(3, new Timestamp(System.currentTimeMillis()));
        pstmt.addBatch();

        if (i % 1000 == 0) {
            pstmt.executeBatch();
            System.out.println("Flushed batch at row " + i);
        }
    }
    pstmt.executeBatch();
    System.out.println("Insert complete");
}
```

## Using HikariCP Connection Pool

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:ch://localhost:8123/default");
config.setUsername("default");
config.setPassword("");
config.setMaximumPoolSize(10);
config.setMinimumIdle(2);
config.setConnectionTimeout(30000);

HikariDataSource dataSource = new HikariDataSource(config);

try (Connection conn = dataSource.getConnection();
     Statement stmt = conn.createStatement()) {
    ResultSet rs = stmt.executeQuery("SELECT now()");
    if (rs.next()) {
        System.out.println("Server time: " + rs.getString(1));
    }
}
```

## Configuring SSL

```java
String url = "jdbc:ch://your-clickhouse-host:8443/default?" +
             "ssl=true&sslmode=strict&sslrootcert=/path/to/ca.crt";

Connection conn = DriverManager.getConnection(url, "default", "password");
```

## Passing Query Settings via JDBC

```java
// Append settings to the JDBC URL using the clickhouse_setting_ prefix
String url = "jdbc:ch://localhost:8123/default?" +
             "clickhouse_setting_max_execution_time=60" +
             "&clickhouse_setting_max_memory_usage=10000000000";
```

Or use connection properties:

```java
java.util.Properties props = new java.util.Properties();
props.setProperty("user", "default");
props.setProperty("password", "");
props.setProperty("clickhouse_setting_max_execution_time", "60");

Connection conn = DriverManager.getConnection(
    "jdbc:ch://localhost:8123/default", props
);
```

## Summary

The `clickhouse-java` JDBC driver enables standard Java database connectivity to ClickHouse using familiar `Connection`, `PreparedStatement`, and `ResultSet` APIs. Use batch inserts with `addBatch()`/`executeBatch()` for high-throughput writes, HikariCP for connection pooling in production, and JDBC URL parameters to pass ClickHouse-specific query settings.
