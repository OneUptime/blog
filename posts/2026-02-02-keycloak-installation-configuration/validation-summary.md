# Validation Summary: How to Install and Configure Keycloak

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Keycloak (current Quarkus-based distribution, 26.x)
- Docker / Docker Compose
- PostgreSQL
- Kubernetes / Helm (Bitnami chart)
- Keycloak Admin REST API
- Node.js / Express (keycloak-connect)
- Python / FastAPI (python-jose, httpx, OAuth2)
- React (keycloak-js)
- OAuth 2.0 / OpenID Connect / SAML 2.0
- LDAP / Active Directory federation
- Social identity providers (Google, GitHub)

## Sources Consulted
- Keycloak Server Configuration Guide — Bootstrapping and recovering an admin account: https://www.keycloak.org/server/bootstrap-admin-recovery
- Keycloak — Configuring the Management Interface: https://www.keycloak.org/server/management-interface
- Keycloak — Tracking instance status with health checks: https://www.keycloak.org/observability/health
- Keycloak — Configuring a reverse proxy: https://www.keycloak.org/server/reverseproxy
- Keycloak — Configuring the hostname (v2): https://www.keycloak.org/server/hostname
- Keycloak 26.0.0 release notes: https://www.keycloak.org/2024/10/keycloak-2600-released
- Keycloak Upgrading Guide: https://www.keycloak.org/docs/latest/upgrading/index.html
- Keycloak Admin REST API reference: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- keycloak-nodejs-connect deprecation discussion: https://github.com/keycloak/keycloak/discussions/23551
- keycloak-js documentation: https://www.keycloak.org/securing-apps/javascript-adapter
- Bitnami catalog change announcement (Aug 28, 2025): https://github.com/bitnami/charts/issues/35164

## Issues Found

1. **Deprecated `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` env vars.** In Keycloak 26+, these were replaced by `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` (which only create the bootstrap admin on first startup). Updated all three Docker / Docker Compose examples (`docker run`, dev compose, prod compose) to use the new variables.

2. **Health and metrics endpoints exposed on the wrong port.** Since Keycloak 25, `/health`, `/health/ready`, `/health/live`, and `/metrics` are served on the dedicated management interface, which listens on port **9000** by default — not 8080. Updated the URLs in the "Enable Metrics" section to `http://localhost:9000/health` and `http://localhost:9000/metrics`, and added a short note about exposing port 9000 and keeping it off the public proxy (per the official docs).

3. **Deprecated `KC_PROXY=edge`.** The `proxy` option was deprecated in Keycloak 24 and removed in 26. The replacement is `KC_PROXY_HEADERS=xforwarded` (or `forwarded`), which on its own does not enable HTTP — so `KC_HTTP_ENABLED=true` is also required behind a TLS-terminating proxy. Updated the production compose example accordingly.

4. **Production hostname value.** With hostname v2 (default since Keycloak 26), `--hostname` accepts either a hostname or a full URL. Because `KC_HTTP_ENABLED=true` is now set, the scheme is no longer implicit, so changed `KC_HOSTNAME: auth.yourdomain.com` to `KC_HOSTNAME: https://auth.yourdomain.com` to ensure issued URLs use HTTPS.

## Review Notes
- **`keycloak-connect` (Node.js adapter) is deprecated.** The package still functions and the example is correct, but the Keycloak team has marked it deprecated and recommends moving to a generic OIDC client such as `openid-client` or `jose` for new projects. The post was left as-is because the example is technically correct and widely used; this is worth flagging in a future revision.
- **Bitnami Helm chart caveat.** As of August 28, 2025, Bitnami archived most of its public container catalog and stopped publishing new OCI Helm chart releases at `docker.io/bitnamicharts`. The Apache-2 chart source on GitHub is still maintained and the `https://charts.bitnami.com/bitnami` repo still resolves, but readers deploying today should consider the official Keycloak Operator or the codecentric chart as longer-term alternatives. Left in place because the instructions still work; worth a future-revision note.
- **`KC_HOSTNAME_STRICT: false` in dev compose** is fine for local development but should never be carried into production — the post already covers this in the prod example.
- **Hostname v1 options were removed in Keycloak 26.** None of the post's examples use the removed `*-url` suffixes (e.g. `KC_HOSTNAME_URL`), so no v1→v2 migration was needed beyond the `KC_PROXY` change above.
- The Admin REST API payloads (realm, client, user, role, identity provider, LDAP component) were spot-checked against the current API reference and are accurate. The LDAP `userObjectClasses` value being a single comma-separated string inside an array is the correct ComponentModel representation.
- The FastAPI / python-jose JWT verification flow, the keycloak-js `init` options (`check-sso`, `pkceMethod: 'S256'`, `silentCheckSsoRedirectUri`), and the SMTP realm-update payload are all consistent with current docs.
