# Validation Summary: How to Run Nginx in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- Docker
- Docker Compose
- Dockerfile
- Docker volumes and networks
- SSL/TLS configuration
- Nginx reverse proxy configuration
- Container health checks and logging

## Sources Consulted
- Docker Official Image for Nginx: https://hub.docker.com/_/nginx
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference, including HEALTHCHECK: https://docs.docker.com/reference/dockerfile/
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Local Docker CLI verification with Docker 29.4.2 and Docker Compose v5.1.3
- Local official image verification for `nginx:1.25` and `nginx:1.25-alpine`

## Issues Found
- The Docker Compose examples used top-level `version: '3.8'`. Docker's current Compose reference marks the top-level `version` property as obsolete and says Compose always validates against the most recent schema regardless of that field. Removed the `version` lines from both Compose examples to avoid obsolete configuration.

## Review Notes
- The official Nginx Docker image documentation confirms static-content mounts, custom configuration mounts, and automatic template processing from `/etc/nginx/templates/*.template` to `/etc/nginx/conf.d`.
- The `http2 on;` syntax is correct for Nginx 1.25.1 and later, matching the referenced `nginx:1.25` image line.
- Local checks confirmed that the pulled `nginx:1.25` image resolves to Nginx 1.25.5 and includes `curl`; `nginx:1.25-alpine` includes both `curl` and `wget` in the tested image.
- The production Compose example uses `deploy.resources`. Docker documents `deploy` as an optional part of the Compose Specification; unsupported implementations may ignore it, but the field is valid Compose syntax.
