# Validation Summary: How to Use MySQL with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Spring Boot 3.x
- Spring Data JPA
- Hibernate 6.x (Jakarta Persistence)
- HikariCP (connection pooling)
- Flyway (database migrations)
- Maven / Gradle

## Sources Consulted
- Spring Boot Reference Documentation — Data Access / JPA: https://docs.spring.io/spring-boot/reference/data/sql.html
- Spring Data JPA Reference: https://docs.spring.io/spring-data/jpa/reference/
- MySQL Connector/J 8.0 Developer Guide: https://dev.mysql.com/doc/connector-j/en/
- Hibernate ORM 6.x User Guide — Dialect: https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html
- MySQL 8.0 Reference Manual — Full-Text Search: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- HikariCP GitHub / Configuration: https://github.com/brettwooldridge/HikariCP
- Flyway Documentation: https://documentation.red-gate.com/flyway

## Issues Found
1. **Missing FULLTEXT index in Flyway migration**: The `ProductRepository.fullTextSearch()` method uses a native query with `MATCH(name, description) AGAINST (:term IN BOOLEAN MODE)`, which requires a MySQL FULLTEXT index on the `name` and `description` columns. The Flyway migration (`V1__Create_products_table.sql`) only defined a regular B-tree index on `name`. Without the FULLTEXT index, the native query would fail at runtime with a MySQL error. **Fix**: Added `FULLTEXT INDEX ft_name_description (name, description)` to the `CREATE TABLE` statement in the migration.

## Review Notes
- The JDBC URL uses `useSSL=false`, which was deprecated in MySQL Connector/J 8.0.13 in favor of `sslMode=DISABLED`. It still functions correctly but generates a deprecation warning. A future update could replace it with `sslMode=DISABLED`.
- The `spring.datasource.driver-class-name` property is explicitly set but is not strictly necessary — Spring Boot auto-detects `com.mysql.cj.jdbc.Driver` from the JDBC URL. Including it explicitly is not wrong.
- In `OrderService.placeOrder()`, the explicit `productRepository.save(product)` call is unnecessary within a `@Transactional` method since Hibernate's dirty checking would auto-flush the managed entity. However, it is not incorrect and is a common pattern in tutorials for clarity.
- The `flyway-mysql` artifact is correct for Flyway 9.x+ (required for MySQL-specific support when using Spring Boot 3.x).
- All Jakarta Persistence annotations (`jakarta.persistence.*`) are correct for Spring Boot 3.x, which uses Jakarta EE 9+.
- `org.hibernate.dialect.MySQLDialect` is the correct dialect class for Hibernate 6.x (Spring Boot 3.x). The old version-specific dialects like `MySQL8Dialect` were removed in Hibernate 6.
