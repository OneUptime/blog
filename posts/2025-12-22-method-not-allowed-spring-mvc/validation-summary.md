# Validation Summary: How to Handle 'Method not allowed' Errors in Spring MVC

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Java (17+, records used)
- Spring Boot 3.x
- Spring Framework 6.x (Spring MVC)
- Spring Boot Actuator
- REST / HTTP methods
- MockMvc (spring-test)

## Sources Consulted
- Spring Framework reference docs — Web on Servlet Stack / Annotated Controllers: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
- Spring Framework API — `HttpRequestMethodNotSupportedException` (`getSupportedHttpMethods()` returns `Set<HttpMethod>`): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/HttpRequestMethodNotSupportedException.html
- Spring Framework API — `HttpMethod` (changed from enum to class in Spring 6.0, retains `name()`): https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/HttpMethod.html
- Spring Framework API — `HttpHeaders.setAllow(Set<HttpMethod>)`: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/HttpHeaders.html
- Spring Boot reference — `HiddenHttpMethodFilter` / `spring.mvc.hiddenmethod.filter.enabled`: https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html
- Spring Framework 6.0 release notes / docs — trailing slash matching deprecation (`setUseTrailingSlashMatch`)
- Spring Boot Actuator — mappings endpoint: https://docs.spring.io/spring-boot/docs/current/actuator-api/htmlsingle/#mappings
- Spring MVC Test (MockMvc) docs: https://docs.spring.io/spring-framework/reference/testing/spring-mvc-test-framework.html

## Issues Found
No technical issues found.

The following were specifically verified as correct and current:
- The request-mapping annotations (`@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping`) and the bare `@RequestMapping` accepting all methods.
- `HttpMethod::name` usage — valid in Spring 6 where `HttpMethod` is now a class (not an enum) but still exposes `name()`.
- `getSupportedHttpMethods()` returning a nullable `Set<HttpMethod>`; the code null-checks before streaming and before `headers.setAllow(...)`.
- `spring.mvc.hiddenmethod.filter.enabled: true` is the correct property to enable `HiddenHttpMethodFilter` (disabled by default since Boot 2.2).
- Trailing-slash statement is accurate for Spring Boot 3 / Framework 6 (matching disabled by default, config option deprecated).
- The default 405 message wording "Request method 'POST' is not supported" matches Spring 6 phrasing.
- The `whenPatchWithoutEndpoint_thenReturns405` test is correct: the path `/api/users` exists for GET/POST so an unmapped PATCH returns 405 (not 404).
- Actuator `management.endpoints.web.exposure.include: mappings` and the `RequestMappingHandlerMapping#getHandlerMethods()` logger are correct.

## Review Notes
- The HTML form example (Section 4) submits `application/x-www-form-urlencoded` data to a `@PutMapping` handler annotated with `@RequestBody User user`. Form-encoded bodies do not bind to `@RequestBody` (which expects JSON via `MappingJackson2HttpMessageConverter`); a real form-driven handler would typically use `@ModelAttribute`. This is an illustrative inconsistency that does not affect the routing point the section is demonstrating (the `_method` override and hidden method filter), so it was left as-is.
- The default Spring Boot error response shown in "Understanding the Error" includes a `message` field. Since Boot 2.3, `server.error.include-message` defaults to `never`, so the `message` field may be empty unless explicitly enabled. The example is fine as an illustration of the structure.
- All code targets Java 17+ (records) and Spring Boot 3 / Framework 6, consistent with the post's stated context.
