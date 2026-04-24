# Validation Summary: How to Configure Traefik TCP Routing for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Traefik Proxy
- Portainer stacks / Docker Compose
- PostgreSQL
- Redis
- MQTT / Eclipse Mosquitto
- TLS / SNI / ACME / Let's Encrypt

## Sources Consulted
- Traefik TCP router reference: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/routing/router/
- Traefik routers documentation, including `HostSNI(\`*\`)` handling and Postgres STARTTLS: https://doc.traefik.io/traefik/v3.3/routing/routers/
- Traefik Docker label reference: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/
- Traefik ACME / Let's Encrypt configuration: https://doc.traefik.io/traefik/v3.3/https/acme/
- PostgreSQL TLS server setup: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL libpq connection parameters, including `sslmode` and SNI behavior: https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL libpq SSL behavior: https://www.postgresql.org/docs/current/libpq-ssl.html
- Redis CLI documentation, including `--tls`: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found
- The post used `traefik.tcp.routers.*.tls.certresolver=letsencrypt` in later examples without defining a `letsencrypt` certificate resolver in the static Traefik configuration. I added a minimal `certificatesResolvers.letsencrypt.acme` example using `/data/acme.json` and the `web` entrypoint for the HTTP challenge so the termination examples are technically complete.
- The Docker Compose port publishing example declared a MySQL TCP entrypoint in `traefik.yml` but did not publish port `3306` in the matching `docker-compose.yml` snippet. I added `3306:3306` so the static and runtime examples are consistent.
- The PostgreSQL TLS passthrough example used `postgres:15-alpine` without enabling PostgreSQL server-side TLS. In Traefik passthrough mode, the backend must terminate TLS itself. I updated the snippet to enable `ssl=on`, configure certificate/key paths, and mount a certificate directory.
- The explanation around `HostSNI(\`*\`)` and PostgreSQL on port `443` was too loose. I clarified that `HostSNI(\`*\`)` is the special non-TLS catch-all rule for TCP routers, and that PostgreSQL on `443` relies on Traefik's Postgres STARTTLS support with `sslmode=require` or stricter on the client side.

## Review Notes
- The post's Traefik label syntax remains valid for Traefik v3, although the example image tag `traefik:v3.0` is older than the current documentation branch reviewed.
- `redis-cli --tls` is correct for the TLS-terminated example; if readers use a private CA instead of a publicly trusted certificate, they may also need `--cacert` or `--cacertdir`.
- For stronger PostgreSQL server identity verification in production, `sslmode=verify-full` with an appropriate trusted CA is preferable once certificate trust is configured.
- No live Traefik or database deployment was executed in this repository; the review was documentation-based and focused on configuration correctness.
