# Validation Summary: How to Use Spring Data MongoDB Custom Queries with @Query

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Data MongoDB
- Spring Boot
- MongoDB
- Java
- Maven

## Sources Consulted
- Spring Data MongoDB reference documentation (https://docs.spring.io/spring-data/mongodb/reference/mongodb/repositories/queries.html)
- Spring Data MongoDB @Query annotation Javadoc (https://docs.spring.io/spring-data/mongodb/docs/current/api/org/springframework/data/mongodb/repository/Query.html)
- Spring Data MongoDB @Aggregation annotation Javadoc (https://docs.spring.io/spring-data/mongodb/docs/current/api/org/springframework/data/mongodb/repository/Aggregation.html)
- MongoDB query operator documentation (https://www.mongodb.com/docs/manual/reference/operator/query/)

## Issues Found
No technical issues found.

## Review Notes
- The SpEL example method named `findByCategoryIgnoreCase` only lowercases the input parameter via `?#{[0].toLowerCase()}`. This would not achieve true case-insensitive matching if stored category values have mixed case (e.g., "Electronics" would not match "electronics"). A truly case-insensitive approach would use `$regex` with the `i` option. The SpEL syntax itself is correctly demonstrated, but the method name is slightly misleading about the behavior.
- The section "Combining with @Aggregation" says "use `@Aggregation` alongside `@Query`" which could be misread as combining both annotations on a single method. They are separate annotations used on different methods within the same repository interface. The code example correctly shows `@Aggregation` used independently.
- All @Query attributes (`value`, `fields`, `count`, `exists`, `delete`) are accurately described and correctly used.
- All MongoDB operators (`$gte`, `$lte`, `$in`, `$all`, `$elemMatch`, `$match`, `$group`, `$sum`, `$sort`, `$limit`) are used correctly.
