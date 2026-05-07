# Validation Summary: How to Automate SSL Certificate Renewal for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Traefik
- Let's Encrypt
- Certbot
- Nginx
- Docker Compose

## Sources Consulted
- Let's Encrypt FAQ: https://letsencrypt.org/ca/docs/faq/
- Traefik ACME / Let's Encrypt docs: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik HTTP TLS router docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Portainer reverse proxy with Traefik docs: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer custom SSL docs: https://docs.portainer.io/advanced/ssl
- Portainer CLI configuration docs: https://docs.portainer.io/advanced/cli
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- The Traefik example only defined a certificate resolver and entrypoints, but did not define a Portainer router that used TLS and referenced the resolver. I added a `portainer` service with the required Traefik labels so the example would actually request and renew a certificate for `portainer.example.com`.
- The introduction said the guide covered two approaches even though the post contained three. I corrected that mismatch and tightened the Let's Encrypt validity wording to match current official docs, which describe 90 days as the default certificate lifetime.
- The Certbot deploy-hook example tried to reload both host-managed Nginx and a Docker-managed Nginx container in the same script. I removed the conflicting container command so the example matches the documented `certbot certonly --nginx` host-Nginx flow.
- The renewal test command used `certbot renew --dry-run`, which does not exercise deploy hooks unless `--run-deploy-hooks` is added. I updated the command accordingly and adjusted the log-check command to query the systemd service and timer units explicitly.
- The Portainer custom certificate example copied files into `/data/certs` and then ran `docker start`, which would not configure Portainer to use those files. I replaced it with Portainer's documented `--sslcert` and `--sslkey` startup pattern using a read-only certificate mount.

## Review Notes
- The examples remain valid, but `traefik:v3.0` is a pinned version example rather than the latest Traefik release line. The configuration itself matches Traefik's v3 ACME documentation.
