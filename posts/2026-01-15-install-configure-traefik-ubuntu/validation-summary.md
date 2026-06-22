# Validation Summary: How to Install and Configure Traefik on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- Traefik v3 (edge router / reverse proxy / load balancer)
- Ubuntu (systemd, useradd, journalctl)
- Let's Encrypt / ACME (HTTP and TLS challenges)
- Docker provider and Docker Compose
- YAML static and dynamic configuration
- HTTP/TCP/UDP routing and middlewares (basic/digest/forward auth, headers, CORS, rate limit, compress, retry, stripPrefix)
- Prometheus metrics and ping health check

## Sources Consulted
- Traefik CLI reference (no `validate` subcommand exists; only `healthcheck` and `version`): https://doc.traefik.io/traefik/v3.1/operations/cli/ and https://doc.traefik.io/traefik/operations/cli/
- Traefik HTTP retry middleware (`attempts`, `initialInterval`): https://doc.traefik.io/traefik/v3.0/middlewares/http/retry/
- Traefik official systemd unit file (confirms `Type=notify` is correct): https://github.com/traefik/traefik/blob/master/contrib/systemd/traefik.service
- Traefik release assets naming for download URL: https://github.com/traefik/traefik/releases

## Issues Found
- **Invalid CLI command (`traefik validate`)**: In the Troubleshooting > Common Issues section the post used `traefik validate --configFile=/etc/traefik/traefik.yml`. Traefik has no `validate` subcommand — its only CLI commands are the default run, `healthcheck`, and `version`. Running it would fail. Replaced with an accurate approach that restarts the service and inspects the logs for configuration/syntax errors:
  ```bash
  # Service not discovered
  # Traefik has no config-validate command; restart and check logs for syntax errors
  sudo systemctl restart traefik
  sudo journalctl -u traefik -n 50 --no-pager
  ```

## Review Notes
- The download URL (`traefik_v3.0.0_linux_amd64.tar.gz`), extraction, and binary install steps are correct for the Traefik v3.0.0 release archive layout.
- `Type=notify` in the systemd unit is correct — the official Traefik unit file uses `Type=notify`, and the binary supports `sd_notify`.
- Static and dynamic YAML configuration (entryPoints, redirections, certificatesResolvers/ACME, file provider, routers/services/middlewares) matches current Traefik v3 schema.
- Middleware examples (basicAuth, digestAuth, forwardAuth, headers/STS/CORS, rateLimit with `average`/`burst`/`period`, compress `excludedContentTypes`, retry `attempts`/`initialInterval`, stripPrefix) all use valid v3 field names.
- The `digestAuth` example user `admin:traefik:password` is a placeholder illustrating the `name:realm:password` format; a real entry uses an MD5-hashed credential. Left as-is since it is clearly illustrative.
- TCP/UDP routing correctly uses `address` (not `url`) for the load-balancer servers, and HTTP services use `url` — both correct.
- Docker provider config (`endpoint`, `exposedByDefault`) and Compose labels (including the `$$apr1$$` escaping for basic auth in Compose) are valid for v3.
- `docker-compose` `version: '3'` is now an obsolete/ignored key in modern Compose but still works without error.
