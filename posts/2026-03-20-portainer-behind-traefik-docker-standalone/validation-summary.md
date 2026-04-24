# Validation Summary: How to Set Up Portainer Behind Traefik on Docker Standalone

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Traefik Proxy
- Portainer CE
- Let's Encrypt ACME
- HTTPS / reverse proxying

## Sources Consulted
- Traefik configuration overview: https://doc.traefik.io/traefik/reference/install-configuration/boot-environment/
- Traefik ACME / Let's Encrypt: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik API and dashboard: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik Docker provider and label routing: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/
- Traefik file provider: https://doc.traefik.io/traefik/v3.3/providers/file/
- Traefik HTTP services reference (`passHostHeader`, `serversTransport`): https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik `ServersTransport` reference: https://doc.traefik.io/traefik/v3.4/reference/routing-configuration/http/load-balancing/serverstransport/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy guide for Traefik: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer CE install docs for Docker standalone: https://docs.portainer.io/sts/start/install-ce/server/docker/linux

## Issues Found
- The Traefik static config file was mounted to `/traefik.yml`, but Traefik's documented default file search path is `/etc/traefik/traefik.yml` unless `configFile` is explicitly set. I changed the bind mount to `/etc/traefik/traefik.yml` so the example works as written.
- The ACME storage configuration and deployment commands did not match. The post created `traefik/acme.json` on the host, but the compose file used a named volume instead. I changed the compose file to bind-mount `./traefik/acme.json` and aligned the Traefik storage path with `/acme.json`, matching Traefik's documented Docker usage and the `chmod 600` requirement.
- The HTTPS router labels only set `tls.certresolver` and did not explicitly enable TLS. I added `traefik.http.routers.dashboard.tls=true` and `traefik.http.routers.portainer.tls=true` to match Traefik's documented HTTPS router configuration.
- The Portainer example proxied to port `9443` with `server.scheme=https` but did not handle Portainer's default self-signed backend certificate, which would break proxying unless Traefik trusts that certificate or uses a `ServersTransport`. I changed the main working example to enable Portainer's internal HTTP listener with `--http-enabled` and proxy to port `9000`, which is the simpler and currently documented approach for reverse-proxy setups.
- The `--trusted-origins` value was written as a full URL (`https://portainer.example.com`), but Portainer documents this flag as a comma-separated list of domain names. I changed it to `portainer.example.com`.
- The note claiming `passHostHeader` would "skip certificate verification" was incorrect. I replaced it with an explanation of Traefik's actual requirement: a `ServersTransport` with `insecureSkipVerify: true` or a trusted backend certificate.
- The verification commands did not verify what they claimed. `docker exec traefik traefik version` only prints the Traefik version, and the `curl -v ... | grep "SSL certificate"` example is unreliable. I replaced them with commands that check Traefik's router API, confirm an HTTPS response from Portainer, and inspect the certificate presented on port 443.

## Review Notes
- `traefik:v3.0` is valid for the configuration shown, but it is older than the current Traefik documentation set. In a future refresh, pinning to a newer maintained minor release or image digest would reduce drift.
- The Traefik dashboard is still intentionally exposed in the example. The post already notes this should be protected in production; adding authentication or IP allowlisting would be the next hardening step.
- The local workspace did not have a `docker` binary available, so CLI validation was done against official documentation rather than local `docker --help` output.
