# Validation Summary: How to Use DuckDNS with Portainer for Dynamic DNS - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DuckDNS
- Portainer Community Edition
- Traefik
- Docker Compose / Portainer stacks
- Let's Encrypt ACME DNS-01
- Certbot and `certbot-dns-duckdns`
- Bash, cron, `curl`, `dig`, and `openssl`

## Sources Consulted
- DuckDNS homepage: https://www.duckdns.org/
- DuckDNS API specification: https://www.duckdns.org/spec.jsp
- LinuxServer.io DuckDNS container docs: https://docs.linuxserver.io/images/docker-duckdns/
- Traefik ACME certificate resolver docs: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/tls/certificate-resolvers/acme/
- Portainer reverse proxy with Traefik docs: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer CLI configuration docs: https://docs.portainer.io/sts/advanced/cli
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Certbot user guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- `certbot-dns-duckdns` plugin docs: https://github.com/infinityofspace/certbot_dns_duckdns
- POSIX `crontab` manual: https://man7.org/linux/man-pages/man1/crontab.1p.html

## Issues Found
- The DuckDNS login step said to log in with a Reddit account. DuckDNS has removed Reddit OAuth login, so this was corrected to Google/GitHub/X.
- All three Compose snippets used the top-level `version: '3.8'` field. Docker now documents this field as obsolete, so it was removed from the examples.
- The Portainer routing example used `portainer.yourname.duckdns.org`. DuckDNS manages DuckDNS subnames like `yourname`, not nested service hostnames via its normal update flow, and Traefik requires each routed hostname to have A/AAAA records. The example was corrected to `yourname.duckdns.org`.
- The Portainer Traefik labels set `traefik.http.services.portainer.loadbalancer.server.scheme=https` while also targeting upstream port `9000`. Portainer's Traefik documentation routes to port `9000` without HTTPS at the upstream, so the incorrect scheme label was removed.
- The cron example used `echo ... | crontab -`, which installs a new crontab and can replace an existing one. It was changed to `crontab -e` plus the line to add.
- The router port-forwarding section included port `9443` for direct Portainer access, but the example stack does not publish `9443`. That forwarding entry was removed.
- The testing commands referenced the invalid nested DuckDNS hostname and were updated to use the corrected hostname.

## Review Notes
- The Certbot DuckDNS example is valid, but installation method varies by platform. Certbot's docs recommend checking `certbot.eff.org` for the appropriate package, snap, or Docker-based installation path.
- The Traefik example pins `traefik:v3.0`. The ACME flags used in the post are still valid for Traefik v3, but newer Traefik 3.x tags are available in current documentation.
- If the post is expanded later to cover multiple hostname-based services, it should explicitly explain that DuckDNS setups typically use separate DuckDNS subdomains rather than nested hostnames such as `service.yourname.duckdns.org`, unless additional DNS control is introduced.
