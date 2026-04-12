# Validation Summary: How to Use MySQL with Hibernate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.x
- Hibernate ORM 6.4.0.Final
- MySQL Connector/J 8.2.0
- Jakarta Persistence (JPA) 3.x
- Java (Maven build system)
- HQL (Hibernate Query Language)
- JPA Criteria API

## Sources Consulted
- Hibernate ORM 6.4 documentation: https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html
- Hibernate ORM 6.4 Javadoc (Session, Configuration, MutationQuery APIs)
- Jakarta Persistence 3.1 specification (entity annotations, Criteria API)
- MySQL Connector/J 8.2 documentation: https://dev.mysql.com/doc/connector-j/en/
- Maven Central artifact coordinates for org.hibernate.orm:hibernate-core and com.mysql:mysql-connector-j

## Issues Found
No technical issues found.

## Review Notes
- The `useSSL=false` JDBC URL parameter is deprecated in MySQL Connector/J 8.0.13+ in favor of `sslMode=DISABLED`. It still functions as a compatibility alias in 8.2.0 and is widely used in tutorials, so this is not a correctness issue but could be updated in the future.
- The `serverTimezone=UTC` parameter is no longer strictly required in Connector/J 8.0.23+ when the server timezone is properly configured, but including it is a safe and common practice.
- `hibernate.connection.pool_size` uses Hibernate's built-in connection pool, which is explicitly not intended for production use. The post does not claim this is a production configuration, so this is acceptable for a tutorial context.
- The post correctly uses Hibernate 6.x APIs throughout: `jakarta.persistence.*` imports (not `javax.persistence`), `session.persist()` (not the deprecated `save()`), and `createMutationQuery()` for bulk DML operations.
- The summary section's advice to use `hibernate.hbm2ddl.auto=validate` in production is sound guidance.
