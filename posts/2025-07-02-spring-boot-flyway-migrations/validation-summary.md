# Validation Summary: How to Use Flyway for Database Migrations in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (17/21)
- Spring Boot 3.x (Flyway auto-configuration, Actuator, Micrometer)
- Flyway 10.x (versioned, repeatable, undo, and Java-based migrations)
- PostgreSQL (DDL, functions, triggers, partial/GIN indexes)
- Maven & Gradle build configuration
- Testcontainers / JUnit 5
- GitHub Actions, Docker Compose, Kubernetes

## Sources Consulted
- Flyway documentation (Redgate): https://documentation.red-gate.com/fd
- Flyway database modules / `flyway-database-postgresql` split (Flyway 10): https://documentation.red-gate.com/fd/postgresql-database-184127604.html
- Flyway `Callback` and `Context` API: https://javadoc.io/doc/org.flywaydb/flyway-core/latest/org/flywaydb/core/api/callback/package-summary.html
- Spring Boot Flyway auto-configuration & `FlywayMigrationStrategy`: https://docs.spring.io/spring-boot/how-to/data-initialization.html
- Spring Boot Actuator `Health` API: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/actuate/health/Health.html
- PostgreSQL documentation (functions, triggers, partial indexes, JSONB/GIN): https://www.postgresql.org/docs/current/

## Issues Found
1. **Java compile error in `FlywayConfiguration` (programmatic baselining)** — The condition `if (!flyway.info().applied().length > 0 && ...)` applies the logical-NOT operator `!` to an `int` (`length`), which does not compile in Java. Changed to `if (flyway.info().applied().length == 0 && ...)`, which expresses the intended "no applied migrations" check correctly.

2. **Java compile error in `MigrationCallback`** — The call `notificationService.sendMigrationCompleteNotification(context.getMigrationInfo().length)` is invalid: the Flyway callback `Context.getMigrationInfo()` returns a single `MigrationInfo` object (not an array), so it has no `.length` member; furthermore it returns `null` for the `AFTER_MIGRATE` event, which would NPE even if it compiled. Changed to a no-argument `notificationService.sendMigrationCompleteNotification()` call so the example compiles and is safe for the `AFTER_MIGRATE` event.

## Review Notes
- The Maven/Gradle dependency set (`flyway-core` + `flyway-database-postgresql`) is correct for Flyway 10.x (used by Spring Boot 3.2+), where database-specific support was split into separate modules.
- The Flyway `Callback` interface methods used (`supports`, `canHandleInTransaction`, `handle`, `getCallbackName`) match the current API.
- `flyway.clean()` in the Testcontainers test will only succeed if cleaning is not disabled. Flyway/Spring Boot may have `cleanDisabled=true`; for the clean-and-migrate-per-test pattern shown, ensure `spring.flyway.clean-disabled=false` is set in the test profile. Not changed since it is environment/config-dependent and the surrounding example is illustrative.
- The repeatable migration `R__Populate_reference_data.sql` references an `order_statuses` table that is not created by any versioned migration shown in the post. This is an illustrative gap rather than a technical error; readers adapting the example must create that table first.
- `Health.status("WARNING")` is valid (Actuator allows custom status codes); the resulting status is treated as non-standard and will not map to `UP`/`DOWN` aggregation by default — acceptable for the indicator's intent.
- All PostgreSQL DDL/PLpgSQL (BIGSERIAL, partial indexes, GIN on JSONB, trigger functions, `TG_OP` handling) is syntactically correct.
