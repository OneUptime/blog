# Validation Summary: How to Instrument Spring Security Authentication Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Spring Security servlet filter chain
- Spring Boot security starters
- OpenTelemetry Java agent and manual tracing API
- Java
- JJWT
- JWT authentication and claims validation
- OAuth2 login

## Sources Consulted
- Spring Security session management and security context persistence documentation: https://www.springframework.org/spring-security/reference/6.5/servlet/authentication/session-management.html
- Spring Security request authorization documentation: https://www.springframework.org/spring-security/reference/servlet/authorization/authorize-http-requests.html
- Spring Security AuthorizationManager Javadoc: https://docs.spring.io/spring-security/site/docs/6.5.6/api/org/springframework/security/authorization/AuthorizationManager.html
- Spring Security AccessDecisionManager Javadoc: https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/access/AccessDecisionManager.html
- Spring Security OAuth2 documentation: https://docs.spring.io/spring-security/reference/servlet/oauth2/index.html
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java agent supported libraries documentation: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java agent instrumentation configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- JJWT README and current parser examples: https://github.com/jwtk/jjwt
- JJWT Maven metadata: https://repo.maven.apache.org/maven2/io/jsonwebtoken/jjwt-api/maven-metadata.xml
- OpenTelemetry API Maven metadata: https://repo.maven.apache.org/maven2/io/opentelemetry/opentelemetry-api/maven-metadata.xml
- OpenTelemetry instrumentation annotations Maven metadata: https://repo.maven.apache.org/maven2/io/opentelemetry/instrumentation/opentelemetry-instrumentation-annotations/maven-metadata.xml
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/info/rfc7519/

## Issues Found
- The filter-chain list used `SecurityContextPersistenceFilter` as a typical current filter. Spring Security 6 does not set it by default and deprecates it in favor of `SecurityContextHolderFilter`, so the post now names `SecurityContextHolderFilter`.
- The dependency snippet omitted libraries used later in the post. Added `spring-boot-starter-oauth2-client` for OAuth2 login and JJWT API/runtime dependencies for the custom JWT validator.
- The OpenTelemetry dependency versions were outdated for a 2026 validation pass. Updated `opentelemetry-api` and `opentelemetry-instrumentation-annotations` to current Maven Central releases.
- The authentication provider returned an authenticated token containing the raw password as credentials. Updated the successful token to use `null` credentials.
- The JWT example used older JJWT parsing APIs (`parserBuilder`, `setSigningKey`, `parseClaimsJws`) and a generic `Key`. Updated it to JJWT 0.13 style with `Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload()` and `SecretKey`.
- The JWT example assumed the `roles` claim and `exp` claim were always present. Added null-safe handling so missing optional claims do not cause unintended `NullPointerException`s.
- The authorization example implemented deprecated `AccessDecisionManager`. Replaced it with a current `AuthorizationManager<RequestAuthorizationContext>` implementation and wired it into the `SecurityFilterChain` with `.access(tracedAuthorizationManager)`.
- The OAuth2 success handler used `javax.servlet` imports. Updated them to `jakarta.servlet`, matching Spring Boot 3 / Spring Security 6+.
- The security-considerations example labeled usernames as unconditionally safe telemetry. Clarified that usernames should only be captured when approved, otherwise hashed or redacted.

## Review Notes
The examples remain illustrative and still use custom attribute names rather than a complete semantic convention mapping. Production implementations should review telemetry data classification and sampling policies before capturing user identifiers, roles, emails, issuers, or authorization resources.
