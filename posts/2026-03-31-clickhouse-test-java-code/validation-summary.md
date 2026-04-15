# Validation Summary: How to Test Java Code That Uses ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (column-oriented database)
- Java
- Testcontainers 1.19.8 (ClickHouse module and JUnit Jupiter integration)
- JUnit 5 (Jupiter)
- Mockito
- Spring JDBC (`JdbcTemplate`, `DataSourceBuilder`)
- Maven

## Sources Consulted
- Testcontainers JUnit 5 integration documentation — https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers ClickHouse module documentation — https://java.testcontainers.org/modules/databases/clickhouse/
- Maven Central: org.testcontainers:clickhouse versions — https://central.sonatype.com/artifact/org.testcontainers/clickhouse/versions
- Maven Central: org.testcontainers:junit-jupiter — https://central.sonatype.com/artifact/org.testcontainers/junit-jupiter
- Testcontainers GitHub: ClickHouseContainer source (deprecated vs current) — https://github.com/testcontainers/testcontainers-java/tree/main/modules/clickhouse/src/main/java/org/testcontainers
- ClickHouse JDBC driver documentation — https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- Javadoc for @Testcontainers annotation — https://javadoc.io/doc/org.testcontainers/junit-jupiter/latest/org/testcontainers/junit/jupiter/Testcontainers.html

## Issues Found

### 1. Missing `junit-jupiter` dependency
- **What was wrong:** The Maven dependencies listed `org.testcontainers:testcontainers` and `org.testcontainers:clickhouse`, but the code uses `@Testcontainers` and `@Container` annotations which live in the `org.testcontainers:junit-jupiter` module. Without this dependency, the annotations would not resolve and the code would not compile.
- **What was changed:** Replaced the `org.testcontainers:testcontainers` dependency with `org.testcontainers:junit-jupiter` (version 1.19.8). The `testcontainers` core is pulled in transitively by the `clickhouse` module, so it does not need to be listed explicitly.
- **Why:** The `@Testcontainers` and `@Container` annotations are packaged in a separate module (`junit-jupiter`) as documented in the official Testcontainers JUnit 5 integration guide. This is a common mistake in tutorials.

### 2. Deprecated `ClickHouseContainer` import
- **What was wrong:** The import used `org.testcontainers.containers.ClickHouseContainer`, which is the deprecated class.
- **What was changed:** Updated the import to `org.testcontainers.clickhouse.ClickHouseContainer`, which is the current, non-deprecated class.
- **Why:** The `org.testcontainers.containers.ClickHouseContainer` class is deprecated in favor of `org.testcontainers.clickhouse.ClickHouseContainer`. Tutorials should use current APIs to avoid teaching deprecated patterns.

## Review Notes
- The code examples omit some imports (e.g., `javax.sql.DataSource`, `java.util.List`, `org.springframework.boot.jdbc.DataSourceBuilder`, `org.testcontainers.junit.jupiter.Testcontainers`, `org.testcontainers.junit.jupiter.Container`). This is common in blog posts for brevity, but readers may need to infer the missing imports. The key imports are shown.
- The `countsByEvent()` test and the `insert()` helper method are shown without full class context, which is fine for a tutorial demonstrating patterns rather than a complete runnable project.
- The post uses `clickhouse/clickhouse-server:latest` as the Docker image tag. In production CI, pinning to a specific version tag would be more reliable to avoid flaky tests from upstream image changes.
- The JDBC driver class `com.clickhouse.jdbc.ClickHouseDriver` is the current non-deprecated driver (the old `ru.yandex.clickhouse.ClickHouseDriver` is deprecated).
- The `TRUNCATE TABLE` advice for test isolation is correct for ClickHouse.
