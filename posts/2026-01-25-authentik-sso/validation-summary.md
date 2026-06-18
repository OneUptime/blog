# Validation Summary: How to Configure Authentik for SSO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Authentik
- Single Sign-On
- OAuth 2.0 and OpenID Connect
- SAML 2.0
- LDAP federation
- Docker Compose
- Kubernetes Helm
- Passport.js
- Grafana generic OAuth
- GitLab OmniAuth OpenID Connect
- Nginx forward authentication
- Prometheus metrics

## Sources Consulted
- Authentik Docker Compose installation: https://docs.goauthentik.io/install-config/install/docker-compose/
- Authentik OAuth2 provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik SAML provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/saml/
- Authentik proxy provider documentation: https://docs.goauthentik.io/add-secure-apps/providers/proxy/
- Authentik nginx forward-auth documentation: https://docs.goauthentik.io/add-secure-apps/providers/proxy/server_nginx/
- Authentik monitoring documentation: https://docs.goauthentik.io/sys-mgmt/ops/monitoring/
- Authentik GitHub repository and license listing: https://github.com/goauthentik/authentik
- GitLab OpenID Connect OmniAuth documentation: https://docs.gitlab.com/administration/auth/oidc/
- Grafana generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/generic-oauth/
- Passport.js authentication middleware documentation: https://www.passportjs.org/concepts/authentication/middleware/
- passport-oauth2 package documentation: https://github.com/jaredhanson/passport-oauth2

## Issues Found
- The Docker Compose image tags used Authentik 2024.1, which is outdated for a 2026-dated guide. Updated the server, worker, and proxy image tags to 2026.5 to match the current Authentik documentation consulted during review.
- The `.env` snippet put shell command substitution directly inside `.env`, which Docker Compose does not evaluate as a shell script. Changed it to shell commands that generate and append `PG_PASS` and `AUTHENTIK_SECRET_KEY`, matching Authentik's documented installation flow.
- The Passport.js example did not initialize Passport and used the default session behavior without configuring sessions. Added `app.use(passport.initialize())` and set `session: false` on the callback authentication call so the minimal example can run as a stateless OAuth callback.
- The GitLab OpenID Connect example used `client_auth_method: "query"`, which is not a supported value in current GitLab documentation. Changed it to `basic`.
- The nginx forward-auth sample omitted the cookie propagation and request-body handling Authentik documents for nginx. Added `auth_request_set`, `Set-Cookie`, `proxy_pass_request_body off`, and `Content-Length` handling, and changed the signin redirect to include the full original URL.
- The proxy outpost nginx example proxied to the HTTPS port. Authentik's nginx forward-auth template uses the outpost HTTP port 9000 for this pattern, so the sample now points to `http://authentik-proxy:9000`.
- The post described Authentik as simply "MIT licensed." Upstream presents multiple licenses, including enterprise licensing, so the bullet now describes Authentik as an open-source identity provider with self-hosted deployment options.
- The Docker Compose example used the legacy `docker-compose` command and a Compose `version` field. Updated the command to current Docker Compose v2 syntax and removed the obsolete version field.
- The custom enrollment flow snippet was labeled as an export format even though it is only a conceptual outline. Changed the label to "Flow outline for reference."

## Review Notes
- The post is a broad integration guide, so many UI labels and values are representative rather than exhaustive. Readers should still verify application-specific redirect URIs, SAML ACS URLs, and group/role claim mappings against the target application's own documentation.
- Authentik's OAuth provider defaults to per-application issuer URLs; the GitLab example correctly uses the application slug in the issuer URL.
