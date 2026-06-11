# Validation Summary: How to Create Custom Spring Data Repository Methods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Data JPA
- Jakarta Persistence / JPA Criteria API
- Hibernate
- JPQL
- Native SQL
- PostgreSQL
- JUnit / Spring Boot `@DataJpaTest`

## Sources Consulted
- Spring Data JPA reference: JPA query methods: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- Spring Data JPA reference: defining query methods: https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html
- Spring Data JPA reference: custom repository implementations: https://docs.spring.io/spring-data/jpa/reference/repositories/custom-implementations.html
- Spring Data JPA reference: projections: https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html
- Spring Data JPA reference: specifications: https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html
- Spring Data JPA API: `Specification`: https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/domain/Specification.html
- Spring Data JPA API: `JpaSpecificationExecutor`: https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/JpaSpecificationExecutor.html
- Hibernate ORM Javadocs: query hints: https://docs.hibernate.org/orm/6.4/javadocs/org/hibernate/jpa/HibernateHints.html

## Issues Found
- The custom repository implementation used `UserRepositoryImpl` and described the naming pattern as `{RepositoryName}Impl`. Current Spring Data documentation recommends fragment-based implementations named after the custom interface, while the single repository-name implementation pattern is deprecated. Changed the diagram, explanation, and class name to `UserRepositoryCustomImpl`.
- The entity setup code block declared both `public class User` and `public enum UserStatus` in one Java block, which would not be valid in a single source file. Changed the enum to package-private in the example.
- The native CTE example accepted `since` as `String` while comparing it to a timestamp/date column. Changed it to `LocalDateTime` and added the import.
- Several repository and projection snippets used annotations or types without imports. Added missing imports for `@Query`, `@Param`, `@Value`, `LocalDateTime`, `List`, `Optional`, `BigDecimal`, and `UserDTO` where needed.
- The DTO projection used primitive `int` for `loginCount`, while the entity field is `Integer`. Changed the DTO field, constructor parameter, and getter to `Integer` so null database values do not break constructor projection.
- The projections section broadly said projections avoid loading entire entities. Adjusted the wording to "closed projections can avoid loading entire entities" because open projections using SpEL have different optimization behavior.

## Review Notes
- The post remains a broad tutorial with illustrative snippets rather than a complete runnable sample. Some referenced domain classes and relationships, such as `Role`, `Order`, `addresses`, and request/exception types, are intentionally assumed by the surrounding examples.
- Hibernate query hints are vendor-specific; the hint names shown are valid Hibernate hint names.
