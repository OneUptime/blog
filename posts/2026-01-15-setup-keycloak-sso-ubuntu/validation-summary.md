# Validation Summary: How to Set Up Keycloak for Single Sign-On (SSO) on Ubuntu

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu
- Keycloak
- OpenID Connect
- SAML 2.0
- Docker Compose
- PostgreSQL
- Nginx
- HAProxy
- LDAP / Active Directory federation
- Node.js / Express
- systemd
- OneUptime monitoring

## Sources Consulted
- Keycloak downloads: https://www.keycloak.org/downloads
- Keycloak 26.6.3 release announcement: https://www.keycloak.org/2026/06/keycloak-2663-released
- Keycloak server all configuration reference: https://www.keycloak.org/server/all-config
- Keycloak bootstrapping and recovering an admin account: https://www.keycloak.org/server/bootstrap-admin-recovery
- Keycloak reverse proxy guide: https://www.keycloak.org/server/reverseproxy
- Keycloak health checks guide: https://www.keycloak.org/observability/health
- Keycloak container guide: https://www.keycloak.org/server/containers
- Keycloak adapter deprecation update: https://www.keycloak.org/2023/03/adapter-deprecation-update
- Keycloak Node.js adapter documentation: https://www.keycloak.org/securing-apps/nodejs-adapter
- PostgreSQL Ubuntu package conventions were checked against Ubuntu repository behavior and PostgreSQL cluster tooling.

## Issues Found
- Updated Keycloak version references from `24.0.1` to `26.6.3`, the current release available from Keycloak at review time.
- Replaced legacy `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` examples with current `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` configuration.
- Corrected bootstrap-admin CLI usage to use `--password:env`, matching Keycloak's documented command form.
- Replaced deprecated `proxy=edge` / `KC_PROXY=edge` examples with `proxy-headers=xforwarded` / `KC_PROXY_HEADERS=xforwarded`.
- Corrected health check URLs from port `8080` to the default management port `9000`, including Docker port exposure, restore readiness checks, Nginx proxying, and HAProxy health checks.
- Changed the Docker Compose workflow from `docker compose build` and `start --optimized` to `docker compose pull` and `start`, because the Compose file uses the stock image and does not define an optimized build stage.
- Removed incorrect `db-schema=update`; in Keycloak this option selects a database schema name, not a migration mode.
- Replaced hard-coded PostgreSQL 15 package names and config paths with Ubuntu default PostgreSQL packages and detected cluster version paths.
- Removed invalid/deprecated HTTPS and management settings such as `hostname-strict-https`, `https-port=-1`, and the commented `http-management-interface` example.
- Added required certificate file options to the direct HTTPS Keycloak config snippet.
- Updated HA clustering guidance to rely on Keycloak's current default `jdbc-ping` cache discovery instead of a custom deprecated TCP stack XML.
- Corrected HAProxy sticky-session configuration so it sticks on Keycloak's existing `AUTH_SESSION_ID` cookie instead of inserting a conflicting cookie with the same name.
- Added a deprecation note for `keycloak-connect`, advising new Node.js applications to use generic maintained OIDC integrations.
- Changed the public OneUptime sample check to use the OIDC discovery endpoint instead of exposing Keycloak management health endpoints publicly.

## Review Notes
The post remains broad and production deployments should still tune memory, database sizing, TLS, admin exposure, and clustering for the target environment. The Node.js adapter example is retained as a compatibility example, but future revisions should replace it with a fully maintained generic OIDC library example.
