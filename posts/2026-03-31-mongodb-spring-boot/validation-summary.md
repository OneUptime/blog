# Validation Summary: How to Use MongoDB with Spring Boot

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- MongoDB
- Spring Boot 3.x
- Spring Data MongoDB 4.x
- MongoRepository
- MongoTemplate
- Jakarta Bean Validation 3.0
- MongoDB Java Driver

## Sources Consulted
- Spring Data MongoDB reference documentation: https://docs.spring.io/spring-data/mongodb/reference/
- Spring Boot auto-configuration for MongoDB: https://docs.spring.io/spring-boot/reference/data/nosql.html#data.nosql.mongodb
- Spring Data MongoDB Aggregation Framework: https://docs.spring.io/spring-data/mongodb/reference/mongodb/aggregation-framework.html
- Spring Data MongoDB Repositories: https://docs.spring.io/spring-data/mongodb/reference/mongodb/repositories.html
- Jakarta Bean Validation specification: https://jakarta.ee/specifications/bean-validation/3.0/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
1. **Section heading "JSR-303" was inaccurate**: The code uses `jakarta.validation.constraints` imports, which correspond to Jakarta Bean Validation 3.0 (used by Spring Boot 3.x). JSR-303 refers to the original Bean Validation 1.0 specification which used the `javax.validation` namespace. Changed heading from "Validation with JSR-303 (Bean Validation)" to "Validation with Jakarta Bean Validation".

2. **Missing `Sort` import in MongoTemplate section**: The aggregation code uses `Sort.Direction.DESC`, but `Sort` is in `org.springframework.data.domain.Sort`, which was not covered by the explicitly listed imports. Added `import org.springframework.data.domain.Sort;` to the import block.

## Review Notes
- The `@Field("createdAt")` annotation on the `createdAt` field in the Order entity is redundant since Spring Data MongoDB maps Java field names directly by default. Not incorrect, but unnecessary.
- The `deleteOldCancelledOrders` method loads all orders in a date range and filters in Java — a `MongoTemplate` query with both date and status criteria would be more efficient, but this is a design choice, not an error.
- The post correctly advises using `BigDecimal` for monetary values but uses `double` for the `minTotal` parameter in `@Query` and for `amount` in the transaction example. This is acceptable since those are query/operation parameters rather than stored values, but readers should be aware of the inconsistency with the best practices advice.
- All Spring Data MongoDB APIs used (`MongoRepository`, `MongoTemplate`, `Criteria`, `Query`, `Update`, `Aggregation`, `MongoTransactionManager`) are current and non-deprecated as of Spring Boot 3.x / Spring Data MongoDB 4.x.
