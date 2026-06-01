# Validation Summary: How to Build a GraphQL API with Spring Boot and Deploy to Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- Spring Boot
- Spring for GraphQL
- Spring Data JPA
- H2 Database
- MySQL Connector/J
- Azure App Service
- Azure Web App Maven Plugin
- Java

## Sources Consulted
- Spring Boot Spring for GraphQL reference: https://docs.spring.io/spring-boot/reference/web/spring-graphql.html
- Spring for GraphQL annotated controllers reference: https://docs.spring.io/spring-graphql/reference/controllers.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Microsoft Learn Azure App Service Java quickstart: https://learn.microsoft.com/en-us/azure/app-service/quickstart-java
- Azure Web App Maven Plugin configuration details: https://github.com/microsoft/azure-maven-plugins/wiki/Azure-Web-App:-Configuration-Details
- GraphQL Java scalar documentation: https://www.graphql-java.com/documentation/scalars/

## Issues Found
- The introduction said the tutorial would implement subscriptions, but the schema and controller only implemented queries and mutations. I changed the claim to match the implemented API.
- The Maven dependencies described H2 for local development and MySQL for production, but the MySQL JDBC driver was missing. I added `mysql-connector-j` with runtime scope.
- The controller referenced `ProductRepository` and `ReviewRepository` without defining them. I added Spring Data JPA repository interfaces with the derived query methods used by the controller.
- The `products` query accepted optional price filters, but the controller ignored `minPrice` and `maxPrice` unless `category` was also supplied. I added repository methods and controller branches for price-only filtering.
- The local datasource hard-coded the H2 driver, which would be inherited by the Azure profile while using a MySQL URL. I removed the hard-coded driver so Spring Boot can infer the driver from the JDBC URL.
- The Spring Boot version was outdated for a 2026 tutorial. I updated the parent version to `3.5.14`, the current Spring Boot 3.x stable line shown in the official docs consulted.
- The GraphQL HTTP endpoint property used the older `spring.graphql.path` form. For current Spring Boot documentation, I changed it to `spring.graphql.http.path`.
- The Azure Web App Maven Plugin version was older than the current Microsoft Learn quickstart, and the plugin snippet was not shown inside `build/plugins`. I updated it from `2.12.0` to `2.14.1` and wrapped it in the correct Maven structure.

## Review Notes
The tutorial remains intentionally minimal. A production implementation should also add validation for prices and review ratings, proper GraphQL exception handling, database migrations instead of relying only on Hibernate DDL settings, and authentication/authorization before exposing write mutations.
