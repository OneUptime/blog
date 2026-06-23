# Validation Summary: How to Handle 'Request method not supported' Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring MVC
- REST APIs
- HTTP methods and status codes
- Spring Boot Actuator
- MockMvc

## Sources Consulted
- Spring Framework Reference: Mapping Requests - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html
- Spring Framework Javadoc: HttpRequestMethodNotSupportedException - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/HttpRequestMethodNotSupportedException.html
- Spring Boot Actuator REST API: Mappings endpoint - https://docs.spring.io/spring-boot/api/rest/actuator/mappings.html
- Spring Boot Reference: Actuator endpoints - https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Framework Javadoc: ResourceHandlerRegistry - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/config/annotation/ResourceHandlerRegistry.html
- Spring Framework Javadoc: ResponseEntity - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/ResponseEntity.html
- Spring Framework Javadoc: StatusResultMatchers - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/result/StatusResultMatchers.html
- RFC 9110: HTTP Semantics, 405 Method Not Allowed - https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.6

## Issues Found
- The MockMvc test method name `createProduct_WithGet_Returns405` was misleading because the test intentionally asserts that `GET /api/v1/products` returns `200 OK`, then separately asserts that `PUT /api/v1/products` returns `405 Method Not Allowed`. Renamed it to `createProduct_WithUnsupportedPut_Returns405` so the method name matches the actual test behavior.

## Review Notes
- The HTTP 405 explanation and `Allow` header guidance are consistent with RFC 9110.
- Spring MVC's HTTP method annotations, transparent `HEAD` support for `GET`, `HttpRequestMethodNotSupportedException`, `ResponseEntity.created(URI)`, `ResourceHandlerRegistry`, and MockMvc status matchers were checked against current Spring documentation.
- The custom error handler uses Java records, which are appropriate for current Spring Boot applications that run on modern Java versions. Projects still on older Java versions would need a regular class instead.
