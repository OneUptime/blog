# Validation Summary: How to Handle Exceptions Globally in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Web MVC exception handling
- Spring validation / Jakarta Bean Validation
- Spring Security exceptions
- Spring Data access exceptions
- Micrometer Tracing
- Jackson JSON serialization
- Lombok

## Sources Consulted
- Spring Framework Reference: Controller Advice — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html
- Spring Framework Reference: Exceptions and `@ExceptionHandler` — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
- Spring Framework Javadoc: `MethodArgumentNotValidException` — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/MethodArgumentNotValidException.html
- Spring Framework Javadoc: `NoHandlerFoundException` — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/NoHandlerFoundException.html
- Spring Framework Javadoc: `NoResourceFoundException` — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/resource/NoResourceFoundException.html
- Spring Boot Reference: Tracing — https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Micrometer Tracing Reference: Using the Tracing API — https://docs.micrometer.io/tracing/reference/api.html

## Issues Found
- **Multiple public exception classes in one code block**: Java requires each public top-level class to be declared in its own `.java` file. Added a note clarifying that each public exception class should be placed in its own file under the `com.example.exception` package.
- **Possible null dereference in type mismatch handler**: `MethodArgumentTypeMismatchException#getRequiredType()` can be null. Updated the example to guard against null before calling `getSimpleName()`.
- **Incomplete 404 handling for current Spring MVC behavior**: `NoHandlerFoundException` is only raised when `DispatcherServlet` is configured to throw it, and Spring Framework 6.1+ has `NoResourceFoundException` for missing static resources. Clarified the `NoHandlerFoundException` handler comment and added a `NoResourceFoundException` handler.
- **Possible null dereference in data integrity handler**: `DataIntegrityViolationException#getMessage()` can be null. Updated the example to check for null before inspecting the message.
- **Incomplete service method example**: `createUser` declared a `UserResponse` return type but ended with a comment and no return statement. Replaced the placeholder with a representative `mapToEntity`, `save`, and `mapToResponse` return flow.

## Review Notes
- The overall `@RestControllerAdvice` and `@ExceptionHandler` approach is technically correct for Spring MVC REST APIs.
- The `TraceIdProvider` approach is compatible with Micrometer Tracing; `Optional.map` safely handles a null current span by producing an empty `Optional`.
- The examples assume a Spring Boot 3 / Spring Framework 6 style application because they use `jakarta.*` imports and Micrometer Tracing.
