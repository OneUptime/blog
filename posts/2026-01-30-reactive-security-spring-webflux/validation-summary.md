# Validation Summary: How to Build Reactive Security in Spring WebFlux

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Spring WebFlux (reactive web framework)
- Spring Security (reactive: `SecurityWebFilterChain`, `ReactiveSecurityContextHolder`, `ReactiveUserDetailsService`)
- JJWT library (`io.jsonwebtoken` 0.12.3)
- Project Reactor (`Mono`, `Flux`, Reactor `Context`)
- Spring Data MongoDB Reactive
- Spring Security OAuth2 Resource Server (reactive)
- Bean Validation (Jakarta)
- JUnit 5 + `WebTestClient`
- Java (Jakarta EE namespace, Spring Boot 3.x era)

## Sources Consulted
- Spring Security reference docs — WebFlux / Reactive: https://docs.spring.io/spring-security/reference/reactive/index.html
- Spring Security `SecurityWebFilterChain` / `ServerHttpSecurity` API docs
- Spring Security OAuth2 Resource Server (reactive) — `ReactiveJwtDecoder`, `ReactiveJwtAuthenticationConverter`, `ReactiveJwtGrantedAuthoritiesConverterAdapter`
- JJWT 0.12.x API docs and migration notes (https://github.com/jwtk/jjwt) — `Jwts.builder()` fluent setters (`.subject()`, `.issuedAt()`, `.expiration()`) and `Jwts.parser().verifyWith(...).build().parseSignedClaims(...).getPayload()`
- Spring Boot 3.x YAML / SnakeYAML 2.x behavior on duplicate top-level keys
- Spring Framework reactive CORS — `org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource`
- Reactor `Context` propagation semantics for `contextWrite`
- Spring Security `ReactiveSecurityContextHolder.withAuthentication(Authentication)` returning a `Context`

## Issues Found
1. **Duplicate top-level `spring:` key in `application.yml`** — The YAML had two separate `spring:` mappings (one for `spring.data.mongodb` and another for `spring.security.oauth2.resourceserver`). Spring Boot 3.x uses SnakeYAML 2.x, which fails on duplicate mapping keys. **Fix:** Merged both blocks under a single top-level `spring:` key.

2. **Missing `java.util.Map` import in `SecurityIntegrationTest`** — The test class used `Map.of("refreshToken", initialAuth.getRefreshToken())` but did not import `java.util.Map`, so the snippet would not compile as written. **Fix:** Added `import java.util.Map;` to the test snippet.

3. **Missing `java.util.Set` import in `UserController`** — The controller declared `@RequestBody Set<String> roles` but did not import `java.util.Set`, so the snippet would not compile. **Fix:** Added `import java.util.Set;` to the controller snippet.

## Review Notes
- JJWT 0.12.3 API usage is correct: the fluent setters (`subject`, `issuedAt`, `expiration`, `claim`, `signWith`) and the new parser API (`Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload()`) match the 0.12.x line. The legacy `setSubject` / `parserBuilder()` style was correctly avoided.
- The reactive JWT filter pattern `chain.filter(exchange).contextWrite(ReactiveSecurityContextHolder.withAuthentication(auth))` is the standard idiom for propagating the security context through the reactive chain.
- `@EnableReactiveMethodSecurity` is still supported in Spring Security 6.x. In newer Spring Security versions, `@EnableMethodSecurity` is the unified replacement and supports reactive return types as well; future revisions could mention this as a forward-looking note.
- The `@PreAuthorize("hasRole('ADMIN') or @userService.isOwner(#id, authentication.name)")` expression depends on the reactive expression handler being able to unwrap a `Mono<Boolean>` returned by the bean method. This is supported under reactive method security but only on a subscribed reactive context — worth being aware of as a subtle constraint.
- The comment "Add JWT filter before the authentication filter" on the `addFilterAt(jwtAuthenticationFilter, SecurityWebFiltersOrder.AUTHENTICATION)` call is slightly imprecise (it adds **at** that position, not before), but the behavior is correct and conventional. Left as-is to preserve author's voice.
- The in-memory `RateLimitFilter` is fine for a demo but explicitly per-instance; for production use with multiple replicas, distributed state (e.g., Redis) is required. The post addresses this implicitly in the "token revocation" best practice.
- CORS sample uses `setAllowCredentials(true)` together with explicit non-wildcard origins, which is the correct combination.
- OAuth2 Resource Server section correctly uses `ReactiveJwtDecoders.fromIssuerLocation(...)` for JWKS-based validation and `ReactiveJwtGrantedAuthoritiesConverterAdapter` to wrap the non-reactive `JwtGrantedAuthoritiesConverter`.
