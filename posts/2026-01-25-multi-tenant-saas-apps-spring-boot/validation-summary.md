# Validation Summary: How to Build Multi-Tenant SaaS Apps in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Web servlet filters
- Spring AOP
- Spring Cache
- Spring JDBC datasource routing
- JPA
- Hibernate ORM filters
- HikariCP
- PostgreSQL JDBC URLs

## Sources Consulted
- Hibernate ORM User Guide, `@Filter`, `@FilterDef`, `@ParamDef`, session filter enablement, and load-by-key behavior: https://docs.hibernate.org/stable/orm/userguide/html_single/
- Hibernate ORM `ParamDef` annotation source, confirming `type` accepts a `Class<?>`: https://github.com/hibernate/hibernate-orm/blob/main/hibernate-core/src/main/java/org/hibernate/annotations/ParamDef.java
- Spring Framework `OncePerRequestFilter` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/filter/OncePerRequestFilter.html
- Spring Framework `AbstractRoutingDataSource` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/datasource/lookup/AbstractRoutingDataSource.html
- Spring Framework cache annotations reference: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html
- Spring Framework `SimpleKeyGenerator` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/cache/interceptor/SimpleKeyGenerator.html
- Oracle Java `ThreadLocal` Javadoc: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/lang/ThreadLocal.html
- HikariCP `HikariConfig` Javadoc: https://www.javadoc.io/doc/com.zaxxer/HikariCP/latest/com/zaxxer/hikari/HikariConfig.html

## Issues Found
- The tenant resolution section showed `X-Tenant-ID` as a direct source of tenant identity without warning that an arbitrary client-supplied header must be authenticated or authorized. Added a production caveat to validate the tenant identifier against the authenticated user or a signed token.
- The Hibernate filter snippet claimed all queries would be tenant-filtered, but current Hibernate only applies filters to direct loads by key when `@FilterDef(applyToLoadByKey = true)` is configured. Added `applyToLoadByKey = true` and adjusted the explanation to distinguish enabled session filters, entity queries, and direct loads by ID.
- The `AbstractRoutingDataSource` example configured `tenant-a` as the default datasource. Spring's routing datasource can fall back to the default datasource for unmatched lookup keys by default, which is unsafe for tenant isolation. Removed the default tenant datasource and set `setLenientFallback(false)` so unknown tenant keys fail instead of routing to another tenant.

## Review Notes
The examples are intentionally abbreviated and omit imports, package declarations, dependency setup, transaction boundaries, and full entity/service definitions. For a production implementation, the filter-enabling approach should be paired with consistent transaction/session boundaries and tests that cover repository `findById`/direct `EntityManager.find` paths as well as ordinary entity queries.
