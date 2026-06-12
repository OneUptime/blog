# Validation Summary: How to Use Spring Boot with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot
- Spring Data MongoDB
- MongoDB
- Java
- Jakarta Bean Validation
- Lombok
- Testcontainers
- JUnit 5
- REST APIs

## Sources Consulted
- Spring Boot MongoDB reference: https://docs.spring.io/spring-boot/reference/data/nosql.html
- Spring Boot test slices / Data MongoDB tests: https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
- Spring Boot Testcontainers reference: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Spring Data MongoDB object mapping reference: https://docs.spring.io/spring-data/mongodb/reference/mongodb/mapping/mapping.html
- Spring Data MongoDB repository query methods: https://docs.spring.io/spring-data/mongodb/reference/mongodb/repositories/query-methods.html
- Spring Data MongoDB update methods: https://docs.spring.io/spring-data/mongodb/reference/mongodb/repositories/modifying-methods.html
- Spring Data MongoDB template query operations and text search: https://docs.spring.io/spring-data/mongodb/reference/mongodb/template-query-operations.html
- Spring Data MongoDB index management: https://docs.spring.io/spring-data/mongodb/reference/mongodb/mapping/mapping-index-management.html
- Testcontainers MongoDB module: https://java.testcontainers.org/modules/databases/mongodb/
- Testcontainers JUnit 5 quickstart: https://java.testcontainers.org/quickstart/junit_5_quickstart/
- MongoDB text index documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found
- Updated Spring Boot MongoDB configuration from `spring.data.mongodb.*` to current `spring.mongodb.*` properties, including the Testcontainers dynamic property key.
- Updated the Spring Boot `@DataMongoTest` import to the current package used by Spring Boot documentation.
- Updated Testcontainers MongoDB dependencies and imports from the old 1.x artifact/package names to current 2.x names: `testcontainers-mongodb`, `testcontainers-junit-jupiter`, and `org.testcontainers.mongodb.MongoDBContainer`.
- Added `DockerImageName.parse(...)` and `.withReplicaSet()` to the MongoDB Testcontainers example to match current Testcontainers usage and replica-set URL expectations.
- Corrected raw MongoDB index definitions to use stored field names (`first_name`, `last_name`) for fields annotated with `@Field`.
- Corrected the projection example to use the stored MongoDB field names for projected fields.
- Replaced manual `$text` criteria construction with Spring Data MongoDB's `TextCriteria` and `TextQuery` API, which is the documented API for full-text queries.
- Fixed the service method that claimed to return active users by role but called a repository method that did not filter on `active`; added and used `findByActiveTrueAndRolesContaining`.
- Added `deactivatedAt` and set it during soft delete so the TTL index on `deactivated_at` has a date field to expire.
- Removed unused imports from snippets where they could confuse readers copying the code.

## Review Notes
The article remains a broad tutorial with illustrative snippets rather than a complete runnable project. DTO classes such as `CreateUserRequest` and `UpdateUserRequest` are referenced but not defined, which is acceptable for the article's scope but would need to be included in a full sample application.
