# How to Use ClickHouse Java Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Java, Client, Integration, JDBC

Description: Learn how to connect to ClickHouse from Java using the official clickhouse-java client, including executing queries, inserting rows, streaming results, and configuring connection pools.

---

The official `clickhouse-java` library provides a modern Java client for ClickHouse with support for the native HTTP protocol, streaming inserts, asynchronous operations, and a standard JDBC interface. It replaces the older `ru.yandex.clickhouse` driver and supports Java 8+.

## Maven Dependency

```xml
<dependencies>
    <!-- Core HTTP client -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-http-client</artifactId>
        <version>0.6.5</version>
    </dependency>

    <!-- JDBC driver (optional) -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-jdbc</artifactId>
        <version>0.6.5</version>
        <classifier>all</classifier>
    </dependency>
</dependencies>
```

## Gradle Dependency

```text
implementation 'com.clickhouse:clickhouse-http-client:0.6.5'
implementation 'com.clickhouse:clickhouse-jdbc:0.6.5:all'
```

## Basic Connection and Query

```java
import com.clickhouse.client.*;
import com.clickhouse.data.*;

import java.util.List;

public class ClickHouseBasic {

    public static void main(String[] args) throws Exception {
        ClickHouseNode server = ClickHouseNode.of(
            "http://localhost:8123/default?compress=1"
        );

        try (ClickHouseClient client = ClickHouseClient.newInstance(
                ClickHouseProtocol.HTTP)) {

            ClickHouseRequest<?> request = client.read(server);

            // Simple query
            try (ClickHouseResponse response = request
                    .query("SELECT version(), uptime()")
                    .executeAndWait()) {

                for (ClickHouseRecord record : response.records()) {
                    System.out.println("Version: " + record.getValue(0).asString());
                    System.out.println("Uptime:  " + record.getValue(1).asLong());
                }
            }
        }
    }
}
```

## Create a Table

```java
try (ClickHouseResponse response = client.read(server)
        .query("""
            CREATE TABLE IF NOT EXISTS events (
                event_id   UUID         DEFAULT generateUUIDv4(),
                user_id    UInt64,
                event_name LowCardinality(String),
                created_at DateTime64(3, 'UTC'),
                amount     Nullable(Float64)
            )
            ENGINE = MergeTree()
            PARTITION BY toYYYYMM(created_at)
            ORDER BY (user_id, created_at)
            """)
        .executeAndWait()) {
    System.out.println("Table created");
}
```

## Insert Rows

```java
import com.clickhouse.data.value.ClickHouseStringValue;

List<String> insertRows = List.of(
    "('00000000-0000-0000-0000-000000000001', 1001, 'purchase', '2024-01-15 10:00:00', 49.99)",
    "('00000000-0000-0000-0000-000000000002', 1002, 'page_view', '2024-01-15 10:01:00', null)"
);

String values = String.join(",", insertRows);

try (ClickHouseResponse response = client.write(server)
        .query("INSERT INTO events (event_id, user_id, event_name, created_at, amount) VALUES " + values)
        .executeAndWait()) {
    System.out.println("Rows inserted");
}
```

## Streaming Insert with ClickHouseWriter

For high-throughput inserts, use the streaming API to avoid building large SQL strings:

```java
import com.clickhouse.client.*;
import com.clickhouse.data.*;
import com.clickhouse.data.format.BinaryStreamUtils;

import java.time.LocalDateTime;
import java.util.TimeZone;

try (ClickHouseClient client = ClickHouseClient.newInstance(ClickHouseProtocol.HTTP);
     ClickHouseResponse response = client.write(server)
         .format(ClickHouseFormat.RowBinary)
         .query("INSERT INTO events (user_id, event_name, created_at)")
         .data(stream -> {
             TimeZone utc = TimeZone.getTimeZone("UTC");
             for (int i = 0; i < 10000; i++) {
                 BinaryStreamUtils.writeUInt64(stream, (long) (i % 1000));
                 BinaryStreamUtils.writeString(stream, "page_view");
                 BinaryStreamUtils.writeDateTime64(stream,
                     LocalDateTime.now(), 3, utc);
             }
         })
         .executeAndWait()) {
    System.out.println("Streamed insert completed");
}
```

## JDBC Connection

```java
import java.sql.*;
import java.util.Properties;

public class ClickHouseJDBC {

    public static Connection getConnection() throws SQLException {
        String url = "jdbc:ch://localhost:8123/default";
        Properties props = new Properties();
        props.setProperty("user", "default");
        props.setProperty("password", "");
        props.setProperty("compress", "1");
        props.setProperty("socket_timeout", "300000");
        return DriverManager.getConnection(url, props);
    }

    public static void main(String[] args) throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT user_id, count() AS cnt FROM events " +
                 "GROUP BY user_id ORDER BY cnt DESC LIMIT 10")) {

            ResultSetMetaData meta = rs.getMetaData();
            while (rs.next()) {
                long userId = rs.getLong("user_id");
                long count  = rs.getLong("cnt");
                System.out.printf("User %d: %d events%n", userId, count);
            }
        }
    }
}
```

## Prepared Statement with JDBC

```java
String sql = "INSERT INTO events (user_id, event_name, created_at, amount) VALUES (?, ?, ?, ?)";

try (Connection conn = getConnection();
     PreparedStatement pstmt = conn.prepareStatement(sql)) {

    pstmt.setLong(1, 1001L);
    pstmt.setString(2, "purchase");
    pstmt.setTimestamp(3, new java.sql.Timestamp(System.currentTimeMillis()));
    pstmt.setDouble(4, 99.95);
    pstmt.executeUpdate();

    System.out.println("Row inserted via prepared statement");
}
```

## Batch Insert with JDBC

```java
try (Connection conn = getConnection();
     PreparedStatement pstmt = conn.prepareStatement(
         "INSERT INTO events (user_id, event_name, created_at) VALUES (?, ?, ?)")) {

    conn.setAutoCommit(false);

    for (int i = 0; i < 10000; i++) {
        pstmt.setLong(1, i % 500);
        pstmt.setString(2, i % 2 == 0 ? "click" : "view");
        pstmt.setTimestamp(3, new java.sql.Timestamp(System.currentTimeMillis()));
        pstmt.addBatch();

        if (i % 1000 == 0) {
            pstmt.executeBatch();
        }
    }
    pstmt.executeBatch();
    conn.commit();
    System.out.println("Batch complete");
}
```

## Connection Pool with HikariCP

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:ch://localhost:8123/default");
config.setUsername("default");
config.setPassword("");
config.setMaximumPoolSize(10);
config.setMinimumIdle(2);
config.setConnectionTimeout(10_000);
config.setIdleTimeout(600_000);
config.setMaxLifetime(1_800_000);
config.addDataSourceProperty("compress", "1");

HikariDataSource dataSource = new HikariDataSource(config);

// Use the pool
try (Connection conn = dataSource.getConnection();
     Statement stmt = conn.createStatement();
     ResultSet rs = stmt.executeQuery("SELECT count() FROM events")) {
    rs.next();
    System.out.println("Total events: " + rs.getLong(1));
}
```

## Stream Large Query Results

```java
try (Connection conn = getConnection();
     Statement stmt = conn.createStatement()) {

    // Fetch rows in chunks of 10,000
    stmt.setFetchSize(10_000);

    try (ResultSet rs = stmt.executeQuery(
            "SELECT event_id, user_id, event_name, created_at FROM events")) {

        long count = 0;
        while (rs.next()) {
            count++;
            // process each row without loading everything into memory
        }
        System.out.println("Processed " + count + " rows");
    }
}
```

## Error Handling

```java
import com.clickhouse.client.ClickHouseException;

try (ClickHouseResponse response = client.read(server)
        .query("SELECT * FROM nonexistent_table")
        .executeAndWait()) {
    // process response
} catch (ClickHouseException e) {
    System.err.println("ClickHouse error " + e.getErrorCode() + ": " + e.getMessage());
} catch (Exception e) {
    System.err.println("Unexpected error: " + e.getMessage());
}
```

## Using Spring Boot with ClickHouse JDBC

```java
// application.properties
// spring.datasource.url=jdbc:ch://localhost:8123/default
// spring.datasource.username=default
// spring.datasource.password=
// spring.datasource.driver-class-name=com.clickhouse.jdbc.ClickHouseDriver

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EventRepository {

    private final JdbcTemplate jdbc;

    public EventRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long countByUser(long userId) {
        return jdbc.queryForObject(
            "SELECT count() FROM events WHERE user_id = ?",
            Long.class,
            userId
        );
    }
}
```

## Common Pitfalls

- ClickHouse does not support transactions. `conn.setAutoCommit(false)` is accepted by the JDBC driver but has no effect. Batches are committed immediately on `executeBatch()`.
- Use `setFetchSize()` on the `Statement` before executing large queries. Without it, the JDBC driver may attempt to load the full result set into memory.
- The `clickhouse-jdbc` all-in-one jar (classifier `all`) includes shaded dependencies. Use it in applications to avoid classpath conflicts.
- Connection URLs use `jdbc:ch://` not `jdbc:clickhouse://` for the v2 driver. The old scheme still works but is deprecated.

## Summary

The `clickhouse-java` library provides both a low-level async HTTP client and a standard JDBC interface. Use the HTTP client for maximum performance with streaming inserts, JDBC for integration with frameworks like Spring or Hibernate, and HikariCP for connection pooling in production. Batch inserts and streaming are essential for achieving the throughput ClickHouse is designed for.
