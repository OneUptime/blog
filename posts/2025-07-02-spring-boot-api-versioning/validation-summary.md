# Validation Summary: How to Implement API Versioning in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough)

## Technologies Covered
- Java 17
- Spring Boot 3.2.0 (Spring Web MVC)
- Spring Boot Validation (Jakarta Bean Validation)
- Lombok
- Jakarta Servlet API (`HttpServletRequest`/`HttpServletResponse`)
- JUnit 5 + Spring MockMvc (`@WebMvcTest`, `@SpringBootTest`)
- OpenAPI / springdoc (Swagger config)
- REST API versioning strategies (URL path, header, content negotiation, query parameter)
- HTTP deprecation signaling (`Deprecation`, `Sunset`, `Link`, `Warning` headers)

## Sources Consulted
- Spring Framework reference — RequestMappingHandlerMapping custom conditions (`getCustomTypeCondition`/`getCustomMethodCondition`) and `RequestCondition`: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
- Spring Boot `WebMvcRegistrations` Javadoc: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/web/servlet/WebMvcRegistrations.html
- Spring Boot 3.2 testing — `@WebMvcTest`, `@MockBean`, `@SpringBootTest`, `@AutoConfigureMockMvc`: https://docs.spring.io/spring-boot/reference/testing/index.html
- Spring Web content negotiation / `produces` media type matching: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html#mvc-ann-requestmapping-consumes
- RFC 8594 — The Sunset HTTP Header Field (value MUST be an HTTP-date): https://www.rfc-editor.org/rfc/rfc8594
- RFC 9111 §5.5 (Warning header obsoleted) and RFC 8288 (Link header): https://www.rfc-editor.org/rfc/rfc8288
- Lombok `@Data`/`@Builder`/`@NoArgsConstructor`/`@AllArgsConstructor` docs: https://projectlombok.org/features/

## Issues Found
- **`Sunset` header used a non-compliant date format.** `DeprecationInterceptor.addDeprecationHeaders` formatted the sunset date with `DateTimeFormatter.ISO_DATE`, producing `2025-12-31`. RFC 8594 requires the `Sunset` header value to be an HTTP-date (IMF-fixdate, e.g. `Wed, 31 Dec 2025 00:00:00 GMT`). Fixed by converting the `LocalDate` to a UTC `ZonedDateTime` and formatting with `DateTimeFormatter.RFC_1123_DATE_TIME`, and adding the `java.time.ZoneOffset` import. (The human-readable `Warning` header still uses the plain date string, which is fine since that field's text is free-form.)

## Review Notes
- **Spring Boot version / `@MockBean`:** The post targets Spring Boot 3.2.0, where `org.springframework.boot.test.mock.mockito.MockBean` is correct and not yet deprecated. Note for future updates: `@MockBean` was deprecated in Spring Boot 3.4.0 in favor of `@MockitoBean` (`org.springframework.test.context.bean.override.mockito.MockitoBean`). If the post is bumped to Boot 3.4+, the test imports/annotations should be updated.
- **Illustrative tests do not stub the mocked `UserService`.** The `@WebMvcTest` examples mock `UserService` but never stub `getAllUsers()`, so Mockito returns an empty list and assertions like `jsonPath("$[0].name").exists()` would fail if run verbatim. This is a common brevity shortcut in tutorials and does not affect the correctness of the production code being taught; left as-is to avoid restructuring, but readers should add `when(userService.getAllUsers()).thenReturn(...)` stubs to actually run them.
- **Content-negotiation ambiguity edge case:** Mapping both a V1 handler (`produces = vnd.example.api.v1+json`) and a V2 handler (`produces = {vnd.example.api.v2+json, application/json}`) on the same path works for specific vendor Accept headers and for `application/json`. A request with `Accept: */*` (or none) can match both `produces` conditions and may resolve ambiguously; in practice clients should send an explicit Accept header. Worth a caveat but not incorrect.
- **`Warning` header is technically obsolete** (RFC 9111 §5.5 removed it from HTTP caching), though it is still widely emitted and harmless. The `Deprecation`, `Sunset`, and `Link` headers used here are the current, recommended mechanism.
- The custom header-versioning machinery (`ApiVersionCondition` + `ApiVersionRequestMappingHandlerMapping` + `WebMvcRegistrations`) uses the correct extension points and is a valid, working pattern for Spring Boot 3.2.
