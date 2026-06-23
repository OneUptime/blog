# Validation Summary: How to Configure CORS in Spring Boot

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Java
- Spring Boot / Spring Framework (Spring MVC)
- Spring Security 6 (lambda DSL)
- CORS (Cross-Origin Resource Sharing)
- Servlet API (Filter)
- YAML configuration / `@ConfigurationProperties`
- curl

## Sources Consulted
- Spring Framework Reference — CORS (Spring MVC): https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html
- Spring Boot Reference — Externalized Configuration / `@ConfigurationProperties`: https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Security Reference — CORS configuration (security filter chain, `authorizeHttpRequests`, `requestMatchers`)
- MDN Web Docs — CORS / preflight requests

## Issues Found
1. **Incorrect `@ConfigurationProperties` bean registration (fixed).**
   In the "Configuration Properties" example, the `CorsProperties` class was annotated with **both** `@Configuration` and `@ConfigurationProperties(prefix = "cors")`, while `CorsConfig` separately used `@EnableConfigurationProperties(CorsProperties.class)`. Per the Spring Boot documentation, you should pick exactly one registration mechanism. Annotating a `@ConfigurationProperties` class with `@Configuration`/`@Component` *and* enabling it via `@EnableConfigurationProperties` registers the bean twice, which can lead to duplicate/conflicting bean definitions (e.g. `NoUniqueBeanDefinitionException` on constructor injection). Removed the redundant `@Configuration` annotation from `CorsProperties` so the example follows the documented `@EnableConfigurationProperties` pattern.

## Review Notes
- The two key CORS safety claims are accurate and verified against the Spring docs:
  - Combining `allowCredentials(true)` with a wildcard `allowedOrigins("*")` throws an error at request time — correctly flagged in "Common Mistakes."
  - `allowedOriginPatterns(...)` (e.g. `https://*.myapp.com`) is the correct way to use wildcards together with credentials — correctly demonstrated.
- The Spring Security examples use the current Spring Security 6 lambda DSL (`http.cors(...)`, `authorizeHttpRequests`, `requestMatchers`), which is correct for current Spring Boot 3.x.
- The `CorsRegistration` / `CorsConfiguration` method names (`allowedOrigins`, `allowedOriginPatterns`, `allowedMethods`, `allowedHeaders`, `exposedHeaders`, `allowCredentials`, `maxAge`) all match the official API.
- Minor (not changed, stylistically acceptable): the intro describes CORS as a feature that "restricts" cross-origin requests; more precisely, the browser's Same-Origin Policy does the restricting and CORS is the mechanism that selectively relaxes it. This is a common simplification and not technically misleading in context.
- Minor (not changed): the custom `Filter` example and Servlet types (`HttpServletRequest`/`HttpServletResponse`) are package-agnostic in the snippet; on Spring Boot 3.x these come from `jakarta.servlet.*` (vs `javax.servlet.*` on Boot 2.x). Imports are not shown, so the snippet is correct for both lines once the right package is imported.
