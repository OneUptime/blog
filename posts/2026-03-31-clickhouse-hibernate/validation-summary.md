# Validation Summary: How to Use ClickHouse with Hibernate

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- Hibernate ORM 6.x
- ClickHouse JDBC driver
- Java / Jakarta Persistence API
- Maven

## Sources Consulted
- Hibernate ORM 6 user guide (https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html)
- Hibernate ORM 6.4.4.Final Maven Central listing (https://central.sonatype.com/artifact/org.hibernate.orm/hibernate-core/6.4.4.Final)
- ClickHouse JDBC driver documentation (https://clickhouse.com/docs/en/integrations/java#jdbc-driver)
- ClickHouse JDBC 0.6.0 release notes (https://github.com/ClickHouse/clickhouse-java/releases/tag/v0.6.0)
- Jakarta Persistence 3.x specification (https://jakarta.ee/specifications/persistence/3.1/)
- ClickHouse mutations documentation (https://clickhouse.com/docs/en/sql-reference/statements/alter)

## Issues Found
No technical issues found.

- Maven coordinates `org.hibernate.orm:hibernate-core:6.4.4.Final` and `com.clickhouse:clickhouse-jdbc:0.6.0` are valid artifacts.
- JDBC driver class `com.clickhouse.jdbc.ClickHouseDriver` and URL scheme `jdbc:ch://` are correct for clickhouse-jdbc 0.4.x+.
- `jakarta.persistence.*` imports are correct for Hibernate 6 (which moved from `javax.persistence` to `jakarta.persistence`).
- `session.createNativeQuery(String, Class<R>)` signature is valid in Hibernate 6, and `Object[].class` is an accepted result type for multi-column tuples.
- Claims about ClickHouse mutations being asynchronous and the lack of auto-increment semantics are accurate.

## Review Notes
- Using `org.hibernate.dialect.H2Dialect` as a dialect for ClickHouse is a pragmatic workaround since Hibernate ships no official ClickHouse dialect. It works for the native-query pattern described in the post but would misbehave for HQL/Criteria queries or schema generation — which the post correctly advises against. A community dialect (e.g., from the `com.github.gavlyukovskiy` or similar projects) could be mentioned as an alternative in the future but is not required.
- The example query references a `ts` column that is not declared on the `ApiLog` entity. This is acceptable because native SQL does not require all columns to be mapped, but readers may be briefly confused. Not an error.
- ClickHouse does technically support `AUTO_INCREMENT` in recent versions via `generateSerialID`, but practically it is rarely used and the post's advice to avoid `GenerationType.IDENTITY` remains sound.
