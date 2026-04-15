# How to Test Java Code That Uses ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Java, Testing, Testcontainers, JUnit

Description: Write unit and integration tests for Java code that depends on ClickHouse using Testcontainers and mock DataSources with JUnit 5.

---

## Testing Strategy

Separate tests into two layers:
1. Unit tests - mock the `DataSource` or repository interface, run in milliseconds.
2. Integration tests - use Testcontainers to spin up a real ClickHouse instance in Docker.

## Testcontainers Dependency

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>clickhouse</artifactId>
    <version>1.19.8</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.8</version>
    <scope>test</scope>
</dependency>
```

## Integration Test with Testcontainers

```java
import org.junit.jupiter.api.*;
import org.testcontainers.clickhouse.ClickHouseContainer;
import java.sql.*;

@Testcontainers
class EventRepositoryIntegrationTest {

    @Container
    static ClickHouseContainer ch = new ClickHouseContainer("clickhouse/clickhouse-server:latest");

    static DataSource dataSource;

    @BeforeAll
    static void setUp() throws Exception {
        dataSource = DataSourceBuilder.create()
            .url(ch.getJdbcUrl())
            .username(ch.getUsername())
            .password(ch.getPassword())
            .driverClassName("com.clickhouse.jdbc.ClickHouseDriver")
            .build();

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute(
                "CREATE TABLE events (user_id UInt64, event String) " +
                "ENGINE = MergeTree() ORDER BY user_id"
            );
        }
    }

    @Test
    void insertsAndQueriesData() throws Exception {
        EventRepository repo = new EventRepository(new JdbcTemplate(dataSource));
        repo.insert(new Event(1L, "login"));

        List<EventSummary> results = repo.topEvents(1, 10);
        Assertions.assertEquals(1, results.size());
        Assertions.assertEquals("login", results.get(0).getEventName());
    }
}
```

## Unit Test with Mocked JdbcTemplate

```java
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;

class EventRepositoryUnitTest {

    @Test
    void returnsEmptyListOnNoData() {
        JdbcTemplate mockJdbc = Mockito.mock(JdbcTemplate.class);
        Mockito.when(mockJdbc.query(
            Mockito.anyString(),
            Mockito.any(RowMapper.class),
            Mockito.anyInt(), Mockito.anyInt()
        )).thenReturn(List.of());

        EventRepository repo = new EventRepository(mockJdbc);
        List<EventSummary> result = repo.topEvents(7, 10);
        Assertions.assertTrue(result.isEmpty());
    }
}
```

## Resetting State Between Tests

ClickHouse's `TRUNCATE TABLE` removes all data without dropping the table.

```java
@BeforeEach
void clearTable() throws Exception {
    try (Connection conn = dataSource.getConnection();
         Statement stmt = conn.createStatement()) {
        stmt.execute("TRUNCATE TABLE events");
    }
}
```

## Testing Aggregation Logic

```java
@Test
void countsByEvent() throws Exception {
    insert(1L, "click");
    insert(2L, "click");
    insert(3L, "view");

    List<EventSummary> results = repo.topEvents(7, 10);
    Map<String, Long> counts = results.stream()
        .collect(Collectors.toMap(EventSummary::getEventName, EventSummary::getCount));

    Assertions.assertEquals(2L, counts.get("click"));
    Assertions.assertEquals(1L, counts.get("view"));
}
```

## Summary

Test Java-ClickHouse integrations with two-tier testing: mock repositories for fast unit tests and Testcontainers for integration tests against a real ClickHouse instance. Use `TRUNCATE TABLE` in `@BeforeEach` to keep tests isolated.
