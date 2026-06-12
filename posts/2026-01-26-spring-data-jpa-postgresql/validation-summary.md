# Validation Summary: How to Use Spring Data JPA with PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Data JPA
- Hibernate ORM
- Jakarta Persistence
- PostgreSQL
- Flyway
- HikariCP
- Spring Security password encoding
- Lombok

## Sources Consulted
- Spring Data JPA query methods and `@Modifying` documentation: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- Spring Data JPA specifications documentation: https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html
- Spring Data JPA `EntityGraph` API documentation: https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/EntityGraph.html
- Spring Data JPA `Specification` API documentation: https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/domain/Specification.html
- Spring Boot SQL databases documentation: https://docs.spring.io/spring-boot/reference/data/sql.html
- Hibernate ORM logging categories: https://docs.hibernate.org/orm/6.1/logging/logging.html
- Hibernate ORM HQL enum literal documentation: https://docs.hibernate.org/orm/6.3/querylanguage/html_single/
- Hibernate ORM `AvailableSettings` documentation: https://docs.hibernate.org/orm/6.0/javadocs/org/hibernate/cfg/AvailableSettings.html
- Spring Security password storage documentation: https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html
- Spring Security dependency documentation: https://docs.spring.io/spring-security/reference/getting-spring-security.html
- PostgreSQL JSON functions and operators documentation: https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL full-text search documentation: https://www.postgresql.org/docs/current/textsearch-controls.html
- Flyway PostgreSQL database support documentation: https://documentation.red-gate.com/fd/postgresql-database-277579325.html
- HikariCP configuration documentation: https://github.com/brettwooldridge/HikariCP

## Issues Found
- The Hibernate bind-parameter logging category used the pre-Hibernate 6 `org.hibernate.type.descriptor.sql.BasicBinder` logger. Updated it to `org.hibernate.orm.jdbc.bind`, which matches Hibernate 6 logging.
- The configuration comment claimed batch inserts generally improve performance while the examples use `GenerationType.IDENTITY`, where insert batching may not apply. Reworded the comment to "Batch DML where supported by the identifier strategy and driver."
- The JSONB entity examples used only `@Column(columnDefinition = "jsonb")` with `String`. Added Hibernate 6 `@JdbcTypeCode(SqlTypes.JSON)` and changed the Java type to `Map<String, Object>` so the Java mapping matches JSON object usage.
- The `Order` entity example referenced `OrderStatus` values but did not define the enum. Added an `OrderStatus` enum with `PENDING`, `COMPLETED`, and `CANCELLED`.
- The `OrderRepository` example returned `Optional<Order>` but did not import `java.util.Optional`. Added the missing import.
- JPQL examples used the entity name `Order`, which conflicts with the `ORDER` query keyword. Added an explicit entity name `CustomerOrder` and updated JPQL strings to use it.
- JPQL examples compared enum fields to string literals such as `'COMPLETED'` and `'CANCELLED'`. Updated them to enum literals.
- The service injected `PasswordEncoder` and the auditing snippet used Spring Security context classes without adding the required Spring Security dependencies. Added the dependency snippets and a minimal `PasswordConfig` with `BCryptPasswordEncoder`.
- The JSONB containment query used PostgreSQL's `?` operator directly in a JPA native query, which can be confused with JDBC/JPA parameter markers. Replaced it with `jsonb_exists(...)`.
- The full-text search query referenced a `bio` column that was not present in the entity or migration. Updated the query to search the existing `name` column.
- The Hibernate query-performance configuration included `query.plan_parameter_metadata_max_size`, which is deprecated and unused in Hibernate 6. Removed it.

## Review Notes
- The post is technically valid after the fixes. Some snippets still assume DTOs, request classes, and custom exceptions exist elsewhere in the application, which is normal for a focused tutorial but would need definitions in a complete sample project.
- HikariCP's `connection-test-query` is valid, but HikariCP recommends relying on JDBC4 `Connection.isValid()` for modern drivers such as PostgreSQL unless a legacy driver requires a test query.
