# Validation Summary: How to Deploy Traefik via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker networking
- Traefik Proxy v3
- Let's Encrypt ACME
- Cloudflare DNS challenge
- Apache `htpasswd`

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik HTTP TLS overview: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/v3.2/reference/install-configuration/providers/docker/
- Traefik BasicAuth middleware documentation: https://doc.traefik.io/traefik/v3.5/reference/routing-configuration/http/middlewares/basicauth/
- Traefik Docker DNS challenge guide: https://doc.traefik.io/traefik/v3.4/user-guides/docker-compose/acme-dns/
- Docker CLI `network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Apache `htpasswd` reference: https://httpd.apache.org/docs/current/programs/htpasswd.html
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Lego Cloudflare provider documentation: https://go-acme.github.io/lego/dns/cloudflare/index.html

## Issues Found
- The wildcard certificate section implied that enabling `dnschallenge` and setting Cloudflare credentials was sufficient to obtain `*.example.com`. Traefik only requests certificates for domains derived from router `Host()` rules or from explicit `tls.domains` settings. I updated the snippet to include `tls.domains[0].main=example.com` and `tls.domains[0].sans=*.example.com`, which is required for an actual wildcard certificate request.

## Review Notes
- The guide is technically valid for Portainer stacks backed by Docker Standalone / Compose-style deployments, which matches Portainer's stack editor format and the post's use of the Docker provider. A Swarm deployment would require Swarm-specific provider settings and label placement.
- `traefik:v3.0` is an older v3 minor release, but the flags and labels used in the post remain valid in current Traefik v3 documentation.
- The local review environment did not have `docker` or `htpasswd` installed, so command syntax was checked against official documentation rather than local `--help` output.
