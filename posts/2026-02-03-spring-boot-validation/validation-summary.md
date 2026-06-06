# Validation Summary: How to Use Spring Boot Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot 3.x
- Spring Framework MVC validation
- Jakarta Bean Validation
- Hibernate Validator
- REST API error handling
- Spring Kafka message consumer validation

## Sources Consulted
- Spring Boot Validation reference: https://docs.spring.io/spring-boot/reference/io/validation.html
- Spring Framework MVC Validation reference: https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-validation.html
- Spring Framework Bean Validation reference: https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
- Spring Framework LocalValidatorFactoryBean Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/validation/beanvalidation/LocalValidatorFactoryBean.html
- Spring Framework ParameterValidationResult Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/validation/method/ParameterValidationResult.html
- Hibernate Validator 8 reference guide: https://docs.hibernate.org/validator/8.0/reference/en-US/html_single/
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html

## Issues Found
- Controller parameter validation was described as if `@Valid` itself validates `@RequestParam` and `@PathVariable` constraints. Updated the controller to import constraints, add `@Validated`, and clarify that direct constraint annotations on request parameters and path variables are handled through method validation.
- The global exception handler only handled `ConstraintViolationException` for method parameter validation. Added handling for `HandlerMethodValidationException`, which Spring MVC can raise for controller method validation in Spring Framework 6.1+.
- Several Java snippets were missing imports required for the shown code to compile, including `List`, constraint annotations, `BigDecimal`, `PageRequest`, `Collectors`, `ValidationException`, and the example exception/service types. Added the missing imports.
- The message consumer snippet referenced `log`, `OrderService`, `List`, and `sendToDeadLetter` without defining or importing them. Added the missing imports, logger field, and a placeholder dead-letter method.
- The configuration snippet used `spring.validation.enabled`, which is not a standard Spring Boot validation property, and described `spring.mvc.throw-exception-if-no-handler-found` as affecting path variable validation. Replaced the YAML with a valid `spring.messages.basename` example for validation message resolution.
- The custom validator configuration snippet used `Map.of(...)` without importing `Map`, and passed `validator().getValidator()` where the `LocalValidatorFactoryBean` can be supplied directly. Added the import and simplified the validator assignment.
- The complete book example referenced `AuthorRequest` without defining it. Added a minimal nested `AuthorRequest` class so the example is complete enough to compile with the shown DTO.

## Review Notes
- The core validation concepts, use of Jakarta validation annotations, custom `ConstraintValidator` implementations, validation groups, cascaded validation with `@Valid`, and Hibernate Validator fail-fast configuration are technically accurate for Spring Boot 3.x.
- In Spring Framework 6.1+, Spring MVC has built-in method validation support that can be used without class-level `@Validated` on controllers. The post now remains correct for the AOP-based `@Validated` style it demonstrates while also handling the Spring MVC exception type.
