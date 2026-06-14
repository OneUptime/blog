# Validation Summary: How to Version REST APIs in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring MVC REST controllers
- REST API versioning
- HTTP headers and content negotiation
- HTTP Deprecation and Sunset headers

## Sources Consulted
- Spring Framework reference documentation: Mapping Requests - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
- Spring Framework Javadoc: GetMapping - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/GetMapping.html
- Spring Framework Javadoc: RequestMappingInfo - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/mvc/method/RequestMappingInfo.html
- Spring Framework reference documentation: Interception - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html
- RFC 8594: The Sunset HTTP Header Field - https://www.rfc-editor.org/info/rfc8594/
- RFC 9745: The Deprecation HTTP Response Header Field - https://datatracker.ietf.org/doc/rfc9745/
- RFC 6838: Media Type Specifications and Registration Procedures - https://datatracker.ietf.org/doc/html/rfc6838
- IANA Link Relations registry - https://www.iana.org/assignments/link-relations/

## Issues Found
- The custom header versioning example used a custom `RequestMappingHandlerMapping` that rebuilt `RequestMappingInfo` from only paths, methods, and headers. That would drop other mapping conditions and framework configuration such as produces/consumes, params, custom conditions, names, and path matching options. Replaced it with Spring MVC's documented `headers` mapping condition on `@GetMapping`.
- The header-versioning and content-negotiation controller snippets returned `List<...>` but did not import `java.util.List`. Added the missing imports.
- The deprecation example used `Deprecation: true`, but RFC 9745 defines the `Deprecation` field as a structured date value. Changed it to `@1780272000`, representing 2026-06-01T00:00:00Z.
- The `Sunset` example used `Sat, 01 Jun 2026 00:00:00 GMT`, which had the wrong weekday and was already in the past on the validation date. Updated it to `Tue, 01 Jun 2027 00:00:00 GMT`, a valid future HTTP-date.

## Review Notes
The controller snippets are still illustrative and assume existing application types such as `User`, `UserService`, DTO mapping methods, repositories, and exceptions. The Spring MVC mapping patterns, content negotiation usage, interceptor timing, vendor media type format, and link relation usage are technically valid after the corrections.
