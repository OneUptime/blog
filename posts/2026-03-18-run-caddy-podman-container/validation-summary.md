# Validation Summary: How to Run Caddy in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Caddy 2
- Caddyfile configuration
- Container volume mounts
- Static file serving
- Reverse proxying
- Automatic HTTPS / managed TLS

## Sources Consulted
- Caddy official Docker image documentation: https://hub.docker.com/_/caddy
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy HTTPS quick-start: https://caddyserver.com/docs/quick-starts/https
- Caddy Admin API documentation: https://caddyserver.com/docs/api
- Caddy reverse_proxy directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy command-line documentation: https://caddyserver.com/docs/command-line
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman run documentation for host.containers.internal behavior: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html

## Issues Found
- The post implied that the shown local `:80` examples provided automatic HTTPS. Caddy only applies automatic HTTPS when a qualifying host name is configured and the needed ports are externally reachable or forwarded. Updated the introduction, static HTML example, Caddyfile comment, and persistent data section to make this distinction clear.
- The basic and persistent examples published container port 443 even though the shown Caddyfiles only listen on port 80. Removed those unused HTTPS port mappings from the HTTP-only examples.
- The examples mounted single Caddyfile paths directly at `/etc/caddy/Caddyfile`. The official Caddy image documentation warns against mounting the Caddyfile directly for reload workflows, so the examples now mount configuration directories at `/etc/caddy`.
- The reverse proxy example wrote `Caddyfile-proxy` and mounted it as a single file. Updated it to create a dedicated `~/caddy-proxy-config/Caddyfile` directory mount.
- The Caddyfile snippets were syntactically valid but not in canonical `caddy fmt` formatting. Updated indentation to match current `caddy fmt` output.

## Review Notes
- The `X-XSS-Protection` response header is obsolete in modern browsers. It is still syntactically valid in Caddy, but a future hardening-focused revision could replace it with more current policy headers.
- Local validation was performed with the current official `caddy:2` container image because Podman and a host Caddy binary were not installed in the workspace.
