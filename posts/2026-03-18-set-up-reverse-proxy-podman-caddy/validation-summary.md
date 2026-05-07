# Validation Summary: How to Set Up a Reverse Proxy with Podman and Caddy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman networking
- Podman Quadlet / systemd user services
- Caddy 2
- Caddyfile reverse proxy configuration
- Caddy automatic HTTPS and admin API
- Linux rootless container port binding

## Sources Consulted
- Caddy reverse_proxy directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy handle_path directive: https://caddyserver.com/docs/caddyfile/directives/handle_path
- Caddy header directive: https://caddyserver.com/docs/caddyfile/directives/header
- Caddy encode directive: https://caddyserver.com/docs/caddyfile/directives/encode
- Caddy admin API documentation: https://caddyserver.com/docs/api
- Caddy command-line documentation: https://caddyserver.com/docs/command-line
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman generate systemd documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman rootless networking documentation: https://podman-docs.xserv.dev/Networking/rootless

## Issues Found
- The prerequisites said Podman 4.0 or later, but the post recommends Quadlet for systemd management. Quadlet is documented in the Podman 4.4 documentation, so the prerequisite was updated to Podman 4.4 or later for readers using the Quadlet example.
- The guide used rootless Quadlet paths while publishing host ports 80 and 443. Rootless Podman generally cannot bind low-numbered ports unless Linux is configured to allow unprivileged low ports, higher host ports are used, or the container is run rootful. Added a prerequisite note to avoid a permission failure.
- The Quadlet example enabled the generated service but did not start it immediately. Changed `systemctl --user enable caddy.service` to `systemctl --user enable --now caddy.service` so the service is both enabled and started.

## Review Notes
- Caddyfile examples were validated with Caddy v2.11.2 using `caddy validate`; all snippets parsed successfully.
- The Caddy admin API example relies on the Caddyfile adapter's generated server name `srv0`, which is typical for the shown configuration but may differ in more complex configurations.
- `X-XSS-Protection` is obsolete in modern browsers, but the header syntax is valid and does not break the example.
