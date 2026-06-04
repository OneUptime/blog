# Validation Summary: How to Set Up Docker Registry with Basic Auth and htpasswd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- CNCF Distribution / Docker Registry
- Apache htpasswd
- HTTP Basic Authentication
- TLS certificates with OpenSSL
- Docker credential helpers
- Nginx reverse proxy authentication

## Sources Consulted
- CNCF Distribution registry deployment guide: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution registry configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution Nginx authentication proxy recipe: https://distribution.github.io/distribution/recipes/nginx/
- Docker Compose file reference for top-level version: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker custom registry certificate documentation: https://docs.docker.com/engine/security/certificates/
- Apache HTTP Server `htpasswd` documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Local command verification with Docker 29.4.2, Docker Compose v5.1.3, `httpd:2` htpasswd, and `registry:3`.

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` property. Removed it to match the current Compose Specification behavior.
- The registry examples used `registry:2`. Updated them to `registry:3`, matching current CNCF Distribution deployment examples, and changed the config-file mount path to `/etc/distribution/config.yml`, which is the current image's config location.
- The self-signed certificate command only set the certificate common name. Added a `subjectAltName` extension for `registry.local`, which modern TLS clients require for hostname validation.
- The post said the registry picks up htpasswd changes without restart. Corrected the add/remove/change user commands to restart the registry, because Distribution loads the htpasswd file at startup.
- The Nginx reverse proxy example omitted the `Docker-Distribution-API-Version` response header for `/v2/` responses. Added the header with `always`, following the official Distribution Nginx proxy guidance.
- The htpasswd verification comment said hashed passwords are safe to view. Revised it to state that the file should still be treated as sensitive.
- The Docker credential-storage explanation said `docker login` stores credentials directly in `~/.docker/config.json`. Revised it to account for configured credential stores and helpers.
- Added a note that TLS testing should use the registry hostname and HTTPS URL when the TLS example is enabled.

## Review Notes
The updated Compose snippets were parsed with `docker compose config`. The `registry:3` environment-variable and config-file examples were also started locally; unauthenticated catalog access returned `401`, and authenticated catalog access returned `200` with an empty repository list.
