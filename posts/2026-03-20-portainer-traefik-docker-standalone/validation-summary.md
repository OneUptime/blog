# Validation Summary: How to Deploy Portainer and Traefik Together on Docker Standalone

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Docker Compose
- Traefik Proxy
- Portainer CE
- Let's Encrypt / ACME
- Reverse proxy / HTTPS

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik dashboard documentation: https://doc.traefik.io/traefik/v3.3/operations/dashboard/
- Traefik Docker provider routing documentation: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/
- Traefik ACME / Let's Encrypt documentation: https://doc.traefik.io/traefik/v3.3/https/acme/
- Portainer documentation, Deploying Portainer behind Traefik Proxy: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Docker documentation, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation, Compose networking: https://docs.docker.com/compose/how-tos/networking/

## Issues Found
- Removed the obsolete top-level `version` field from the Compose example. Docker Compose now uses the Compose Specification and treats `version` as obsolete.
- Removed `traefik.http.services.portainer.loadbalancer.server.scheme=https` from the Portainer service. Portainer's official Traefik standalone example routes the UI to container port `9000` without forcing HTTPS on the backend, so the original `port=9000` plus `scheme=https` combination was incorrect.
- Corrected the dashboard verification URL to `https://traefik.example.com/dashboard/`. Traefik serves the dashboard under `/dashboard/`, and the trailing slash is mandatory.
- Corrected the Step 7 explanation so it attributes label discovery and routing to Traefik's Docker provider rather than Portainer.

## Review Notes
- Placeholder values such as `example.com`, `admin@example.com`, and the Basic Auth hash still need to be replaced before deployment.
- The Portainer image uses the floating `latest` tag. This is valid, but pinning to a supported `sts` or `lts` tag would make the guide more reproducible.
