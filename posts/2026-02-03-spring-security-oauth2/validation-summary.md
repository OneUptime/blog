# Validation Summary: How to Implement OAuth2 with Spring Security

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Spring Security
- Spring Boot
- OAuth 2.0
- OpenID Connect
- JWT
- Spring Authorization Server
- Google OAuth/OIDC login
- GitHub OAuth login
- Java
- Maven
- YAML configuration
- Spring Security Test / MockMvc

## Sources Consulted
- Spring Security Reference: OAuth 2.0 Login core configuration - https://docs.spring.io/spring-security/reference/servlet/oauth2/login/core.html
- Spring Security Reference: OAuth 2.0 Login advanced configuration and generated login page - https://docs.enterprise.spring.io/spring-security/reference/servlet/oauth2/login/advanced.html
- Spring Security Reference: OAuth 2.0 Resource Server JWT - https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html
- Spring Security Reference: OAuth 2.0 Client authorization grants and refresh token client - https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorization-grants.html
- Spring Security Reference: Testing OAuth 2.0 with MockMvc - https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/oauth2.html
- Spring Authorization Server Reference: Custom claims in JWT access tokens - https://docs.spring.io/spring-authorization-server/reference/guides/how-to-custom-claims-authorities.html
- GitHub Docs: REST API endpoints for users - https://docs.github.com/en/rest/users/users
- GitHub Docs: REST API endpoints for emails - https://docs.github.com/en/rest/users/emails
- RFC 6749: The OAuth 2.0 Authorization Framework - https://www.rfc-editor.org/rfc/rfc6749

## Issues Found
- Corrected the opening explanation to distinguish OAuth 2.0 authorization from OpenID Connect authentication and identity tokens.
- Corrected the GitHub provider explanation. Spring Security includes GitHub in `CommonOAuth2Provider`, so explicit endpoints are optional customization rather than required setup.
- Fixed the OAuth2 login configuration. Calling `.loginPage("/login")` requires the application to provide that page; Spring Security only generates the default provider-link login page when no custom login page is configured.
- Added a GitHub email caveat. GitHub's `/user` response can return `email: null`; production applications that require email should use the `/user/emails` endpoint with the `user:email` scope.
- Updated the custom user service example to fail explicitly when no email is available instead of persisting or looking up a user with a null email.
- Corrected the JWT validation diagram to show fetching JWKs/metadata rather than implying every JWT is validated by a live authorization-server call.
- Fixed the custom `JwtDecoder` example by injecting `issuerUri` and relying on Spring's default issuer/timestamp validators before the custom validator.
- Corrected role claim handling. The access-token customizer now stores role names without the `ROLE_` prefix because the resource server converter adds that prefix when building authorities.
- Corrected the Spring Authorization Server ID token customization example. Spring Authorization Server should have a single `OAuth2TokenCustomizer<JwtEncodingContext>` bean, so ID-token customization logic should be combined with the access-token customizer.
- Updated refresh-token handling to use the current `RestClientRefreshTokenTokenResponseClient` and preserve the existing refresh token when the token endpoint does not return a replacement.
- Updated JWT MockMvc test claims from `ROLE_USER` to `USER` to match the configured `JwtGrantedAuthoritiesConverter` prefix behavior.

## Review Notes
The examples still omit imports, entity definitions, repositories, and controller details, which is normal for a blog tutorial. Future improvements could show a complete GitHub `/user/emails` lookup implementation and mention that `OAuth2AuthorizedClientManager` is the preferred high-level abstraction for automatic re-authorization in client-side API calls.
