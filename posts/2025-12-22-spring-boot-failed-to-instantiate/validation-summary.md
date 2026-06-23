# Validation Summary: How to Fix 'Failed to instantiate' Errors in Spring

## Status
validated

## Post Type
Troubleshooting guide / tutorial (cause-and-solution catalog for Spring Boot bean instantiation failures)

## Technologies Covered
- Java
- Spring Boot / Spring Framework (dependency injection, bean lifecycle)
- Project Lombok (`@RequiredArgsConstructor`, `@Slf4j`, `@Data`)
- Spring annotations: `@Service`, `@Component`, `@Configuration`, `@Bean`, `@Autowired`, `@Qualifier`, `@Primary`, `@Lazy`, `@Value`, `@Scope`, `@ConfigurationProperties`, `@Validated`
- Bean Validation (`@NotBlank`)
- Spring SPIs: `BeanPostProcessor`, `CommandLineRunner`, `ObjectFactory`, JSR-330 `Provider`

## Sources Consulted
- Spring Framework 4.3 core container refinements (implicit single-constructor autowiring): https://spring.io/blog/2016/03/04/core-container-refinements-in-spring-framework-4-3/
- Spring Framework issue SPR-12278 (make `@Autowired` optional on a single constructor): https://github.com/spring-projects/spring-framework/issues/16883
- Project Lombok constructor docs (`@RequiredArgsConstructor`, `lombok.copyableAnnotations`): https://projectlombok.org/features/constructor
- JetBrains Inspectopedia — "@Qualifier not copyable by Lombok": https://www.jetbrains.com/help/inspectopedia/SpringQualifierCopyableLombok.html
- Baeldung — What's New in Spring 4.3: https://www.baeldung.com/whats-new-in-spring-4-3

## Issues Found
1. **Cause 1 ("No Default Constructor") — Problem example was not actually broken.**
   The original "Problem" snippet was byte-for-byte identical to "Solution 1": a `@Service` with a single parameterized constructor, with a comment claiming it "needs `@Autowired`" and throws `No default constructor found`. Since Spring 4.3, a component with a *single* constructor is implicitly autowired and that code works fine — it does not fail. The `No default constructor found` error actually occurs when a class has *multiple* constructors and none is annotated `@Autowired` (Spring then falls back to a non-existent no-arg constructor). Fixed the Problem to show a genuine multi-constructor failure scenario, making Cause 1 internally consistent and technically accurate while leaving the solutions (single constructor / Lombok / explicit `@Autowired`) intact.

2. **Cause 5 (Interface Without Implementation) — field-level `@Qualifier` with `@RequiredArgsConstructor` does not work by default.**
   The original `OrderService` used `@RequiredArgsConstructor` together with a `@Qualifier("smsNotificationService")` annotation placed on the `final` field. Lombok generates a constructor for `final` fields but does **not** copy field annotations to the constructor parameters unless `lombok.copyableAnnotations` is configured in `lombok.config`. With constructor injection, the qualifier on the field is therefore ignored. Fixed by using an explicit constructor with `@Qualifier` on the constructor parameter (and noted the `lombok.copyableAnnotations` alternative in a comment).

## Review Notes
- The remaining causes (missing bean, circular dependency, constructor exception, missing configuration properties, prototype-in-singleton scope) are technically correct. The `@Lazy` constructor approach, setter injection, `ObjectFactory`/`Provider` for prototype scope, and `@ConfigurationProperties` + `@Validated` patterns all match current Spring guidance.
- The JSR-330 `Provider<PrototypeService>` example requires the `jakarta.inject` (or legacy `javax.inject`) dependency on the classpath; `ObjectFactory` is the Spring-native equivalent and needs no extra dependency. This is a classpath caveat rather than an error, so it was left as-is.
- The two `ConfigService` (Cause 4) and two `OrderService` (Cause 5) declarations are presented as alternative illustrations, not as code that compiles together — consistent with the post's didactic style.
- The post does not pin a specific Spring Boot version; all guidance is accurate for current Spring Boot 3.x / Spring Framework 6.x as well as recent 5.x lines.
