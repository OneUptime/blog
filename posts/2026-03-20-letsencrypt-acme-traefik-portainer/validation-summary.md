# Validation Summary: How to Set Up Let's Encrypt ACME with Traefik and Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Let's Encrypt / ACME
- Traefik Proxy
- Portainer stacks
- Docker Compose
- Docker volumes and bind mounts
- Cloudflare DNS challenge via lego
- TLS / HTTPS

## Sources Consulted
- Traefik ACME documentation: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik API and Dashboard documentation: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/api-dashboard/
- Traefik Docker routing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik Docker getting started guide: https://doc.traefik.io/traefik/v3.5/getting-started/docker/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volumes documentation: https://docs.portainer.io/sts/advanced-topics/relative-paths
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- lego Cloudflare provider documentation: https://go-acme.github.io/lego/dns/cloudflare/

## Issues Found

1. **Overstated certificate issuance behavior**: The post said Traefik requests certificates when a new service is discovered. Updated this to the more accurate behavior: Traefik requests certificates when an HTTPS router is configured with a certificate resolver.

2. **Unused file provider configuration**: The post enabled `providers.file.directory` without mounting or using a dynamic configuration directory. Removed that configuration to avoid an invalid or misleading setup.

3. **Obsolete Compose syntax and outdated Traefik example version**: Removed the top-level `version` field, which is obsolete in modern Compose, and updated the example image from `traefik:v3.0` to `traefik:v3.5` to align with current Traefik documentation.

4. **Invalid relative bind mount for the Portainer workflow described**: The post mounted `./traefik.yml` while instructing readers to deploy from the Portainer stack editor. Replaced that with an absolute host path and clarified that the static configuration file should exist on the Docker host.

5. **Dashboard routing and verification guidance**: Updated the dashboard router rule to the documented `Host(...) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))` form and changed the verification URL to `https://traefik.yourdomain.com/dashboard/`.

6. **`acme.json` permission step conflicted with the named volume example**: Reframed the permission step so it only applies when the Let's Encrypt directory is bind-mounted from the host, and updated the commands to match that host-path scenario.

7. **Incomplete DNS-01 Cloudflare example**: Added the `CF_DNS_API_TOKEN` service environment example so the Cloudflare token is actually passed from Portainer into the Traefik container.

8. **Misleading certificate monitoring advice**: Replaced the claim that Portainer container health checks monitor certificate expiry with a log-based Traefik monitoring recommendation.

## Review Notes
- The post is technically valid after the above fixes.
- The HTTP-to-HTTPS redirect configuration is compatible with the ACME HTTP-01 challenge per Traefik's ACME documentation.
- Wildcard certificate guidance remains correct: Let's Encrypt requires DNS-01 for wildcard certificates.
