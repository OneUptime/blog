# How to Use ClickHouse JDBC Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JDBC, Java, Integration, Driver

Description: Learn how to configure and use the ClickHouse JDBC driver for Java applications, including connection URLs, prepared statements, batch inserts, and connection pooling with HikariCP.

---

The official ClickHouse JDBC driver (`clickhouse-jdbc`) implements the standard `java.sql` interface on top of ClickHouse's HTTP protocol. It integrates with any Java framework that supports JDBC, including Spring, Hibernate, MyBatis, and standalone applications. This guide covers everything from adding the dependency to production-ready connection pooling.

## Maven Dependency

```xml
<dependency>
    <groupId>com.clickhouse</groupId>
    <artifactId>clickhouse-jdbc</artifactId>
    <version>0.6.5</version>
    <!-- Use the all-in-one shaded jar to avoid dependency conflicts -->
    <classifier>all</classifier>
    <exclusions>
        <exclusion>
            <groupId>*</groupId>
            <artifactId>*</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

## Gradle Dependency

```text
implementation 'com.clickhouse:clickhouse-jdbc:0.6.5:all'
```

## JDBC Connection URL Format

```text
jdbc:ch://<host>:<port>/<database>[?param=value&...]
```

Examples:

```text
jdbc:ch://localhost:8123/default
jdbc:ch://user:password@clickhouse.example.com:8123/analytics?compress=1&socket_timeout=300000
jdbc:ch://localhost:8123/default?ssl=true&sslmode=strict
```

## Basic Connection

```java
import java.sql.*;

public class ClickHouseJDBCBasic {

    public static void main(String[] args) throws Exception {
        String url  = "jdbc:ch://localhost:8123/default";
        String user = "default";
        String pass = "";

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement();
             ResultSet rs   = stmt.executeQuery("SELECT version() AS version")) {

            if (rs.next()) {
                System.out.println("ClickHouse version: " + rs.getString("version"));
            }
        }
    }
}
```

## Connection Properties

```java
import java.util.Properties;

Properties props = new Properties();
props.setProperty("user", "default");
props.setProperty("password", "secret");
props.setProperty("compress", "1");
props.setProperty("socket_timeout", "300000");
props.setProperty("max_execution_time", "60");
props.setProperty("max_memory_usage", "10000000000");

Connection conn = DriverManager.getConnection(
    "jdbc:ch://localhost:8123/default", props
);
```

## Execute a SELECT Query

```java
try (Connection conn = DriverManager.getConnection(url, user, pass);
     Statement stmt = conn.createStatement()) {

    ResultSet rs = stmt.executeQuery("""
        SELECT
            user_id,
            count()         AS event_count,
            min(created_at) AS first_seen,
            max(created_at) AS last_seen
        FROM events
        WHERE created_at >= today() - 7
        GROUP BY user_id
        ORDER BY event_count DESC
        LIMIT 20
    """);

    ResultSetMetaData meta = rs.getMetaData();
    int colCount = meta.getColumnCount();

    // Print header
    for (int i = 1; i <= colCount; i++) {
        System.out.printf("%-20s", meta.getColumnName(i));
    }
    System.out.println();

    // Print rows
    while (rs.next()) {
        System.out.printf("%-20s%-20s%-20s%-20s%n",
            rs.getLong("user_id"),
            rs.getLong("event_count"),
            rs.getTimestamp("first_seen"),
            rs.getTimestamp("last_seen")
        );
    }
}
```

## Prepared Statement

```java
String sql = """
    SELECT event_id, event_name, created_at
    FROM events
    WHERE user_id    = ?
      AND event_name = ?
      AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 100
""";

try (Connection conn = DriverManager.getConnection(url, user, pass);
     PreparedStatement pstmt = conn.prepareStatement(sql)) {

    pstmt.setLong(1, 1001L);
    pstmt.setString(2, "purchase");
    pstmt.setTimestamp(3, java.sql.Timestamp.valueOf("2024-01-01 00:00:00"));

    try (ResultSet rs = pstmt.executeQuery()) {
        while (rs.next()) {
            System.out.printf("%s | %s | %s%n",
                rs.getString("event_id"),
                rs.getString("event_name"),
                rs.getTimestamp("created_at")
            );
        }
    }
}
```

## Batch Insert

```java
String insertSql = "INSERT INTO events (user_id, event_name, created_at, amount) VALUES (?, ?, ?, ?)";

try (Connection conn = DriverManager.getConnection(url, user, pass);
     PreparedStatement pstmt = conn.prepareStatement(insertSql)) {

    int batchSize = 0;

    for (int i = 0; i < 50_000; i++) {
        pstmt.setLong(1, i % 1000);
        pstmt.setString(2, i % 2 == 0 ? "click" : "view");
        pstmt.setTimestamp(3, new java.sql.Timestamp(System.currentTimeMillis()));
        pstmt.setBigDecimal(4, java.math.BigDecimal.valueOf(i * 0.99));
        pstmt.addBatch();
        batchSize++;

        if (batchSize >= 5000) {
            pstmt.executeBatch();
            batchSize = 0;
            System.out.println("Flushed batch");
        }
    }

    if (batchSize > 0) {
        pstmt.executeBatch();
    }

    System.out.println("All rows inserted");
}
```

## DDL Statements

```java
try (Connection conn = DriverManager.getConnection(url, user, pass);
     Statement stmt = conn.createStatement()) {

    stmt.execute("""
        CREATE TABLE IF NOT EXISTS events (
            event_id   UUID    DEFAULT generateUUIDv4(),
            user_id    UInt64,
            event_name LowCardinality(String),
            created_at DateTime64(3, 'UTC'),
            amount     Nullable(Decimal(18,4))
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(created_at)
        ORDER BY (user_id, created_at)
    """);

    System.out.println("Table created");
}
```

## Read Metadata with DatabaseMetaData

```java
try (Connection conn = DriverManager.getConnection(url, user, pass)) {
    DatabaseMetaData meta = conn.getMetaData();

    // List all tables in the default database
    try (ResultSet tables = meta.getTables("default", null, "%", new String[]{"TABLE"})) {
        while (tables.next()) {
            System.out.println(tables.getString("TABLE_NAME"));
        }
    }

    // List columns for a specific table
    try (ResultSet cols = meta.getColumns("default", null, "events", null)) {
        while (cols.next()) {
            System.out.printf("%-30s %s%n",
                cols.getString("COLUMN_NAME"),
                cols.getString("TYPE_NAME")
            );
        }
    }
}
```

## Connection Pooling with HikariCP

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

public class ClickHouseDataSource {

    private static final HikariDataSource DATA_SOURCE;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:ch://localhost:8123/analytics");
        config.setUsername("default");
        config.setPassword("secret");

        // Pool sizing
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);

        // Timeouts
        config.setConnectionTimeout(10_000);    // 10 seconds to get a connection
        config.setIdleTimeout(600_000);         // 10 minutes idle before removal
        config.setMaxLifetime(1_800_000);       // 30 minutes max connection age
        config.setKeepaliveTime(60_000);        // ping every 60 seconds

        // ClickHouse-specific
        config.addDataSourceProperty("compress", "1");
        config.addDataSourceProperty("socket_timeout", "300000");

        // Validation
        config.setConnectionTestQuery("SELECT 1");

        DATA_SOURCE = new HikariDataSource(config);
    }

    public static HikariDataSource get() {
        return DATA_SOURCE;
    }
}

// Usage
try (Connection conn = ClickHouseDataSource.get().getConnection();
     Statement stmt = conn.createStatement();
     ResultSet rs = stmt.executeQuery("SELECT count() FROM events")) {
    rs.next();
    System.out.println("Events: " + rs.getLong(1));
}
```

## Spring Boot Configuration

In `application.properties`:

```text
spring.datasource.url=jdbc:ch://localhost:8123/default
spring.datasource.username=default
spring.datasource.password=
spring.datasource.driver-class-name=com.clickhouse.jdbc.ClickHouseDriver
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.connection-test-query=SELECT 1
```

Use with `JdbcTemplate`:

```java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class AnalyticsRepository {

    private final JdbcTemplate jdbc;

    public AnalyticsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> getTopUsers(int limit) {
        return jdbc.queryForList(
            "SELECT user_id, count() AS cnt FROM events GROUP BY user_id ORDER BY cnt DESC LIMIT ?",
            limit
        );
    }

    public long countEvents(long userId) {
        Long count = jdbc.queryForObject(
            "SELECT count() FROM events WHERE user_id = ?",
            Long.class,
            userId
        );
        return count != null ? count : 0L;
    }
}
```

## Error Handling

```java
import java.sql.SQLException;

try (Connection conn = DriverManager.getConnection(url, user, pass)) {
    // ...
} catch (SQLException e) {
    System.err.println("SQL state:  " + e.getSQLState());
    System.err.println("Error code: " + e.getErrorCode());
    System.err.println("Message:    " + e.getMessage());
}
```

## Common Pitfalls

- ClickHouse does not provide ACID transactions. The 0.6.x driver implements a JDBC-compliant transaction shim when `jdbcCompliant=true` (the default), but this does not give you real transactional guarantees on the server. Treat each statement as effectively committed on execution.
- The JDBC driver uses the HTTP interface (port 8123). Do not use port 9000 (native protocol) with JDBC URLs.
- Use the `all` classifier jar to get a self-contained fat jar. Without it, you need to manage transitive dependencies manually.
- The 0.6.x driver streams result sets over HTTP by default, so large queries do not need to be buffered fully in memory. `setFetchSize()` on `Statement` is stored on the statement but is not the primary streaming control — review the driver's `fetch_size` / `result_set_type` properties if you need to tune row delivery.

## Summary

The ClickHouse JDBC driver integrates ClickHouse into any Java application that uses the `java.sql` API. Use `PreparedStatement` for parameterized queries, `addBatch()` and `executeBatch()` for bulk inserts, and HikariCP for connection pooling. The Spring Boot auto-configuration with `JdbcTemplate` makes it straightforward to add ClickHouse as a datasource alongside other relational databases.
