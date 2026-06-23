# Validation Summary: How to Fix 'Whitelabel Error Page' in Spring Boot

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Java
- Spring Boot
- Spring MVC
- Thymeleaf
- REST API error handling
- YAML application configuration

## Sources Consulted
- Spring Boot 3.5 Servlet Web Applications reference: https://docs.spring.io/spring-boot/3.5/reference/web/servlet.html
- Spring Boot 3.5 Common Application Properties: https://docs.spring.io/spring-boot/3.5/appendix/application-properties/index.html
- Spring Boot 3.5 `@SpringBootApplication` API documentation: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/SpringBootApplication.html
- Spring Framework MVC exception handling reference: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
- Spring Framework `NoResourceFoundException` API documentation: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/resource/NoResourceFoundException.html
- Thymeleaf 3.1 expression utility object documentation: https://www.thymeleaf.org/doc/tutorials/3.1/usingthymeleaf.html

## Issues Found
- The section titled "Show Nothing for 404" implied the configuration suppressed 404 output. It actually configures Spring MVC to raise exceptions for unmapped handlers, so the heading was changed to "Raise Exceptions for 404".
- The static error-page example listed `static/error/error.html` as a fallback for all errors. Spring Boot documents status-code files and series-mask files such as `5xx.html`, so the fallback example was changed to `5xx.html`.
- The Thymeleaf template used `${#environment.acceptsProfiles('dev')}`, but `#environment` is not a standard Thymeleaf expression utility object. It was changed to `${#arrays.contains(@environment.getActiveProfiles(), 'dev')}`, using the Spring `Environment` bean and Thymeleaf's documented `#arrays.contains(...)` utility.
- The 404 handling section said resource mappings could stay enabled while handling only `NoHandlerFoundException`. Spring Boot's documentation notes that default static resource mappings cover `/**`, and missing static resources are raised as `NoResourceFoundException`. The API handler example now imports and handles `NoResourceFoundException`, and the configuration note was updated accordingly.

## Review Notes
The examples are aligned with Spring Boot 3.x / Spring Framework 6.x, which matches the `jakarta.servlet` imports used in the post. Spring Boot 4.x has renamed some web error configuration properties from `server.error.*` to `spring.web.error.*`; this post does not explicitly target Spring Boot 4.x.
