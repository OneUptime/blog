# Validation Summary: How to Implement OAuth2 Resource Server in Spring Boot

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Spring Boot (Spring Security 6.x)
- Spring Security OAuth2 Resource Server (`spring-boot-starter-oauth2-resource-server`)
- JWT (RFC 7519) — Nimbus JWT decoders, JWK set / OIDC discovery
- Opaque tokens / token introspection (RFC 7662)
- Maven and Gradle build configuration
- Keycloak, Auth0, and Okta as authorization servers
- JUnit 5 + `spring-security-test` (`SecurityMockMvcRequestPostProcessors.jwt()`)
- Mermaid diagrams (illustrative only)

## Sources Consulted
- Spring Security Reference — OAuth2 Resource Server: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html
- Spring Security Reference — Authorize HttpRequests: https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Spring Security Reference — Opaque Token: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/opaque-token.html
- Spring Security Reference — JWT: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Spring Security Reference — Method Security (`@EnableMethodSecurity`, `@PreAuthorize`)
- OAuth 2.0 RFC 6749, JWT RFC 7519, OAuth 2.0 Token Introspection RFC 7662
- Auth0 / Keycloak audience and `realm_access.roles` claim conventions

## Issues Found

1. **Invalid `AuthorizationManager.and()` chaining (would not compile).** The example combined two managers with `hasScope("reports:read").and(hasScope("analytics:access"))`. `AuthorizationManager<T>` has no `and()` method; the documented way to compose managers is `AuthorizationManagers.allOf(...)` / `anyOf(...)`. Replaced with `AuthorizationManagers.allOf(hasScope("reports:read"), hasScope("analytics:access"))`.

2. **`requestMatchers` ordering shadowed the method-specific rules.** The snippet had:
   ```
   .requestMatchers("/api/users/**").hasAuthority("SCOPE_users:read")
   .requestMatchers(HttpMethod.POST, "/api/users/**").hasAuthority("SCOPE_users:write")
   .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasAuthority("SCOPE_users:delete")
   ```
   `AuthorizationFilter` applies only the first match, so POST and DELETE requests would be evaluated against `SCOPE_users:read` and the `users:write` / `users:delete` rules would never fire. Reordered method-specific matchers before the GET catch-all and added a short comment noting first-match semantics.

3. **`NimbusOpaqueTokenIntrospector` is deprecated.** Current Spring Security recommends `SpringOpaqueTokenIntrospector` (same constructor signature: introspection URI, client id, client secret). Updated the import and the `new ...` call in the `OpaqueTokenConfig` example.

4. **Misleading comment about `#oauth2.hasScope()`.** The Javadoc on `listUsers()` claimed `#oauth2.hasScope()` was used, but the annotation is `@PreAuthorize("hasAuthority('SCOPE_users:read')")`. Updated the comment to accurately describe how `JwtGrantedAuthoritiesConverter` maps the `scope` claim to `SCOPE_*` authorities checked via `hasAuthority`.

## Review Notes

- The redundant `new JwtTimestampValidator()` added on top of `JwtValidators.createDefaultWithIssuer(issuerUri)` is harmless (the default validator chain already includes timestamp validation), so it was left as-is — it does not break the post and shows the validator class for readers.
- The Auth0 YAML uses `audiences: https://api.example.com` (a single scalar). Spring Boot's relaxed binding accepts a scalar for `List<String>`, so this works in practice; using list syntax (`audiences:\n  - https://api.example.com`) would be slightly more idiomatic.
- The custom `AuthenticationEntryPoint` / `AccessDeniedHandler` examples call `.commence(...)` / `.handle(...)` on the default Bearer handlers and then write a JSON body afterwards. In production this can race with response commit; readers should be aware but the pattern is illustrative and reasonable.
- Several code snippets omit imports for brevity (`HttpMethod`, `AuthorizationManager`, `RequestAuthorizationContext`, `AuthorizationDecision`, `AuthorizationManagers`, `Customizer`, `SimpleGrantedAuthority` in the test). This is typical for blog snippets and not a correctness issue.
- The `(List<String>) realmAccess.get("roles")` unchecked casts inside the Keycloak / scope converters are normal Spring-Security-style code and are guarded by null checks; they work against real Keycloak tokens whose `realm_access.roles` is a JSON array.
- `JwtDecoders.fromIssuerLocation` (used in the generic and tenant-aware examples) and `JwtDecoders.fromOidcIssuerLocation` (Auth0 example) are both valid; the former supports OAuth2 Authorization Server metadata as well as OIDC discovery, the latter is OIDC-only — the post's usage is consistent with each provider's discovery support.
