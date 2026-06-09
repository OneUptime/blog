# Validation Summary: How to Use Keycloak with Spring Boot

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Keycloak (24+ / 26+) — identity and access management
- Spring Boot 3.2.0
- Spring Security 6.x (OAuth2 Resource Server, OAuth2 Client)
- Java 17
- JWT / OAuth2 / OpenID Connect
- Maven (build system)
- Docker (running Keycloak locally)
- Testcontainers (`dasniko.testcontainers.keycloak.KeycloakContainer`)
- JUnit 5, MockMvc, AssertJ

## Sources Consulted
- Spring Security 6.x reference docs (OAuth2 Resource Server, JWT, Method Security): https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- Spring Security `NimbusJwtDecoder.JwkSetUriJwtDecoderBuilder` source — confirmed `.cache(Cache)` takes a Spring `Cache`, not a `Duration`
- Spring Security `HeadersConfigurer.XXssConfig` — confirmed only `headerValue(...)`, `disable()`, and `and()` exist; no `enable()` method
- Spring Security `JwtValidators.createDefaultWithIssuer(String)` and `JwtTimestampValidator(Duration)` signatures
- Keycloak server admin docs and Docker container env-var docs: https://www.keycloak.org/server/containers
- Keycloak 26.0 release notes — `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` deprecated in favor of `KC_BOOTSTRAP_ADMIN_USERNAME`/`KC_BOOTSTRAP_ADMIN_PASSWORD`
- Keycloak Admin REST API documentation (token endpoint paths, `/admin/realms/{realm}/users`, role mappings)
- Keycloak JWT structure (`realm_access.roles`, `resource_access.<client-id>.roles`, `azp`)

## Issues Found

1. **`NimbusJwtDecoder.cache(Duration.ofMinutes(5))` does not compile.** The builder's `.cache()` method takes a Spring `org.springframework.cache.Cache` instance, not a `java.time.Duration`. Fixed by replacing the call with `.cache(new ConcurrentMapCache("jwk-set"))`, which matches the actual API. The original `// Cache JWK Set for 5 minutes` comment was also misleading because the Spring `Cache` abstraction does not natively express a TTL — updated the comment accordingly.

2. **`xss -> xss.enable()` does not exist in Spring Security 6.x.** `HeadersConfigurer.XXssConfig` exposes only `headerValue(XXssProtectionHeaderWriter.HeaderValue)`, `disable()`, and `and()`. Replaced with `xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)`, which is the canonical way to enable X-XSS-Protection in 6.x.

3. **Missing `java.util.Map` and `java.util.List` imports in `ControllerSecurityTest`.** The test methods use `Map.of(...)` and `List.of(...)` but only the Spring/JUnit imports were declared, so the file would fail to compile. Added `import java.util.List;` and `import java.util.Map;` and removed the unused `WithMockUser` import.

4. **Deprecated Keycloak admin bootstrap env vars in the Docker command.** Keycloak 26 (October 2024) deprecated `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` in favor of `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`. Since the post is dated 2026 and pulls `quay.io/keycloak/keycloak:latest`, updated the env vars to the supported names. The old names still work but emit deprecation warnings on boot.

## Review Notes

- The Spring Security configuration class uses the Spring Security 6.x lambda-style DSL (`csrf(...)`, `authorizeHttpRequests(...)`, `requestMatchers(...)`, `oauth2ResourceServer(...)`), which is correct for Spring Boot 3.2.0.
- The Keycloak JWT structure (`realm_access.roles`, `resource_access.<client-id>.roles`) and the fallback to the `azp` claim in `AudienceValidator` are accurate — Keycloak does not always populate `aud` with the client ID, so checking `azp` is a well-known workaround.
- `@AuthenticationPrincipal Jwt jwt` correctly resolves because `JwtAuthenticationToken#getPrincipal()` returns the `Jwt`.
- `JwtValidators.createDefaultWithIssuer(...)` and `JwtTimestampValidator(Duration)` are valid Spring Security 6.x APIs.
- `getUserData` is annotated `@PreAuthorize("hasRole('user')")` while the URL matcher `/api/user/**` allows `hasAnyRole("user", "admin")`. This is technically valid Spring Security but means admins would be blocked from `/api/user/data` despite matching the URL pattern — a design inconsistency worth flagging if the author refreshes the post, but not a correctness bug.
- `@PreAuthorize("hasRole('admin') and #jwt.subject == authentication.name")` on `getConfig` is mostly a no-op because, by default, `JwtAuthenticationToken#getName()` returns the JWT subject. Functional but redundant.
- The "Error Handling" section presents two top-level `@Component` classes in a single code block; they are package-private so this technically compiles as one file, but conventional practice is to place each `@Component` in its own `.java` file. Not a defect.
- `KeycloakAdminService` uses `admin-cli` as a default `client-id` for `client_credentials` grant. By default, `admin-cli` is a public client and cannot use `client_credentials`; readers will need to either enable client authentication on `admin-cli` (with a service account and `realm-management` role mappings) or create a dedicated service-account client. Not strictly wrong, but worth a future-edit callout.
- `restTemplate.exchange(usersUrl, HttpMethod.GET, request, List.class)` uses a raw `List.class` which produces unchecked-conversion warnings; this is suppressed where appropriate, so it compiles cleanly.
- The X-XSS-Protection header itself is deprecated by modern browsers (Chrome removed it). Setting it to `ENABLED_MODE_BLOCK` is the historically recommended hardening but offers little practical value today. Left intact to preserve author intent after fixing the API call.
