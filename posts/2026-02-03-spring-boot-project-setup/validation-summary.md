# Validation Summary: How to Set Up a Spring Boot Project from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Initializr
- Spring Boot CLI
- Maven
- Gradle
- Spring MVC REST controllers
- Spring Boot Actuator
- Jakarta Validation
- Lombok
- Spring Boot testing with MockMvc
- springdoc-openapi

## Sources Consulted
- Spring Boot 3.5.14 System Requirements: https://docs.spring.io/spring-boot/3.5/system-requirements.html
- Spring Boot 3.5.14 Gradle Plugin Introduction: https://docs.spring.io/spring-boot/3.5/gradle-plugin/introduction.html
- Spring Boot 3.5.14 CLI documentation: https://docs.spring.io/spring-boot/3.5/cli/using-the-cli.html
- Spring Boot Actuator HTTP monitoring documentation: https://docs.spring.io/spring-boot/3.5/actuator/monitoring.html
- Spring Initializr metadata and generated project output: https://start.spring.io/metadata/client
- springdoc-openapi documentation and compatibility FAQ: https://springdoc.org/ and https://springdoc.org/faq

## Issues Found
- The post described Spring Boot 3.2.x as the latest stable version. Updated the guide to use Spring Boot 3.5.x as the current stable Spring Boot 3 line, while avoiding a larger Spring Boot 4 migration.
- The Spring Initializr curl example used `bootVersion=3.2.2`, which now returns HTTP 400 from start.spring.io because the service currently accepts Spring Boot versions `>=3.5.0`. Updated it to `3.5.14` and verified the request returns HTTP 200.
- The Maven and Gradle prerequisites were outdated for Spring Boot 3.5.x. Updated them to Maven 3.6.3+ and Gradle 7.6.4+ for 7.x / 8.4+ for 8.x.
- The manual Maven and Gradle build snippets used Spring Boot 3.2.2 and an older dependency management plugin version. Updated Spring Boot versions to 3.5.14 and the Gradle dependency management plugin to 1.1.7.
- The Kotlin Gradle DSL snippet included an unused Kotlin compile-task import in a Java build. Removed the import.
- The Actuator info comment said `/actuator/info` even though the snippet customizes the management base path to `/management`. Updated the comment to `/management/info`.
- The validation controller snippet used `@Valid` without showing the required `jakarta.validation.Valid` import. Added the import.
- The sample startup banner still showed Spring Boot 3.2.2. Updated it to 3.5.14.
- The springdoc-openapi dependency used version 2.3.0, which matches older Spring Boot 3.2-era compatibility. Updated it to 2.8.17 for Spring Boot 3.5.x.

## Review Notes
The tutorial remains intentionally scoped as a Spring Boot 3.x setup guide. Spring Boot 4.0.6 is the latest stable major version as of this review date, but moving the whole article to Spring Boot 4 would require a broader compatibility review beyond the minimum factual corrections needed here.
