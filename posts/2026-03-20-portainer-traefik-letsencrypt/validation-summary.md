# Validation Summary: How to Set Up Let's Encrypt ACME with Traefik for Portainer - Letsencrypt

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Traefik Proxy
- Let's Encrypt
- ACME HTTP-01 challenge
- Docker Compose
- Portainer CE
- TLS / X.509 certificate verification
- OpenSSL CLI

## Sources Consulted
- Traefik Proxy: Docker Compose with Let's Encrypt HTTP Challenge (v3.4) — https://doc.traefik.io/traefik/v3.4/user-guides/docker-compose/acme-http/
- Traefik Proxy: ACME certificate resolver reference — https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik Proxy: Dashboard documentation — https://doc.traefik.io/traefik/v3.3/operations/dashboard/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose file reference — https://docs.docker.com/reference/compose-file/
- Portainer Documentation: Deploying Portainer behind Traefik Proxy — https://docs.portainer.io/advanced/reverse-proxy/traefik
- Let's Encrypt: Staging Environment — https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt: Rate Limits — https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt: Chains of Trust — https://letsencrypt.org/certificates/
- OpenSSL CLI help output: `openssl s_client -help`
- OpenSSL CLI help output: `openssl x509 -help`

## Issues Found
- The prerequisites listed only port `80` as internet-accessible. Traefik's HTTP challenge guide for this Docker Compose setup requires the host to be publicly reachable on both ports `80` and `443`, so the prerequisite was corrected.
- The Compose example used a top-level `version: "3.8"` field. Docker now documents the `version` element as obsolete and only informative, so it was removed.
- The staging example stored certificates in `/data/acme-staging.json` but did not create that JSON file with the required `600` permissions. A `touch` plus `chmod 600` step was added so the staging example matches Traefik's ACME storage requirements.
- The deploy section claimed certificate issuance takes `~30 seconds` and showed `debug` log output even though the static config sets `log.level: INFO`. The unstable timing claim and log snippet were replaced with a version-safe instruction to watch for ACME-related log entries and errors.
- The certificate verification example hard-coded the issuer as `CN=R11`. Let's Encrypt intermediate issuers vary over time, and `R11` is not a stable expectation now, so the check was updated to verify `O=Let's Encrypt` and note that the intermediate `CN` can vary.
- The Let's Encrypt rate-limit table used looser wording (`Certificates per registered domain`, `Duplicate certificates`) and week-based phrasing. It was updated to the current official limit names and windows: `50 per 7 days` for new certificates per registered domain and `5 per 7 days` for new certificates per exact set of identifiers.
- The conclusion overstated the automation behavior by implying any container behind Traefik automatically receives a certificate. It was narrowed to services explicitly exposed through Traefik.

## Review Notes
- The Portainer backend port `9000` is still correct in this reverse-proxy context. Portainer's current direct-install docs default to `9443` for direct HTTPS exposure, but Portainer's own Traefik reverse-proxy documentation still routes the frontend service to backend port `9000`.
- The Traefik dashboard route in the post is functional, but if it is exposed on the public internet it should be protected with authentication or other access controls. Traefik's dashboard documentation shows examples with auth middleware.
- The image tags are not fully pinned for reproducibility: `traefik:v3.0` is an older v3 minor tag, and `portainer/portainer-ce:latest` is floating. They are technically valid, but using a current pinned tag or Portainer's supported `:sts`/`:lts` stream would reduce drift over time.
