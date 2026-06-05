# Validation Summary: How to Instrument Hibernate ORM Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Data JPA
- Hibernate ORM
- OpenTelemetry Java instrumentation
- OpenTelemetry JDBC instrumentation
- PostgreSQL JDBC
- JPQL and native SQL

## Sources Consulted
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java instrumentation JDBC library README for v2.0.0: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/v2.0.0/instrumentation/jdbc/library/README.md
- OpenTelemetry Java SDK `SpanProcessor` Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace
- OpenTelemetry Java SDK `ReadableSpan` Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace
- Hibernate ORM 6.4 `Interceptor` Javadocs: https://docs.hibernate.org/orm/6.4/javadocs/org/hibernate/Interceptor.html
- Hibernate ORM 6.4 `Statistics` Javadocs: https://docs.hibernate.org/orm/6.4/javadocs/org/hibernate/stat/Statistics.html
- Spring Boot `HibernatePropertiesCustomizer` API documentation: https://docs.spring.io/spring-boot/docs/3.1.11/api/org/springframework/boot/autoconfigure/orm/jpa/HibernatePropertiesCustomizer.html
- Jakarta Persistence `EntityManager` API documentation: https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/entitymanager

## Issues Found
- The JDBC sanitizer property used `otel.instrumentation.jdbc.statement-sanitizer.enabled`, but the OpenTelemetry JDBC 2.0 library uses the common database sanitizer property. Changed it to `otel.instrumentation.common.db-statement-sanitizer.enabled=true`.
- The overview overstated JDBC tracing by saying OpenTelemetry captures result set processing as database spans. Narrowed the claim to connection acquisition and query execution, which matches JDBC instrumentation behavior.
- The Hibernate interceptor example used `Serializable id` callback overloads that are deprecated in Hibernate 6. Updated the interceptor methods to use the non-deprecated `Object id` overloads and removed obsolete imports.
- The interceptor called `id.toString()` without null checks in several callbacks. Added null guards so the example does not throw a `NullPointerException` for callbacks where an identifier is not yet available.
- The Hibernate config snippet imported `org.hibernate.Interceptor` and `java.util.Map` without using them. Removed the unused imports.
- The custom repository and transaction monitor snippets referenced OpenTelemetry classes without importing them. Added the missing `Span`, `StatusCode`, `Tracer`, `Context`, and `Scope` imports.
- The transaction monitor labeled `TransactionSynchronizationManager.isActualTransactionActive()` as `transaction.new`, but that API reports whether an actual transaction is active, not whether the current method created a new transaction. Renamed the attribute to `transaction.active`.
- The custom `SpanProcessor` snippet referenced `AttributeKey` without importing it and omitted required `SpanProcessor` methods. Added the missing imports and implemented `onStart`, `isStartRequired`, `isEndRequired`, `shutdown`, and `forceFlush`.

## Review Notes
The OpenTelemetry and Spring Boot versions in the dependency snippet are older than current releases, but they are internally plausible for a Spring Boot 3.2-era tutorial. The explicit `hibernate-core` version is redundant when using Spring Boot dependency management, but it is not technically incorrect. The N+1 detector uses global Hibernate `SessionFactory` statistics and clears them inside an aspect, which is acceptable for demonstration but would need request-local accounting or careful concurrency handling before production use.
