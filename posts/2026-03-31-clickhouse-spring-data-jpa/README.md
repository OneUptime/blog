# How to Use ClickHouse with Spring Data JPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Spring Boot, JPA, Java, Analytics

Description: Integrate ClickHouse into a Spring Boot project using Spring Data JPA with the JDBC driver for analytics queries and bulk inserts.

---

## Overview

Spring Data JPA was designed for OLTP databases, but ClickHouse's JDBC driver is compatible enough for common repository patterns. For write-heavy analytics workloads, native batch inserts work better than JPA's entity lifecycle.

## Maven Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.clickhouse</groupId>
    <artifactId>clickhouse-jdbc</artifactId>
    <version>0.6.0</version>
    <classifier>all</classifier>
</dependency>
```

## application.properties

```text
spring.datasource.url=jdbc:ch://localhost:8123/analytics
spring.datasource.username=default
spring.datasource.password=
spring.datasource.driver-class-name=com.clickhouse.jdbc.ClickHouseDriver
spring.jpa.hibernate.ddl-auto=none
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
```

Set `ddl-auto=none` because ClickHouse does not support all DDL operations that Hibernate expects.

## Defining an Entity

```java
import jakarta.persistence.*;

@Entity
@Table(name = "page_views")
public class PageView {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "path")
    private String path;

    @Column(name = "user_id")
    private Long userId;

    // getters and setters
}
```

## Creating a Repository

```java
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PageViewRepository extends JpaRepository<PageView, Long> {

    @Query(value = "SELECT path, count() AS cnt FROM page_views GROUP BY path ORDER BY cnt DESC LIMIT 10",
           nativeQuery = true)
    List<Object[]> topPaths();
}
```

Use `nativeQuery = true` to pass ClickHouse SQL directly.

## Bulk Insert via JdbcTemplate

JPA's `save` issues one INSERT per entity. For analytics volumes, use `JdbcTemplate.batchUpdate`.

```java
@Service
public class PageViewService {

    private final JdbcTemplate jdbc;

    public PageViewService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void bulkInsert(List<PageView> views) {
        jdbc.batchUpdate(
            "INSERT INTO page_views (id, path, user_id) VALUES (?, ?, ?)",
            views,
            500,
            (ps, view) -> {
                ps.setLong(1, view.getId());
                ps.setString(2, view.getPath());
                ps.setLong(3, view.getUserId());
            }
        );
    }
}
```

## Querying with JPQL Limitations

Avoid JPQL functions that have no equivalent in ClickHouse's dialect. Prefer `@Query(nativeQuery = true)` with ClickHouse SQL for window functions, `toStartOfHour`, or `arrayJoin`.

## Summary

Spring Data JPA can work with ClickHouse for basic query patterns when you use native queries and disable Hibernate DDL management. For high-throughput inserts, bypass JPA and use `JdbcTemplate.batchUpdate` to keep latency low.
