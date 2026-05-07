# Validation Summary: How to Run Traefik in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Traefik v3.0
- Containers
- Reverse proxy routing
- TLS with self-signed certificates
- Traefik file provider
- Traefik dashboard and API
- Traefik HTTP routers, services, and middleware

## Sources Consulted
- Traefik v3.0 API documentation: https://doc.traefik.io/traefik/v3.0/operations/api/
- Traefik v3.0 CLI static configuration reference: https://doc.traefik.io/traefik/v3.0/reference/static-configuration/cli/
- Traefik v3.0 file static configuration reference: https://doc.traefik.io/traefik/v3.0/reference/static-configuration/file/
- Traefik v3.0 routers documentation: https://doc.traefik.io/traefik/v3.0/routing/routers/
- Traefik v3.0 services documentation: https://doc.traefik.io/traefik/v3.0/routing/services/
- Traefik v3.0 TLS documentation: https://doc.traefik.io/traefik/v3.0/https/tls/
- Traefik v3.0 RateLimit middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/ratelimit/
- Traefik v3.0 Headers middleware documentation: https://doc.traefik.io/traefik/v3.0/middlewares/http/headers/
- Traefik v3.0 installation documentation: https://doc.traefik.io/traefik/v3.0/getting-started/install-traefik/
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- SUSE rootless Podman documentation: https://documentation.suse.com/en-us/smart/container/html/rootless-podman/rootless-podman.html

## Issues Found
- The image pull comment said "latest" while the command pins `traefik:v3.0`. Updated the wording to describe the pinned v3.0 image.
- The `podman run` examples used the short image name `traefik:v3.0`. Updated them to `docker.io/library/traefik:v3.0` to match the fully qualified image pulled earlier and avoid Podman short-name ambiguity.
- The examples described rootless Podman but published host ports `80` and `443`. Rootless Podman cannot normally bind ports below 1024 without changing host sysctl settings, so the host mappings were changed to `8081:80` and `8443:443`, and the test URLs were updated accordingly.
- The static configuration wrote access logs to `/var/log/traefik/access.log` without creating or mounting that directory. Changed `accessLog` to `{}` so access logging is enabled without relying on an unavailable path.
- The HTTPS test used `https://localhost` but the dynamic routing configuration only routed `app.localhost` on the `web` entry point. Added an HTTPS router on `websecure` with `tls: {}` and updated the test command to send the `Host: app.localhost` header to `https://localhost:8443`.

## Review Notes
The use of `api.insecure=true` is technically valid for local testing and matches the post's examples, but Traefik's official documentation recommends securing the API and dashboard in production. The TLS example uses a self-signed certificate and `curl -k`, which is appropriate for testing only.
