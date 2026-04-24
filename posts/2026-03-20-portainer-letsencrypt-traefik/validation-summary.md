# Validation Summary: How to Configure Portainer with Let's Encrypt via Traefik

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Traefik Proxy
- Let's Encrypt / ACME
- Cloudflare DNS API

## Sources Consulted
- Traefik v3.1 Docker Compose HTTP challenge guide: https://doc.traefik.io/traefik/v3.1/user-guides/docker-compose/acme-http/
- Traefik v3.2 ACME certificate resolvers reference: https://doc.traefik.io/traefik/v3.2/reference/install-configuration/tls/certificate-resolvers/acme/
- Portainer reverse proxy with Traefik guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
- lego Cloudflare DNS provider documentation: https://go-acme.github.io/lego/dns/cloudflare/index.html

## Issues Found
- The HTTP-01 example mounted `/letsencrypt` as a named volume, but the deployment commands created `letsencrypt/acme.json` on the host. I changed the Traefik volume to `./letsencrypt:/letsencrypt` and removed the unused named volume so the commands and Compose snippet match.
- The Compose example used the top-level `version` field. Docker Compose now treats that field as obsolete, so I removed it to align the post with the current Compose specification.
- The Cloudflare DNS-01 note said the token only needed DNS edit permissions. I corrected it to `Zone:Read` plus `DNS:Edit`, which matches the current provider requirements for a single API token.
- The Let's Encrypt troubleshooting note said the rate limit was "5 failed attempts per hour per domain". I corrected this to the current documented limit: up to 5 authorization failures per identifier, per account, every hour.
- The DNS propagation troubleshooting note used only `dnsChallenge.delayBeforeCheck=30`, which is not a complete Traefik CLI flag. I replaced it with the full resolver-specific CLI flag used by the post's Cloudflare example.
- I clarified the `acme.json` permissions note so it matches the bind-mounted file setup described in the corrected example.

## Review Notes
- The Traefik flags and Portainer configuration shown in the post remain valid for the versions referenced.
- `traefik:v3.0` is an older Traefik minor release, but the ACME options used here are still valid in current Traefik v3 documentation.
- Docker was not installed in this workspace, so I could not run the stack locally. I did verify that all YAML blocks in the post parse successfully after the edits.
