# Validation Summary: How to Set Up Wildcard DNS for Portainer Services - Services

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (container management)
- Traefik v3.0 (reverse proxy)
- Let's Encrypt (ACME / DNS-01 challenge)
- Cloudflare DNS
- Pi-hole / dnsmasq (local DNS)
- Docker / Docker Compose
- Grafana (example container, default port 3000)

## Sources Consulted
- Traefik v3 ACME / Let's Encrypt docs: https://doc.traefik.io/traefik/https/acme/
- Traefik Cloudflare DNS provider env vars (`CF_DNS_API_TOKEN`): https://doc.traefik.io/traefik/https/acme/#providers
- Traefik Docker routing labels: https://doc.traefik.io/traefik/routing/providers/docker/
- dnsmasq `address=` directive (wildcard subdomain syntax): https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Pi-hole custom dnsmasq config conventions (`/etc/dnsmasq.d/`) and `pihole restartdns` command
- Grafana default HTTP port (3000): https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/

## Issues Found
No technical issues found.

Verified specifics:
- Traefik v3.0 is a valid, released image tag.
- `--providers.docker.exposedbydefault=false` and the `--certificatesresolvers.<name>.acme.dnschallenge[.provider]` flags match current Traefik v3 CLI options.
- `CF_DNS_API_TOKEN` is the correct environment variable for Cloudflare scoped API tokens (with Zone:Read and DNS:Edit permissions) used by Traefik/lego.
- The `tls.domains[0].main` / `tls.domains[0].sans` label syntax for requesting a wildcard certificate is correct.
- dnsmasq `address=/.home.lab/192.168.1.100` is valid wildcard syntax; dnsmasq accepts both the leading-dot and dot-less forms, and Pi-hole loads any `*.conf` in `/etc/dnsmasq.d/`.
- `pihole restartdns` is the correct command to reload dnsmasq inside the Pi-hole container.
- Grafana listens on port 3000 by default, matching the `loadbalancer.server.port=3000` label.
- DNS-01 is correctly stated as required for wildcard certificates (HTTP-01 cannot issue wildcards).

## Review Notes
- The Compose `version: "3.8"` key is harmless but ignored by modern Docker Compose v2; it could be removed in a future update without behavioural change.
- The post uses `203.0.113.10` (RFC 5737 TEST-NET-3) for examples, which is appropriate documentation practice.
- In Step 3 the phrase "In your Traefik static config or a dedicated certificate service" is slightly loose — Docker labels must be attached to a service/container, not placed in Traefik's static config — but the provided label block itself is correct and would produce the wildcard cert when applied to a container.
- DNS-01 wildcard issuance for homelab `*.home.lab` won't work via Let's Encrypt (only resolvable public domains are eligible); the post correctly scopes the wildcard cert example to `example.com`.
