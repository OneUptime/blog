# Validation Summary: How to Use Spring Data MongoDB Projections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Spring Data MongoDB
- Java
- Spring Framework (SpEL, @Value)

## Sources Consulted
- Spring Data MongoDB Reference Documentation — Projections (https://docs.spring.io/spring-data/mongodb/reference/repositories/projections.html)
- Spring Data MongoDB @Query annotation reference (https://docs.spring.io/spring-data/mongodb/reference/mongodb/repositories/repositories.html)
- MongoDB Projection documentation (https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct and current Spring Data MongoDB APIs for interface-based, class-based (DTO), dynamic, and @Query-based projections.
- The `@Value` annotation correctly uses the fully qualified `org.springframework.beans.factory.annotation.Value` with SpEL `target` variable syntax, which is the documented approach for open projections.
- The performance distinction between closed projections (pushed to MongoDB) and open projections (full document loaded) is accurately described.
- The post omits import statements in most examples (e.g., `@Document`, `@Id`, `List`, `MongoRepository`), which is standard for tutorial-style posts and not an error.
- The post does not specify a Spring Data MongoDB version; all patterns shown are stable across Spring Data MongoDB 3.x and 4.x.
