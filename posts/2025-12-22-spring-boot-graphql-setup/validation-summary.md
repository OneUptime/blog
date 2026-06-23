# Validation Summary: How to Set Up GraphQL in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring for GraphQL
- GraphQL SDL, queries, mutations, and subscriptions
- GraphQL Java custom scalars
- DataLoader / batch loading
- Spring Security method security
- Jakarta Bean Validation
- Reactor

## Sources Consulted
- Spring Boot GraphQL reference: https://docs.spring.io/spring-boot/reference/web/spring-graphql.html
- Spring for GraphQL annotated controllers reference: https://docs.spring.io/spring-graphql/reference/controllers.html
- GraphQL Java scalars documentation: https://graphql-java.com/documentation/scalars/
- GraphQL Java Coercing API documentation: https://www.javadoc.io/static/com.graphql-java/graphql-java/20.1/graphql/scalar/GraphqlIntCoercing.html
- Spring Boot validation reference: https://docs.spring.io/spring-boot/reference/io/validation.html
- Spring Security method security reference: https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html
- Spring Security EnableMethodSecurity API documentation: https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/config/annotation/method/configuration/EnableMethodSecurity.html

## Issues Found
- The dependency list used `@Valid` and method-level security later in the tutorial but did not include `spring-boot-starter-validation` or `spring-boot-starter-security`. Added both dependencies because Spring Boot enables Bean Validation when a validation provider is on the classpath, and Spring Security annotations require Spring Security.
- The custom scalar used the older `Coercing` method signatures: `serialize(Object)`, `parseValue(Object)`, and `parseLiteral(Object)`. Updated the example to the current `graphql-java` signatures with `GraphQLContext`, `Locale`, `CoercedVariables`, and `Value<?>`.
- The DataLoader example created a custom `DataLoaderRegistry` factory that Spring for GraphQL would not automatically use as shown. Replaced it with `BatchLoaderRegistry`, which Spring GraphQL documents as the supported registration mechanism, and updated the controller example to receive a typed `DataLoader` argument.
- The security section used `@PreAuthorize` without enabling method security. Added a minimal `@EnableMethodSecurity` configuration snippet so the example works as described.

## Review Notes
The article remains a high-level tutorial and omits supporting DTOs, entities, repositories, service implementations, and some imports, which is acceptable for the scope. The GraphQL HTTP/WebSocket, GraphiQL, schema printer, annotated controller, exception resolver, and test concepts match the official Spring Boot and Spring GraphQL documentation.
