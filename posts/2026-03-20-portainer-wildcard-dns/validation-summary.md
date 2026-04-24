# Validation Summary: How to Set Up Wildcard DNS for Portainer Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Traefik v3
- Cloudflare DNS
- Cloudflare DNS API
- Let's Encrypt ACME DNS-01
- Docker Compose
- OpenSSL

## Sources Consulted
- Cloudflare DNS API: https://developers.cloudflare.com/api/resources/dns/
- Cloudflare wildcard DNS records: https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Traefik v3.0 ACME / Let's Encrypt: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik entryPoints (default TLS configuration): https://doc.traefik.io/traefik/v3.0/routing/entrypoints/
- Traefik HTTP TLS overview: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Traefik Docker provider: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Cloudflare origin CA wildcard coverage reference: https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/
- OpenSSL local CLI help: `openssl s_client -help`, `openssl x509 -help`

## Issues Found
- The post originally mixed two incompatible certificate management paths: `certbot` was used to obtain and renew a wildcard certificate, while Traefik was separately configured with an ACME certificate resolver. I removed the `certbot` flow and aligned the post on Traefik-managed ACME via DNS-01 so issuance and renewal happen in one place.
- The Traefik stack used `CF_API_TOKEN`, but Traefik's Cloudflare DNS challenge integration expects `CF_DNS_API_TOKEN` for API-token-based auth. I corrected the environment variable in the stack example.
- The ACME storage example used a named volume but did not create `acme.json` or set the required `600` mode. I changed the example to use a persistent `./letsencrypt` bind mount and added the `mkdir`, `touch`, and `chmod 600` preparation commands.
- The service labels claimed the router would automatically use a wildcard certificate, but the original `tls.certresolver` label would have caused Traefik to request certificates from the router rule unless wildcard domains were explicitly configured. I moved the resolver and wildcard domains to the `websecure` entry point's default TLS configuration and removed the per-service TLS resolver labels.
- The renewal section incorrectly instructed readers to configure `certbot` cron or `systemd` renewal even though Traefik was handling ACME. I replaced that with the correct behavior: Traefik renews ACME certificates automatically.
- The DNS section implied the wildcard record could stand in for the `services.example.com` hostname. I clarified that the wildcard record does not cover the bare `services.example.com` name, so a separate record is needed.
- The OpenSSL test command did not send SNI and only printed subject/issuer, which is not a reliable way to confirm wildcard coverage on a shared reverse proxy. I added `-servername` and SAN output so the certificate inspection is meaningful.
- The description and introduction were slightly over-broad for wildcard certificate coverage. I tightened the wording so it refers to service subdomains rather than implying coverage for every possible subdomain depth.

## Review Notes
- The examples are accurate for Traefik's Docker provider on a standalone Docker host. If a reader is using Docker Swarm through Portainer, Traefik should use the Swarm provider and labels belong under `deploy.labels` instead of service-level `labels`.
- The post pins `traefik:v3.0`. The corrected configuration is valid for Traefik v3.0 documentation, but the image tag may be worth refreshing to a newer maintained v3 minor in a future editorial pass.
