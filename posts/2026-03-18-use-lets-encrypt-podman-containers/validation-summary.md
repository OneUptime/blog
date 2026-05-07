# Validation Summary: How to Use Let's Encrypt with Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Let's Encrypt / ACME
- Certbot
- Nginx
- Caddy
- Traefik
- systemd timers
- OpenSSL
- Cloudflare DNS plugin for Certbot

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot DNS Cloudflare plugin documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX command-line parameters: https://nginx.org/en/docs/switches.html
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy `redir` directive documentation: https://caddyserver.com/docs/caddyfile/directives/redir
- Caddy `reverse_proxy` directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Traefik ACME documentation: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik File provider documentation: https://doc.traefik.io/traefik/v3.4/providers/file/
- Traefik HTTP router documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik HTTP service documentation: https://doc.traefik.io/traefik/v3.5/reference/routing-configuration/http/load-balancing/service/
- systemd `loginctl` documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd `systemd.timer` documentation: https://www.freedesktop.org/software/systemd/man/systemd.timer.html

## Issues Found
- The Certbot and Nginx examples used Podman `:Z` bind-mount relabeling on directories shared between multiple containers. I changed the shared certificate and ACME webroot mounts to `:z`, which is the documented mode for shared SELinux labels.
- The renewal instructions used a user-level systemd timer without enabling lingering. I added `loginctl enable-linger "$USER"` so the timer can continue running after logout and across reboots.
- The Caddy section said Caddy automatically gets certificates from Let's Encrypt. I corrected that wording to say Caddy automatically manages publicly trusted certificates, because current Caddy defaults can use Let's Encrypt or ZeroSSL unless an issuer is explicitly pinned.

## Review Notes
- The examples publish ports `80` and `443`. Readers running Podman rootlessly on Linux may still need host-side configuration or rootful execution to bind privileged ports.
- The Caddy example is technically valid for automatic HTTPS, but it does not force Let's Encrypt specifically. Pinning Let's Encrypt would require explicit issuer configuration.
