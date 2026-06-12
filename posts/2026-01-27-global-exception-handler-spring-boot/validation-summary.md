# Validation Summary: How to Build a Global Exception Handler in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring MVC
- Jakarta Bean Validation
- Micrometer
- SLF4J MDC
- Jackson
- Lombok

## Sources Consulted
- Spring Framework reference: Controller Advice - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html
- Spring Framework reference: Exceptions and @ExceptionHandler - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
- Spring Boot reference: Web, Error Handling, Static Content, and NoHandlerFoundException - https://docs.spring.io/spring-boot/docs/3.2.2/reference/html/web.html
- Spring Boot application properties appendix - https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Micrometer reference: Counters - https://docs.micrometer.io/micrometer/reference/concepts/counters.html

## Issues Found
- The basic `GlobalExceptionHandler` snippet used `Logger` and `LoggerFactory` without importing the SLF4J classes. Added the missing imports so the snippet is syntactically complete.
- The post stated that Spring Boot returns stack traces by default. Spring Boot's documented default for stack trace inclusion is `never`, though error attributes can be enabled and should be controlled carefully. Reworded the claim to say the default error response can expose more implementation detail than desired if error attributes are enabled.
- The sample `traceId` values included non-hex characters even though the fallback generator derives the value from a UUID hex string. Updated the examples to use hex-compatible IDs.

## Review Notes
The `NoHandlerFoundException` configuration matches Spring Boot guidance: `spring.mvc.throw-exception-if-no-handler-found=true` also requires static resource handling to be narrowed or disabled because static resources are mapped to `/**` by default. The examples use Jakarta Validation imports, which are appropriate for Spring Boot 3.x and later.
