# Validation Summary: How to Build a REST API with MySQL and Java Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java (9+)
- Spring Boot 3.x
- Spring Data JPA
- Hibernate 6.x
- MySQL (via MySQL Connector/J)
- HikariCP connection pool
- Jakarta Persistence API

## Sources Consulted
- Spring Boot Reference Documentation — Data Access / JPA: https://docs.spring.io/spring-boot/reference/data/sql.html
- Spring Data JPA Reference — Query Methods and @Query: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- HikariCP GitHub — Configuration properties: https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby
- MySQL Connector/J Documentation — Configuration Properties: https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html
- Jakarta Persistence API (JPA 3.x) specification — Entity mapping annotations
- Java 9+ `Set.of()` Javadoc — immutable collection behavior with null values

## Issues Found
1. **NullPointerException in status validation (Controller)**: `VALID_STATUSES.contains(newStatus)` throws `NullPointerException` when `newStatus` is null because `Set.of()` creates a collection that does not permit null in `contains()`. If a request body omits the `"status"` key, `body.get("status")` returns null, causing a 500 error instead of the intended 400. Fixed by adding a `newStatus == null` check before the `contains()` call.

## Review Notes
- The JDBC URL uses `useSSL=true&requireSSL=false`, which are deprecated since MySQL Connector/J 8.0.13 (2018) in favor of `sslMode=PREFERRED`. The deprecated properties still function correctly and the effective behavior is the same as the default `sslMode`, so this is not a breaking issue but could be modernized in a future update.
- The `@Query` annotation on `findByStatus` uses `:status` as a named parameter without a `@Param("status")` annotation. This works because Spring Boot's `spring-boot-starter-parent` enables the `-parameters` compiler flag by default, making method parameter names available at runtime. Projects not using the starter parent would need to add `@Param`.
- The entity uses `Order` as its name, which overlaps with the JPQL reserved keyword `ORDER`. Hibernate handles this correctly in practice, but using `@Entity(name = "OrderEntity")` or backtick-escaping in queries would be more robust.
- The `listOrders()` endpoint returns all orders without pagination, which could be a scalability concern for production use. Spring Data's `PagingAndSortingRepository` or `Pageable` parameter could address this.
