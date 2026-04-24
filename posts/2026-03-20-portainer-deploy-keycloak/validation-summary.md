# Validation Summary: How to Deploy Keycloak via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / container stacks
- Keycloak
- PostgreSQL
- OAuth 2.0
- OpenID Connect
- Python
- Flask
- Authlib

## Sources Consulted
- Keycloak Downloads: https://www.keycloak.org/downloads
- Running Keycloak in a container: https://www.keycloak.org/server/containers
- Configuring Keycloak: https://www.keycloak.org/server/configuration
- All configuration: https://www.keycloak.org/server/all-config
- Configuring the database: https://www.keycloak.org/server/db
- Configuring the hostname (v2): https://www.keycloak.org/server/hostname
- Configuring a reverse proxy: https://www.keycloak.org/server/reverseproxy
- Configuring the Management Interface: https://www.keycloak.org/server/management-interface
- Tracking instance status with health checks: https://www.keycloak.org/observability/health
- Keycloak Admin REST API: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Server Developer Guide: https://www.keycloak.org/docs/latest/server_development/index.html
- Securing applications and services with OpenID Connect: https://www.keycloak.org/securing-apps/oidc-layers
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose startup order and `depends_on` health checks: https://docs.docker.com/compose/how-tos/startup-order/
- Authlib Flask Integration: https://docs.authlib.org/en/v1.7.0/oauth2/client/web/flask.html
- Flask session requirements: https://flask.palletsprojects.com/en/2.3.x/api/?highlight=securecookiesessioninterface

## Issues Found
- The post used `quay.io/keycloak/keycloak:24.0`, which was outdated as of the review date. It was updated to `26.6.1`, the current release listed on Keycloak's official downloads page on April 24, 2026.
- The stack used `command: start --optimized` while also relying on build-time options such as `KC_HEALTH_ENABLED`, `KC_METRICS_ENABLED`, and `KC_DB`. This was changed to `command: start`, which matches Keycloak's documented startup behavior for non-prebuilt images.
- The post used `KC_PROXY: edge`, which is part of the deprecated proxy configuration path. It was replaced with `KC_PROXY_HEADERS: xforwarded`, which is the current documented setting.
- The Keycloak healthcheck used `curl` against `http://localhost:8080/health/ready`. This was incorrect for the official image because the image does not include `curl`, and health endpoints are exposed on the management interface on port `9000` by default. The probe was replaced with the Bash TCP healthcheck pattern documented by Keycloak.
- The stack exposed port `8443` even though the example is configured for HTTP behind a reverse proxy. That port mapping was removed to match the documented reverse-proxy setup.
- The introduction described the compose example as already "production-ready". This was softened to reflect the actual requirement for a reverse proxy, strong secrets, and TLS before calling the setup production-suitable.
- The OAuth client setup omitted that a server-side Flask app using `client_secret` must have **Client authentication** enabled and a generated client secret copied from the **Credentials** tab. Those steps were added.
- The Flask/Authlib example omitted `app.secret_key`, which is required because Flask sessions are used during the authorization flow. A placeholder secret key was added.
- The example URLs were inconsistent about whether they were using an internal Docker hostname or the public Keycloak hostname. The Admin API commands were updated to use a host placeholder for direct access, and the Flask OpenID Connect discovery URL was aligned to the public Keycloak hostname.

## Review Notes
- The post is technically relevant and salvageable; it is now accurate after the fixes above.
- `depends_on` with `condition: service_healthy` is valid for Docker Compose and aligns with Portainer's Docker stack workflow, but readers using Docker Swarm should be aware that Compose behavior differs there.
- Placeholder secrets such as `admin_password`, `keycloak_db_password`, and `replace-with-a-random-secret` should be replaced before real deployment.
- This validation was performed against official documentation and API references; the stack was not deployed in this workspace during review.
