# How to Use ClickHouse with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Spring Boot, Java, Database, Analytics, JDBC

Description: Integrate ClickHouse into a Spring Boot application using JDBC, JdbcTemplate, and the ClickHouse Java client for batch inserts and analytical query endpoints.

---

Spring Boot applications frequently need analytical capabilities alongside their transactional databases. ClickHouse provides a JDBC driver and a native Java client, both of which integrate cleanly into Spring Boot's dependency injection and data access patterns. This guide shows how to connect Spring Boot to ClickHouse, run queries through JdbcTemplate, and build analytics REST endpoints.

## Maven Dependencies

```xml
<dependencies>
    <!-- Spring Boot Web and JDBC -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>

    <!-- ClickHouse JDBC Driver -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-jdbc</artifactId>
        <version>0.6.3</version>
        <classifier>all</classifier>
    </dependency>

    <!-- Optional: ClickHouse native Java client -->
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-client</artifactId>
        <version>0.6.3</version>
    </dependency>

    <!-- Spring Boot Actuator (required for health check) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Lombok for boilerplate reduction -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

## Application Properties

```text
# application.properties

# ClickHouse DataSource
clickhouse.url=jdbc:ch://localhost:8123/analytics
clickhouse.username=default
clickhouse.password=
clickhouse.driver-class-name=com.clickhouse.jdbc.ClickHouseDriver

# Connection pool
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=10000
spring.datasource.hikari.idle-timeout=300000
```

## ClickHouse DataSource Configuration

```java
// src/main/java/com/example/config/ClickHouseConfig.java
package com.example.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class ClickHouseConfig {

    @Value("${clickhouse.url}")
    private String url;

    @Value("${clickhouse.username}")
    private String username;

    @Value("${clickhouse.password}")
    private String password;

    @Bean(name = "clickHouseDataSource")
    public DataSource clickHouseDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(10_000);
        config.setIdleTimeout(300_000);
        config.addDataSourceProperty("socket_timeout", "30000");
        return new HikariDataSource(config);
    }

    @Bean(name = "clickHouseJdbcTemplate")
    public JdbcTemplate clickHouseJdbcTemplate() {
        return new JdbcTemplate(clickHouseDataSource());
    }
}
```

## ClickHouse Schema

```sql
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.events
(
    event_id    UUID        DEFAULT generateUUIDv4(),
    user_id     UInt64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    properties  String      DEFAULT '{}',
    ts          DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts);
```

## Domain Model

```java
// src/main/java/com/example/model/Event.java
package com.example.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    private String  eventId;
    private long    userId;
    private String  sessionId;
    private String  eventType;
    private String  page;
    private String  properties;
    private Instant ts;
}
```

## Repository

```java
// src/main/java/com/example/repository/EventRepository.java
package com.example.repository;

import com.example.model.Event;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Repository
public class EventRepository {

    private final JdbcTemplate jdbc;

    public EventRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Event> eventRowMapper = (rs, rowNum) -> Event.builder()
            .eventId(rs.getString("event_id"))
            .userId(rs.getLong("user_id"))
            .sessionId(rs.getString("session_id"))
            .eventType(rs.getString("event_type"))
            .page(rs.getString("page"))
            .ts(rs.getTimestamp("ts").toInstant())
            .build();

    public void insert(Event event) {
        jdbc.update(
            """
            INSERT INTO analytics.events
                (user_id, session_id, event_type, page, properties, ts)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            event.getUserId(),
            event.getSessionId(),
            event.getEventType(),
            event.getPage(),
            event.getProperties() != null ? event.getProperties() : "{}",
            Timestamp.from(event.getTs() != null ? event.getTs() : Instant.now())
        );
    }

    public void insertBatch(List<Event> events) {
        List<Object[]> batchArgs = events.stream()
            .map(e -> new Object[]{
                e.getUserId(),
                e.getSessionId(),
                e.getEventType(),
                e.getPage(),
                e.getProperties() != null ? e.getProperties() : "{}",
                Timestamp.from(e.getTs() != null ? e.getTs() : Instant.now()),
            })
            .toList();

        jdbc.batchUpdate(
            """
            INSERT INTO analytics.events
                (user_id, session_id, event_type, page, properties, ts)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            batchArgs
        );
    }

    public List<Event> findRecent(String eventType, int limit) {
        return jdbc.query(
            """
            SELECT event_id, user_id, session_id, event_type, page, ts
            FROM analytics.events
            WHERE event_type = ?
            ORDER BY ts DESC
            LIMIT ?
            """,
            eventRowMapper,
            eventType, limit
        );
    }

    public List<EventSummary> summarizeByEventType(int days) {
        return jdbc.query(
            """
            SELECT
                event_type,
                count()       AS total,
                uniq(user_id) AS unique_users
            FROM analytics.events
            WHERE ts >= now() - INTERVAL ? DAY
            GROUP BY event_type
            ORDER BY total DESC
            """,
            (rs, rowNum) -> new EventSummary(
                rs.getString("event_type"),
                rs.getLong("total"),
                rs.getLong("unique_users")
            ),
            days
        );
    }

    public record EventSummary(String eventType, long total, long uniqueUsers) {}
}
```

## Service Layer

```java
// src/main/java/com/example/service/AnalyticsService.java
package com.example.service;

import com.example.model.Event;
import com.example.repository.EventRepository;
import com.example.repository.EventRepository.EventSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final EventRepository repo;

    public void track(Event event) {
        repo.insert(event);
    }

    public void trackBatch(List<Event> events) {
        repo.insertBatch(events);
    }

    public List<Event> getRecentEvents(String eventType, int limit) {
        return repo.findRecent(eventType, Math.min(limit, 1000));
    }

    public List<EventSummary> getSummary(int days) {
        return repo.summarizeByEventType(days);
    }
}
```

## REST Controller

```java
// src/main/java/com/example/controller/AnalyticsController.java
package com.example.controller;

import com.example.model.Event;
import com.example.repository.EventRepository.EventSummary;
import com.example.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analytics;

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> ingest(@RequestBody Event event) {
        analytics.track(event);
        return Map.of("status", "accepted");
    }

    @PostMapping("/events/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> ingestBatch(@RequestBody List<Event> events) {
        analytics.trackBatch(events);
        return Map.of("status", "accepted", "count", events.size());
    }

    @GetMapping("/events")
    public List<Event> getEvents(
        @RequestParam(defaultValue = "page_view") String eventType,
        @RequestParam(defaultValue = "100") int limit
    ) {
        return analytics.getRecentEvents(eventType, limit);
    }

    @GetMapping("/analytics/summary")
    public List<EventSummary> summary(
        @RequestParam(defaultValue = "7") int days
    ) {
        return analytics.getSummary(days);
    }
}
```

## Health Check

```java
// src/main/java/com/example/health/ClickHouseHealthIndicator.java
package com.example.health;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ClickHouseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbc;

    public ClickHouseHealthIndicator(
        @Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    @Override
    public Health health() {
        try {
            String version = jdbc.queryForObject("SELECT version()", String.class);
            return Health.up().withDetail("version", version).build();
        } catch (Exception e) {
            return Health.down().withException(e).build();
        }
    }
}
```

## Running the Application

```bash
./mvnw spring-boot:run
```

Test the health endpoint:

```bash
curl http://localhost:8080/actuator/health
```

## Summary

Spring Boot integrates with ClickHouse through the JDBC driver and HikariCP connection pool. Use a dedicated `@Configuration` class to create a named `DataSource` and `JdbcTemplate` beans. Inject the `JdbcTemplate` by qualifier in your repositories, use parameterized queries for all user input, and `batchUpdate` for bulk inserts. This keeps ClickHouse cleanly isolated from your primary database while using familiar Spring patterns throughout.
