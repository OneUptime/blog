# Validation Summary: How to Use Spring Data MongoDB Repositories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Spring Boot
- Spring Data MongoDB
- Java
- Maven

## Sources Consulted
- Spring Data MongoDB reference documentation: https://docs.spring.io/spring-data/mongodb/reference/
- Spring Data MongoDB `@Query` annotation Javadoc: https://docs.spring.io/spring-data/mongodb/docs/current/api/org/springframework/data/mongodb/repository/Query.html
- Spring Data Commons repository query method reference: https://docs.spring.io/spring-data/commons/reference/repositories/query-methods-details.html
- Spring Boot MongoDB auto-configuration properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html#appendix.application-properties.data

## Issues Found
1. **Invalid annotation `@org.springframework.data.domain.Sort.Order` on line 126**: `Sort.Order` is a class within `org.springframework.data.domain`, not an annotation. It cannot be used with `@` syntax. The correct way to apply sorting to a `@Query`-annotated method is to add a `Sort` parameter to the method signature. Changed the method signature from using a bogus annotation to accepting a `Sort` parameter: `List<Product> findByCategorySorted(String category, org.springframework.data.domain.Sort sort);`.

## Review Notes
- The post uses `MongoRepository` which extends `ListCrudRepository` and `ListPagingAndSortingRepository` in Spring Data 3.x (Spring Boot 3.x). The claim that it extends `PagingAndSortingRepository` is close enough for a tutorial — the pagination/sorting capability is still inherited, just through an intermediate interface in newer versions.
- All derived query method names (`findBySku`, `findByPriceLessThan`, `findByCategoryAndPriceLessThan`, `existsBySku`, `countByCategory`, `deleteBySku`) follow correct Spring Data naming conventions.
- The `@Query` annotation with MongoDB JSON syntax and positional parameter placeholders (`?0`, `?1`) is correct.
- The projection example using the `fields` attribute of `@Query` is correct.
