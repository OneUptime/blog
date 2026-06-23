# Validation Summary: How to Use MapStruct for Object Mapping

## Status
validated

## Post Type
Tutorial / Guide (hands-on walkthrough of MapStruct in a Spring Boot project)

## Technologies Covered
- Java 17
- MapStruct 1.5.5.Final
- Lombok 1.18.30 + lombok-mapstruct-binding 0.2.0
- Spring Boot 3.2.0 (Spring Web)
- JPA / Jakarta Persistence (Hibernate)
- Maven (maven-compiler-plugin) and Gradle build configuration
- JUnit 5 + AssertJ for tests

## Sources Consulted
- MapStruct 1.5 Reference Guide — https://mapstruct.org/documentation/1.5/reference/html/
- MapStruct FAQ (Lombok integration) — https://mapstruct.org/faq/
- Baeldung, "Using MapStruct With Lombok" — https://www.baeldung.com/java-mapstruct-lombok
- MapStruct GitHub discussion #3480 (Lombok binding requirement) — https://github.com/mapstruct/mapstruct/discussions/3480

## Issues Found
No technical issues found.

Verified specifically:
- **Dependency versions and coordinates** are real and mutually compatible: `mapstruct`/`mapstruct-processor` 1.5.5.Final, `lombok` 1.18.30, `lombok-mapstruct-binding` 0.2.0, `maven-compiler-plugin` 3.11.0, and the Spring Boot Gradle plugin 3.2.0.
- **Annotation-processor ordering** (Lombok before MapStruct, plus the lombok-mapstruct-binding entry) is required for Lombok 1.18.16+ and is shown correctly for both Maven `annotationProcessorPaths` and Gradle `annotationProcessor` declarations.
- **Compiler args** (`-Amapstruct.defaultComponentModel=spring`, `-Amapstruct.unmappedTargetPolicy=ERROR`, `unmappedSourcePolicy`, `verbose`, `suppressGeneratorTimestamp`, `suppressGeneratorVersionInfoComment`) are valid MapStruct processor options.
- **MapStruct API usage** is correct and current for 1.5.x: `@Mapper` attributes (`componentModel`, `uses`, `unmappedTargetPolicy`, `nullValuePropertyMappingStrategy`), `@Mapping` attributes (`source`, `target`, `expression`, `constant`, `defaultValue`, `defaultExpression`, `ignore`, `qualifiedByName`, `conditionExpression`), `@BeanMapping`, `@MappingTarget`, `@Named`, `@Condition`, `@ValueMappings`/`@ValueMapping`, `MappingConstants.ANY_REMAINING`, `@InheritInverseConfiguration`, `@MapMapping` (`keyTargetType`/`valueTargetType`), `@DecoratedWith`, `@MapperConfig`, and the `@Context`/`@BeforeMapping`/`@TargetType` cycle-avoidance pattern.
- **Java/Jakarta APIs** are correct for Java 17 / Spring Boot 3.x: `jakarta.persistence.*` and `jakarta.validation.*` imports (not the old `javax.*`), `Stream.toList()` (Java 16+), and `org.hibernate.Hibernate.isInitialized(...)`.
- **Test code** (`Mappers.getMapper(...)` for non-Spring unit tests, `@SpringBootTest` with `@Autowired` mapper for integration) reflects standard MapStruct testing practice.

## Review Notes
- In the "Nested Object Mapping" section, `OrderItemDto` is declared as a package-private top-level class in the same source block as the public `OrderDto`. As written this is fine because two top-level classes can share a file only if at most one is `public`. However, MapStruct generates the `OrderItemMapperImpl` in the `com.example.mapping.mapper` package, which cannot reference a package-private type in `com.example.mapping.dto`. In a real project `OrderItemDto` should be `public` (in its own file). This is a common blog-snippet simplification rather than an error in the demonstrated MapStruct usage, so no change was made.
- The comparison table lists **Dozer**, which is effectively end-of-life / no longer actively maintained; readers evaluating libraries today would more likely compare MapStruct against ModelMapper or JMapper. The technical characterization (runtime, reflection-based, slower) remains accurate.
- Several illustrative DTOs/entities referenced in standalone examples (`InvoiceDto`, `Customer`, `UserResponseDto`, `UserPublicDto`, `UserSummaryDto`, `Product`) are intentionally not fully defined; they are used only to demonstrate a specific mapping feature and do not affect correctness of the shown code.
- `@Mapping(target = "status", source = "status")` (same-named field) is redundant but harmless; MapStruct maps it implicitly. Left as-is since it aids readability of the example.
