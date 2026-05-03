# Validation Summary: How to Deploy Keycloak via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Keycloak 24.0 (identity & access management)
- Portainer (container management UI)
- Docker Compose (v3.8)
- PostgreSQL 16 (Alpine variant)
- OpenID Connect / OAuth2 / SAML 2.0
- Python `python-jose` library (JWT verification)
- OneUptime HTTP monitor

## Sources Consulted
- Keycloak Server Admin Guide (https://www.keycloak.org/docs/24.0.0/server_admin/)
- Keycloak Container Configuration (https://www.keycloak.org/server/containers)
- Keycloak All Configuration (https://www.keycloak.org/server/all-config) — verified `KC_DB`, `KC_DB_URL`, `KC_HOSTNAME`, `KC_HTTP_ENABLED`, `KC_HEALTH_ENABLED`, `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`
- Keycloak Health Checks docs (https://www.keycloak.org/server/health) — confirmed `/health/ready` requires `KC_HEALTH_ENABLED=true` in Keycloak 24
- Quay.io Keycloak image registry (https://quay.io/repository/keycloak/keycloak) — confirmed `24.0` tag exists
- python-jose documentation (https://python-jose.readthedocs.io/) — verified `jwt.decode` signature
- PostgreSQL official Docker image docs (https://hub.docker.com/_/postgres)

## Issues Found
1. **Missing `KC_HEALTH_ENABLED` environment variable.** The post's Monitoring section instructs readers to add an HTTP monitor pointing at `/health/ready`, but in Keycloak 24 this endpoint returns 404 unless health checks are explicitly enabled with `KC_HEALTH_ENABLED=true`. Added `KC_HEALTH_ENABLED: "true"` to the Keycloak service environment block in the compose file with an inline comment explaining its purpose. This makes the monitoring step actually functional.

## Review Notes
- The `command: start` invocation puts Keycloak in production mode. Combined with `KC_HOSTNAME` set and `KC_HTTP_ENABLED=true`, this is acceptable for a controlled deployment but readers running this in real production should put Keycloak behind a TLS-terminating reverse proxy and consider setting `KC_PROXY_HEADERS` (Keycloak 24 replaced the older `KC_PROXY` setting; both still work in 24.x but `KC_PROXY` is deprecated).
- Keycloak 24 is supported but no longer the latest release; readers consulting this post in the future should be aware that Keycloak 25+ moved health and metrics endpoints to a separate management interface (port 9000 by default), so the `/health/ready` URL on the main HTTP port is specific to Keycloak 24.x and earlier.
- `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` are correct for Keycloak 24; these were renamed to `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` in Keycloak 26.
- The `/health/ready` JSON body is actually `{"status":"UP","checks":[...]}` in Keycloak 24 — the post's `{"status":"UP"}` simplification is fine since the `status` field is what matters for monitoring.
- The "Create Realm" UI flow in the Keycloak 24 admin console is accessed via the realm-selector dropdown at the top-left of the sidebar; the post's wording ("Click Create Realm in the left sidebar") is close enough that readers will find it without confusion.
- The Python JWT verification example is syntactically correct; in real applications readers would typically fetch and cache the JWKS via a library like `python-jose`'s `jwk` module or `PyJWT`'s `PyJWKClient` rather than passing the raw key, but the example is a deliberately minimal illustration.
