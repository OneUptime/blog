# Validation Summary: How to Handle Validation Errors in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Web MVC
- Jakarta Validation
- Hibernate Validator
- Lombok
- REST API error handling
- Mermaid

## Sources Consulted
- Spring Boot Validation documentation: https://docs.spring.io/spring-boot/reference/io/validation.html
- Spring Framework MVC validation documentation: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Spring Framework Bean Validation documentation: https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
- Spring Framework HandlerMethodValidationException Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/annotation/HandlerMethodValidationException.html
- Spring Framework ParameterValidationResult Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/validation/method/ParameterValidationResult.html
- Hibernate Validator Reference Guide: https://docs.hibernate.org/stable/validator/reference/en-US/html_single/
- Jakarta Validation 3.1 specification: https://jakarta.ee/specifications/bean-validation/3.1/jakarta-validation-spec-3.1.html

## Issues Found
- The introduction described Spring Boot validation as Bean Validation "JSR-380" while the code uses `jakarta.validation` imports. Updated the wording to "Jakarta Validation" to match current Spring Boot 3/4 usage.
- The controller example used `@Min` on a `@PathVariable` without importing `jakarta.validation.constraints.Min`. Added the missing import.
- The global exception handler covered `MethodArgumentNotValidException` and `ConstraintViolationException`, but modern Spring MVC can raise `HandlerMethodValidationException` for direct controller method parameter constraints such as `@Min` on a path variable. Added a handler for `HandlerMethodValidationException`.
- The error response DTO code block declared two `public` top-level classes in one Java snippet. Changed `FieldValidationError` to package-private so the snippet can compile as a single source file.
- The cross-field validator did not guard against a null object value before using `BeanWrapperImpl`. Added a null check that returns true, leaving null object validation to other constraints.
- The nested DTO example declared multiple `public` top-level classes in one Java snippet. Changed the secondary DTO classes to package-private so the snippet can compile as a single source file.
- The service layer validation snippet used `UserResponse`, `@NotNull`, and `@Email` without imports. Added the missing imports.
- The validation groups and service layer snippets had non-void methods with only placeholder comments. Added placeholder return statements so the snippets remain syntactically valid.

## Review Notes
- The examples now align with current Spring Boot and Spring Framework validation behavior. In real projects, teams may prefer separate files for each DTO class rather than package-private classes in one file.
- Returning raw rejected values can expose sensitive data such as passwords. The post's example includes a password field in the DTO, so production code should avoid echoing sensitive rejected values even though the validation handling pattern itself is technically valid.
