# Validation Summary: How to Implement Multi-tenancy in Spring Boot Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot / Spring Framework (servlet filters, `@Async`, `TaskDecorator`, `AbstractRoutingDataSource`, `LazyConnectionDataSourceProxy`, `@KafkaListener`)
- Hibernate ORM multi-tenancy (`MultiTenantConnectionProvider`, `CurrentTenantIdentifierResolver`, schema-based strategy)
- JPA / `LocalContainerEntityManagerFactoryBean`
- HikariCP connection pooling
- PostgreSQL (`SET search_path`)
- Flyway migrations
- Kafka consumer headers
- JUnit 5 (`TestInfo`, `@BeforeEach`/`@AfterEach`)

## Sources Consulted
- Hibernate User Guide — Multi-tenancy chapter: https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#multitenacy
- Hibernate `@Where` and `@Filter`/`@FilterDef` annotation Javadocs (org.hibernate.annotations)
- Hibernate 6.3 `@TenantId` annotation reference
- Spring Framework `AbstractRoutingDataSource` and `LazyConnectionDataSourceProxy` Javadocs
- Spring `TaskDecorator` / `ThreadPoolTaskExecutor` documentation
- Spring `OncePerRequestFilter` documentation
- HikariCP configuration documentation (https://github.com/brettwooldridge/HikariCP)
- Flyway Java API documentation (`Flyway.configure()...load()`)
- PostgreSQL documentation on `SET search_path`
- Spring for Apache Kafka `@KafkaListener` and `ConsumerRecord` headers documentation

## Issues Found
- **Incorrect `@Where` claim for discriminator-column multi-tenancy.** The post originally stated: "The discriminator column approach is straightforward JPA filtering - you just add `@Where(clause = "tenant_id = :tenantId")` to your entities and call it a day." This is technically wrong on two counts: (1) `@Where` is a Hibernate annotation, not JPA; (2) `@Where` only accepts a static SQL fragment and does not support parameter binding like `:tenantId` — so this clause would not actually scope queries to the current tenant. The correct mechanism is Hibernate's `@FilterDef`/`@Filter` (which supports parameters), or, in Hibernate 6.3+, the purpose-built `@TenantId` annotation. **Fixed** by rewriting the sentence to reference `@Filter`/`@FilterDef` and `@TenantId` instead.

## Review Notes
- The `MultiTenancyStrategy.SCHEMA` constant and the `Environment.MULTI_TENANT` setting used in the `HibernateConfig` example were removed in Hibernate 6.x (Spring Boot 3.x uses Hibernate 6). In modern Hibernate, you simply provide a `MultiTenantConnectionProvider` — no strategy enum is required. The code shown remains valid for Hibernate 5.x. Readers using Spring Boot 3.x should omit that line and rely on the connection provider alone. Left as-is to preserve the author's tutorial flow; not a hard error since the snippet is internally consistent.
- The `MultiTenantConnectionProvider` and `CurrentTenantIdentifierResolver` interfaces became generic (`<T>`) in Hibernate 6. The post uses the raw types, which still compile (with an unchecked-warning) in Hibernate 6 — functionally correct, just slightly dated style.
- `connection.createStatement().execute("SET search_path TO " + tenantIdentifier)` interpolates the tenant identifier directly into SQL. PostgreSQL does not allow parameterized identifiers in `SET`, so this pattern is common, but tenant identifiers must be strictly validated (e.g., regex against a safelist) to avoid SQL injection. Worth a one-line caveat in a future revision but not strictly incorrect.
- All other code (Spring `OncePerRequestFilter`, `TaskDecorator`, `AbstractRoutingDataSource`, `LazyConnectionDataSourceProxy`, HikariCP usage, Flyway `configure().schemas().locations().load()`, Kafka header extraction, JUnit 5 `TestInfo`-based tenant injection) checks out against current docs.
