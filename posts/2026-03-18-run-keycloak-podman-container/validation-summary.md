# Validation Summary: How to Run Keycloak in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Keycloak
- Podman
- PostgreSQL
- OAuth 2.0
- OpenID Connect
- Keycloak Admin REST API
- Linux shell commands

## Sources Consulted
- Keycloak container documentation: https://www.keycloak.org/server/containers
- Keycloak database configuration documentation: https://www.keycloak.org/server/db
- Keycloak upgrading guide: https://www.keycloak.org/docs/latest/upgrading/index.html
- Keycloak Admin REST API documentation: https://www.keycloak.org/docs-api/26.5.2/rest-api/
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- PostgreSQL official container image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The post used the deprecated `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD` environment variables. Updated both container examples to use `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD`, which are the current Keycloak bootstrap admin options.
- The PostgreSQL-backed example exposed Keycloak on host port 8081 while the following Admin REST API examples used port 8080. Added removal of the standalone `my-keycloak` container before creating the pod and changed the pod mapping to `8080:8080` so the subsequent commands target the PostgreSQL-backed Keycloak instance.

## Review Notes
- The tutorial intentionally uses `start-dev`, direct access grants, and simple plaintext credentials, which are suitable for development and testing but not production.
- `latest` is convenient for tutorials, but pinning a Keycloak version would make the commands more reproducible in the future.
