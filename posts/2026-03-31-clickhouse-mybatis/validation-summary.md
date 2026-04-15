# Validation Summary: How to Use ClickHouse with MyBatis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- MyBatis 3.x (SQL mapper framework for Java)
- MyBatis Spring Boot Starter 3.0.3
- ClickHouse JDBC Driver 0.6.0 (`com.clickhouse:clickhouse-jdbc`)
- Spring Boot 3.x
- Java

## Sources Consulted
- MyBatis official documentation: https://mybatis.org/mybatis-3/
- MyBatis Spring Boot Starter documentation: https://mybatis.org/spring-boot-starter/
- ClickHouse JDBC driver documentation: https://clickhouse.com/docs/en/integrations/java/jdbc-driver
- ClickHouse SQL reference (INTERVAL syntax, aggregate functions): https://clickhouse.com/docs/en/sql-reference
- Maven Central for version verification of `mybatis-spring-boot-starter` 3.0.3 and `clickhouse-jdbc` 0.6.0

## Issues Found
No technical issues found.

## Review Notes
- The `INTERVAL #{days} DAY` pattern works because the ClickHouse JDBC driver (0.6.x) performs client-side parameter substitution, converting `INTERVAL ? DAY` to `INTERVAL 7 DAY` before sending to ClickHouse. An alternative approach using `toIntervalDay(#{days})` or `subtractDays(now(), #{days})` would be more portable across JDBC drivers, but the current code is correct.
- The `ExecutorType.BATCH` approach batches statements at the JDBC level. For very high-throughput ClickHouse inserts, combining multiple rows into a single INSERT statement or using ClickHouse's native bulk-loading mechanisms would be more performant, but the code as shown is functionally correct.
- Using `String` for `latestTs` works (the JDBC driver serializes the DateTime to a string), though `java.time.LocalDateTime` would be more type-safe.
- Using `count` as a column alias (`count() AS count`) is valid in ClickHouse since `count` is not a reserved keyword, but it could be confusing in maintenance; a name like `eventCount` would be clearer.
