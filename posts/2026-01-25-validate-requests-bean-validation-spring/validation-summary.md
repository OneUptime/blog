# Validation Summary: How to Validate Requests with Bean Validation in Spring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Framework MVC
- Jakarta Bean Validation
- Hibernate Validator

## Sources Consulted
- Spring Boot Validation reference: https://docs.spring.io/spring-boot/reference/io/validation.html
- Spring Framework MVC validation reference: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Spring Framework Bean Validation reference: https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html
- Bean Validation 2.0 specification: https://beanvalidation.org/2.0/spec/
- Hibernate Validator reference guide: https://docs.jboss.org/hibernate/stable/validator/reference/en-US/html_single/
- Spring Framework HandlerMethodValidationException Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/annotation/HandlerMethodValidationException.html
- Spring Framework ParameterValidationResult Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/validation/method/ParameterValidationResult.html

## Issues Found
- The setup section incorrectly stated that the validation starter is included with `spring-boot-starter-web`. Updated it to instruct Spring Boot users to add `spring-boot-starter-validation`, which is the starter that provides Jakarta Bean Validation support and Hibernate Validator.
- The setup section said standalone Spring projects should add Hibernate Validator, but showed a Spring Boot starter dependency. Reworded the paragraph so the dependency snippet is clearly for Spring Boot.
- The path and query parameter section used class-level `@Validated` and handled `ConstraintViolationException`. Updated the section for Spring Framework 6.1+ MVC method validation, where direct parameter constraints are handled by Spring MVC and failures are reported as `HandlerMethodValidationException`.
- The common annotations table omitted strings from the supported uses of `@NotEmpty`. Updated the description to include strings.
- The common annotations table described `@Size` as applying only to strings and collections. Updated it to include maps and arrays.

## Review Notes
The examples assume Spring Boot 3.x or newer conventions using Jakarta Bean Validation APIs. Older Spring Framework or Spring Boot applications that rely on AOP-based method validation with class-level `@Validated` may still see `ConstraintViolationException` for method parameter constraints.
