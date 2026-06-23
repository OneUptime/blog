# Validation Summary: How to Handle 'Cannot invoke method on null' Errors

## Status
validated

## Post Type
Guide / Tutorial (defensive coding strategies for handling NullPointerException)

## Technologies Covered
- Java (14+, with focus on helpful NPE messages)
- Spring Boot / Spring Framework
- Spring Data JPA (repositories, `Optional` return types)
- Jakarta Bean Validation (`@NotNull`, `@Size`, `@Email`, `@Valid`)
- Lombok (`@Data`, `@Builder`, `@Builder.Default`)
- JUnit 5 + Mockito (testing patterns)

## Sources Consulted
- JEP 358: Helpful NullPointerExceptions — https://openjdk.org/jeps/358 (confirms Java 14 introduction behind `-XX:+ShowCodeDetailsInExceptionMessages`, enabled by default since Java 15)
- Java `java.util.Objects.requireNonNull` Javadoc — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Objects.html
- Java `java.util.Optional` Javadoc — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Optional.html
- Spring Framework `org.springframework.lang` `@NonNull` / `@Nullable` — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/lang/package-summary.html
- Spring Data JPA reference (Optional query return types) — https://docs.spring.io/spring-data/jpa/reference/
- Jakarta Bean Validation constraints — https://jakarta.ee/specifications/bean-validation/
- Project Lombok `@Builder` / `@Builder.Default` docs — https://projectlombok.org/features/Builder

## Issues Found
- **Lombok `@Builder.Default` used without `@Builder`** (Default Values section). The example annotated the class with only `@Data` while using `@Builder.Default` on its fields. `@Builder.Default` requires `@Builder` to be present on the class; without it Lombok emits a "`@Builder.Default` requires `@Builder`" warning and the annotation has no effect. Fixed by adding `@Builder` to the class and a clarifying comment, so the example compiles cleanly and demonstrates the intended behavior.

## Review Notes
- The claim that helpful NPE messages are "enabled by default in Java 15+" and require the `-XX:+ShowCodeDetailsInExceptionMessages` flag on Java 14 is accurate per JEP 358.
- `@Autowired(required = false)` on a constructor parameter for an optional dependency is valid Spring usage; an alternative (`ObjectProvider` or `@Nullable`) could be mentioned, but the shown code is correct.
- Import packages for Bean Validation annotations are not shown; in modern Spring Boot 3.x these come from `jakarta.validation.constraints` (Spring Boot 2.x used `javax.validation`). The code is version-agnostic as written and remains correct.
- All other code samples (constructor injection, `Optional` chains, `Objects.requireNonNull`, Null Object pattern, `@RestControllerAdvice`, and JUnit/Mockito tests) are syntactically correct and use current, non-deprecated APIs.
