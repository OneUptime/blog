# Validation Summary: How to Set Up Multiple Websites on One Docker Host with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker user-defined bridge networks
- Nginx reverse proxy configuration
- TLS termination with Nginx
- Certbot / Let's Encrypt webroot validation
- Shell commands for deployment and log inspection

## Sources Consulted
- Docker Docs: Compose file reference, https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Networking in Compose, https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: docker network create CLI reference, https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker compose run CLI reference, https://docs.docker.com/reference/cli/docker/compose/run/
- Nginx Docs: ngx_http_proxy_module, https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx Docs: ngx_http_ssl_module, https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Certbot Docs: User Guide / webroot usage, https://eff-certbot.readthedocs.io/en/stable/using.html
- Local CLI help: docker compose run --help, docker network create --help

## Issues Found
- The architecture diagram listed Site B on port 4000 and Site C on port 8080, but the later Nginx and Compose examples use Site B on port 5000 and Site C on port 80. Updated the diagram to match the actual configuration snippets.
- The Docker Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from the Compose snippets to align with the current Compose Specification.
- The Certbot one-off issuance commands would not run as shown because the Certbot service defines a long-running custom entrypoint for renewal. Added `--entrypoint certbot` to the `docker compose run` commands so the `certonly` command is executed.
- The SSL setup implied that the full HTTPS Nginx configuration could be loaded before certificates existed. Added guidance to apply the HTTP ACME challenge block first, issue certificates, then add the 443 server block and reload Nginx.
- The post described the setup as automatic SSL certificate management, but the shown Certbot container renews certificate files without automatically reloading Nginx. Updated wording to "SSL certificate renewal support" and added a note to reload Nginx after successful renewals.
- The Certbot renewal loop did not explicitly use the webroot path. Updated the renewal command to include `--webroot -w /var/www/certbot` for consistency with the mounted challenge directory.

## Review Notes
The remaining examples are valid for a straightforward Docker Compose and Nginx reverse proxy setup. For production hardening, a future revision could add HSTS, OCSP stapling, safer certificate reload automation, upstream health behavior, and WebSocket-specific proxy headers where needed, but those are enhancements rather than correctness fixes.
