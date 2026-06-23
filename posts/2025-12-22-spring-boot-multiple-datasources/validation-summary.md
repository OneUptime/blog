# Validation Summary: How to Configure Multiple DataSources in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot 3.x
- Spring Data JPA / Hibernate 6
- HikariCP
- PostgreSQL & MySQL JDBC drivers
- Spring JDBC (JdbcTemplate)
- Spring Boot Actuator (HealthIndicator)
- Atomikos (JTA/XA transactions)

## Sources Consulted
- Spring Boot Reference — Configure Two DataSources: https://docs.spring.io/spring-boot/how-to/data-access.html#howto.data-access.configure-two-datasources
- Spring Data JPA `@EnableJpaRepositories` reference: https://docs.spring.io/spring-data/jpa/reference/jpa.html
- Spring Framework `@Transactional` / `JtaTransactionManager` reference: https://docs.spring.io/spring-framework/reference/data-access/transaction.html
- Atomikos Spring Boot 3 starter (Maven Central, current version 6.0.109): https://central.sonatype.com/artifact/com.atomikos/transactions-spring-boot3-starter
- Atomikos Spring Boot integration docs: https://www.atomikos.com/Documentation/SpringBootIntegration
- Hibernate 6 dialect auto-detection (Spring Boot 3): https://docs.spring.io/spring-boot/reference/data/sql.html

## Issues Found
No technical issues found.

The post was checked against official documentation across all code blocks:

- The DataSource bean pattern (`DataSourceProperties` + `@ConfigurationProperties` + `initializeDataSourceBuilder().type(HikariDataSource.class).build()`) matches the canonical Spring Boot "two datasources" how-to.
- `@EnableJpaRepositories` with `entityManagerFactoryRef` / `transactionManagerRef` and per-package separation is correct.
- `@Transactional("secondaryTransactionManager")` uses the `value` alias for the qualifier (supported since Spring 4.2) — correct.
- `new JtaTransactionManager(userTransactionManager, userTransactionManager)` is valid because `UserTransactionManager` implements both `jakarta.transaction.UserTransaction` and `jakarta.transaction.TransactionManager`.
- The Atomikos artifact `com.atomikos:transactions-spring-boot3-starter:6.0.109` exists and is the current release on Maven Central.
- The comment that Hibernate 6 auto-detects the dialect from the JDBC connection under Spring Boot 3 is accurate.
- The HealthIndicator implementation (`conn.isValid(5)`, `Health.up()/down().withDetails()`) is correct.
- The cross-database transaction caveat (standard JPA cannot span datasources) and the JTA/XA and Saga alternatives are accurately described.

## Review Notes
- The `application.yml` `spring.jpa.primary` / `spring.jpa.secondary` keys are illustrative custom properties — they are not bound by Spring Boot's standard `spring.jpa.*` auto-configuration, and the actual `hbm2ddl.auto` values are set programmatically in each `EntityManagerFactory` bean. The hardcoded values (`update` for primary, `validate` for secondary) are consistent with the YAML, so there is no contradiction, but readers should note the YAML JPA block is decorative rather than functional.
- `EntityManagerFactoryBuilder` (`org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder`) is correct for current Spring Boot 3.x; note that in some very recent Spring Boot 3.x maintenance lines the supporting JPA auto-configuration classes have been relocated under `*.autoconfigure` packages — the builder usage shown remains valid.
- For `@Lob byte[]` on PostgreSQL, behavior can vary (bytea vs large object); not an error in this generic example but worth being aware of when targeting PostgreSQL specifically.
