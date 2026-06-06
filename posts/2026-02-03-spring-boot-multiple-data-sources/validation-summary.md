# Validation Summary: How to Configure Multiple Data Sources in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot 3.x (uses `jakarta.persistence` namespace)
- Spring Data JPA
- Hibernate 6 (implied by Jakarta namespace)
- HikariCP connection pool
- PostgreSQL (primary database example)
- MySQL (secondary database example)
- H2 (test embedded database)
- JUnit 5 / AssertJ (test framework)
- Jackson (`ObjectMapper`)
- SLF4J (logging)

## Sources Consulted
- Spring Boot 3.x API documentation — `EntityManagerFactoryBuilder` (`org.springframework.boot.orm.jpa`): https://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/orm/jpa/EntityManagerFactoryBuilder.html
- Spring Boot `DataSourceProperties` API: https://docs.spring.io/spring-boot/3.4/api/java/org/springframework/boot/autoconfigure/jdbc/DataSourceProperties.html
- Hibernate 6 dialect documentation — confirmed `MySQL8Dialect` is deprecated; `MySQLDialect` is the replacement (auto-detects version).
- Spring Data JPA reference for `@EnableJpaRepositories`, derived query methods, `@Modifying`, and `@Query` semantics.
- Spring Framework `@Transactional` proxy/qualifier semantics (transaction manager qualifier resolution).
- Jakarta Persistence 3.x specification (`jakarta.persistence.*` annotations: `@Entity`, `@Table`, `@Index`, `@Column`, `@Lob`, `@PrePersist`, `@PreUpdate`, `@GeneratedValue`).

## Issues Found
- **`MySQL8Dialect` is deprecated in Hibernate 6** (which Spring Boot 3.x uses). Updated `SecondaryDataSourceConfig.jpaProperties()` to use `org.hibernate.dialect.MySQLDialect`, which is the non-deprecated replacement and auto-detects the MySQL server version. Updated the accompanying comment to reflect this.

All other technical content was verified accurate:
- Import paths (`org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder`, `org.springframework.boot.autoconfigure.jdbc.DataSourceProperties`, `jakarta.persistence.*`) are correct for Spring Boot 3.x.
- `@EnableJpaRepositories` with `basePackages`, `entityManagerFactoryRef`, `transactionManagerRef` is the correct way to scope repositories per data source.
- `@Primary` placement on one data source (and its `DataSourceProperties`, `EntityManagerFactory`, `TransactionManager`) is correct.
- `@ConfigurationProperties("spring.datasource.primary.hikari")` combined with `initializeDataSourceBuilder().build()` correctly binds HikariCP-specific properties to the `HikariDataSource`.
- `@Transactional("secondaryTransactionManager")` qualifier syntax is correct.
- Derived query method names (`findByEmail`, `findByStatus`, `existsByEmail`, `findByEntityTypeAndEntityIdOrderByTimestampDesc`, `deleteByTimestampBefore`) match Spring Data JPA's query derivation rules.
- JPQL syntax in `@Query` annotations is valid.
- PostgreSQL-specific `INTERVAL '7 days'` syntax in the native query is appropriate for the PostgreSQL primary DB.
- `HikariPoolMXBean.getActiveConnections()` is a valid API on `HikariDataSource`.
- `ThreadPoolTaskExecutor` configuration (core/max/queue/rejection policy) is correct.
- `EmbeddedDatabaseBuilder` test configuration is syntactically correct.

## Review Notes
- **Self-invocation caveat with `@Transactional`**: The `UserService.createUser()` method calls `this.logAuditEvent()` internally. Because Spring's transaction management is proxy-based, this self-invocation bypasses the proxy, so the `@Transactional("secondaryTransactionManager")` on `logAuditEvent` will **not** open a new transaction — the call runs in the caller's primary-DB transactional context. The same caveat applies to the protected methods in `UserServiceWithCompensation`. This is a well-known Spring nuance worth flagging in a future revision (e.g., extract audit logging into a separate Spring bean — which the post later does correctly with `AsyncAuditService`).
- **Bean-definition override in tests**: `TestDataSourceConfig` redefines `primaryDataSource` / `secondaryDataSource` beans with the same names as the production configs. By default Spring Boot disallows bean-definition overriding; running the integration test would require `spring.main.allow-bean-definition-overriding=true` (or using `@MockBean`/test profiles that exclude the production configs). The post doesn't mention this — a reader may hit a `BeanDefinitionOverrideException` at runtime.
- **Hibernate 6 dialect best practice**: Even after switching to `MySQLDialect`, the current Hibernate 6 recommendation is to *omit* explicit dialect configuration entirely and let Hibernate auto-detect from JDBC `DatabaseMetaData`. The post still sets the dialect property explicitly, which works fine but is no longer the recommended approach.
- **`@EnableTransactionManagement`**: The annotation appears on both `PrimaryDataSourceConfig` and `SecondaryDataSourceConfig`. One occurrence is sufficient; the duplicate is harmless but redundant.
- **`@Lob` + `columnDefinition = "TEXT"`**: Combining `@Lob` with an explicit `columnDefinition` is redundant on most databases but not incorrect.
