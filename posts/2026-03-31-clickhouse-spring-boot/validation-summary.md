# Validation Summary: How to Use ClickHouse with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- Spring Boot (Java web framework)
- Spring JDBC / JdbcTemplate
- HikariCP (connection pool)
- ClickHouse JDBC Driver (`com.clickhouse:clickhouse-jdbc:0.6.3`)
- ClickHouse native Java client (`com.clickhouse:clickhouse-client:0.6.3`)
- Spring Boot Actuator (health checks)
- Lombok
- Maven

## Sources Consulted
- ClickHouse JDBC Driver documentation: https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- Maven Central for `com.clickhouse:clickhouse-jdbc:0.6.3`: https://mvnrepository.com/artifact/com.clickhouse/clickhouse-jdbc/0.6.3
- Maven Central for `com.clickhouse:clickhouse-client:0.6.3`: https://mvnrepository.com/artifact/com.clickhouse/clickhouse-client/0.6.3
- ClickHouse Java client GitHub repository: https://github.com/ClickHouse/clickhouse-java
- ClickHouse UUID functions: https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse date/time functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (uniq): https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- Spring Boot Actuator documentation: https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html
- Spring Framework JdbcTemplate documentation: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html
- HikariCP configuration: https://github.com/brettwooldridge/HikariCP

## Issues Found

### 1. Missing `spring-boot-starter-actuator` dependency (compilation error)
- **What was wrong:** The Health Check section implements `HealthIndicator` from `org.springframework.boot.actuate.health`, which requires the `spring-boot-starter-actuator` dependency. This dependency was not included in the Maven dependencies section. Without it, the `ClickHouseHealthIndicator` class would fail to compile, and the `/actuator/health` endpoint referenced in the "Running the Application" section would not exist.
- **What was changed:** Added the `spring-boot-starter-actuator` dependency to the Maven `<dependencies>` block.
- **Why:** The actuator starter is required for Spring Boot health indicator support and for exposing the `/actuator/health` endpoint.

## Review Notes
- The `spring.datasource.hikari.*` properties in `application.properties` are declared but not used by the custom `ClickHouseConfig` class, which hardcodes pool settings directly on `HikariConfig`. Similarly, `clickhouse.driver-class-name` is declared but never referenced via `@Value`. These unused properties are not harmful but may confuse readers into thinking the pool settings come from the properties file. A future improvement could either use the properties consistently or remove the unused ones.
- The `INTERVAL ? DAY` parameterized syntax in `summarizeByEventType` works because the ClickHouse JDBC driver performs client-side parameter substitution over the HTTP protocol. However, using `toIntervalDay(?)` or `subtractDays(now(), ?)` would be more portable and explicit alternatives.
- `JdbcTemplate.batchUpdate()` is functionally correct for batch inserts but sends individual parameterized statements. For very high throughput, ClickHouse's native bulk insert (single INSERT with multiple value tuples or the native client's streaming API) would be more efficient. This is a performance consideration, not a correctness issue.
- `ResultSet` and `SQLException` are imported in `EventRepository` but not explicitly referenced (the RowMapper lambda infers parameter types). These are unused imports — a minor style issue.
- The `clickhouse-client` dependency is listed as optional but is never used in any code example. It could be removed without affecting the tutorial, or an example using the native client could be added in a future update.
