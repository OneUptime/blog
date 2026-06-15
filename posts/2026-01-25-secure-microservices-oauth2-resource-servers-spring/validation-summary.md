# Validation Summary: How to Secure Microservices as OAuth2 Resource Servers in Spring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring Security
- OAuth 2.0 Resource Server
- JWT
- JWKS / JWK Set URI
- Spring MVC / MockMvc testing
- Method-level security with `@PreAuthorize`

## Sources Consulted
- Spring Security Reference: OAuth 2.0 Resource Server JWT - https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Spring Security Reference: Authorize HTTP Requests - https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Spring Security Reference: Method Security - https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html
- Spring Security Reference: Testing OAuth 2.0 / JWT with MockMvc - https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/oauth2.html
- Spring Security Reference: Testing support dependency - https://docs.spring.io/spring-security/reference/servlet/test/index.html
- Spring Security API: ExceptionHandlingConfigurer - https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/config/annotation/web/configurers/ExceptionHandlingConfigurer.html
- Spring Boot Reference: Testing Spring Boot applications and `@MockitoBean` - https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
- Spring Framework Reference: `@MockitoBean` - https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html

## Issues Found
- The Spring Boot JWT resource server property used `jwks-uri`, which is not the documented property. Changed it to `jwk-set-uri`.
- The HTTP method request matchers passed `"GET"`, `"POST"`, `"PUT"`, and `"DELETE"` as strings, which selects the path-pattern overload rather than the HTTP method overload. Changed them to use `HttpMethod.GET`, `HttpMethod.POST`, `HttpMethod.PUT`, and `HttpMethod.DELETE`, and added the required import.
- The dependency section omitted `spring-security-test`, which is required for `SecurityMockMvcRequestPostProcessors.jwt()`. Added Maven and Gradle test dependencies.
- The first explanation said token validation was delegated to the authorization server. For JWT resource servers, token issuance and authentication are delegated, while JWT validation is local using configured keys. Reworded that sentence.
- The `SecurityConfig` snippet used `JwtAuthenticationConverter` and `JwtGrantedAuthoritiesConverter` without imports. Added the imports.
- The controller snippet returned `List<Order>` without importing `java.util.List`. Added the import.
- The JWT validation snippet had a public class named `JwtValidationConfig` under a `JwtClaimValidator.java` file comment. Changed the comment to `JwtValidationConfig.java`.
- The JWT validation snippet used `OAuth2Error` without importing it. Added the import.
- The timestamp validation comment claimed `iat` validation. Spring Security's standard timestamp validation covers `exp` and `nbf`, so the comment was corrected.
- The token error handling snippet used `@RestControllerAdvice` / `@ExceptionHandler` for security filter-chain exceptions. Replaced it with `AuthenticationEntryPoint` and `AccessDeniedHandler` beans, plus a short `exceptionHandling` wiring snippet.
- The `@WebMvcTest` example did not provide required test-slice collaborators or import the security configuration, so the context and authorization assertions would be unreliable. Added `@Import(SecurityConfig.class)`, `@MockitoBean` for `OrderService`, and `@MockitoBean` for `JwtDecoder`.

## Review Notes
- The examples are accurate for modern Spring Security / Spring Boot style using `SecurityFilterChain`, `authorizeHttpRequests`, `@EnableMethodSecurity`, and resource server JWT support.
- The examples remain illustrative and omit application-specific domain classes such as `Order`, `OrderService`, `OrderRepository`, and request DTOs.
