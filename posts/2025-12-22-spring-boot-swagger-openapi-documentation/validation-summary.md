# Validation Summary: How to Set Up Swagger/OpenAPI Documentation in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Springdoc OpenAPI
- Swagger UI
- OpenAPI 3
- Maven
- OAuth2 and JWT security documentation

## Sources Consulted
- Springdoc OpenAPI official documentation: https://springdoc.org/
- Springdoc OpenAPI modules documentation: https://springdoc.org/modules.html
- Springdoc OpenAPI properties documentation: https://springdoc.org/properties.html
- Springdoc OpenAPI plugins documentation: https://springdoc.org/plugins.html
- Swagger UI configuration documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
- Swagger Core OpenAPI annotations documentation: https://github.com/swagger-api/swagger-core/wiki/Swagger-2.X---Annotations
- OpenAPI Specification v3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- Maven Central entry for springdoc-openapi-maven-plugin: https://central.sonatype.com/artifact/org.springdoc/springdoc-openapi-maven-plugin

## Issues Found
- The introduction said Springdoc generates OpenAPI 3.0 documentation. Current Springdoc documentation describes OpenAPI 3 support generally, and recent Springdoc versions can generate OpenAPI 3.x documents. Changed the wording to "OpenAPI 3 documentation."
- The Springdoc starter dependencies used version 2.8.6. Updated both WebMVC and WebFlux examples to 2.8.17 to match the current Springdoc 2.x documentation for Spring Boot 3.
- The Maven plugin example used springdoc-openapi-maven-plugin 1.4. Updated it to 1.5, the current released plugin version shown in official/plugin metadata.
- The Maven plugin section did not mention that the plugin fetches the OpenAPI document from a running application during the integration-test phase. Added a short note explaining that it should be used with spring-boot-maven-plugin start/stop goals or a locally running application.
- The Maven plugin execution id was `generate-openapi`; changed it to `integration-test` to match the official plugin example and clarify its intended lifecycle phase.

## Review Notes
The remaining Springdoc properties, Swagger UI configuration keys, annotations, security examples, grouping examples, endpoint URLs, and hide/customizer examples are consistent with the official documentation. The Java snippets are illustrative and omit imports and placeholder domain classes/services, but the Springdoc/OpenAPI APIs used are current and valid.
