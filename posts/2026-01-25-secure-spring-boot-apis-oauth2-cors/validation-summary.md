# Validation Summary: How to Secure Spring Boot APIs with OAuth2 and CORS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Security
- OAuth2 Resource Server
- JWT bearer tokens
- CORS
- JUnit and Spring MockMvc testing

## Sources Consulted
- Spring Security OAuth2 Resource Server JWT documentation: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Spring Security CORS integration documentation: https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html
- Spring Security MockMvc OAuth2 testing documentation: https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/oauth2.html
- Spring Framework CorsConfiguration API documentation: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/cors/CorsConfiguration.html
- RFC 6749, The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- OpenID Connect Core 1.0 specification: https://openid.net/specs/openid-connect-core-1_0.html

## Issues Found
- The post described OAuth2 as API authentication. OAuth2 is an authorization framework; authentication is standardized by OpenID Connect on top of OAuth2. Updated the description and introductory wording to refer to OAuth2 bearer token validation and API authorization.
- The CORS explanation said browsers block cross-domain requests in general. Updated it to the more precise behavior: CORS controls whether browser JavaScript can read cross-origin responses, with preflight checks for non-simple requests.
- The controller and test examples omitted imports needed by the shown code. Added `java.util.List` for the controller and the relevant JUnit, Spring Boot test, MockMvc, and Spring Security static imports for the test snippet.
- The dependency snippet omitted the test dependencies required by the MockMvc and Spring Security test examples. Added `spring-boot-starter-test` and `spring-security-test` with test scope.
- The MockMvc test used `@WithMockUser` for an endpoint that reads `@AuthenticationPrincipal Jwt`. In a resource server test, `@WithMockUser` provides a user principal rather than a `Jwt`, so the controller example could receive `null`. Updated the test to use Spring Security's `jwt()` request post-processor and added the relevant static imports.

## Review Notes
- The main Spring Security configuration uses the current component-based `SecurityFilterChain` style and avoids the removed `WebSecurityConfigurerAdapter` pattern.
- The CORS configuration correctly avoids `allowedOrigins("*")` together with `allowCredentials(true)`, which Spring Framework rejects.
- The examples assume application-specific classes such as `UserProfile` and `userService` exist; that is acceptable for a focused security tutorial, but a future revision could make the controller snippet fully standalone.
