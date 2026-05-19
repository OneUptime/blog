# Validation Summary: How to Install Traefik on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Traefik v3.1 (reverse proxy / load balancer)
- Ubuntu Server
- systemd (service management)
- Let's Encrypt / ACME (TLS certificate issuance)
- Docker / docker-compose (alternative install + provider)
- UFW (firewall)
- YAML (static and dynamic configuration)
- bcrypt / htpasswd (basicAuth)

## Sources Consulted
- Traefik static configuration / CLI reference: https://doc.traefik.io/traefik/getting-started/configuration-overview/
- Traefik BasicAuth middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- Traefik releases on GitHub: https://github.com/traefik/traefik/releases
- chmod(1) manual page: https://man7.org/linux/man-pages/man1/chmod.1.html
- systemd.exec(5) for AmbientCapabilities behavior under non-root users
- Let's Encrypt ACME challenge documentation (TLS-ALPN-01 / HTTP-01)

## Issues Found

1. **`chmod 600 /var/lib/traefik` on a directory** — A directory needs the execute bit (`x`) to be entered/traversed by its owner. With `600` (rw- only) the `traefik` user would be unable to read/write files inside it, breaking ACME storage. Changed to `chmod 700` so the owner has full access while still excluding group/other.

2. **`traefik --configFile=... --dry-run`** — Traefik has no `--dry-run` flag. The CLI options mirror the static configuration; there is no built-in config validation/dry-run subcommand. Replaced with the standard practice of starting Traefik with `--log.level=DEBUG` (as the `traefik` user) to surface configuration errors, and kept the log-tailing command for the systemd-managed case.

3. **BasicAuth `$$` escaping in the file provider YAML** — Per Traefik's BasicAuth docs, dollar signs in bcrypt hashes should only be doubled when used inside `docker-compose.yml` (because Compose itself interprets `$`). In a YAML file consumed directly by the file provider, the hash must be used as-is. The example `"admin:$$2y$$12$$..."` would not authenticate. Replaced with the raw form `"admin:$2y$12$..."` and updated the inline comment so readers don't reuse the `sed` escaping outside the docker-compose context.

## Review Notes

- **Traefik version**: The post pins `v3.1.0` (binary) and `traefik:v3.1` (Docker). v3.1.0 (released July 2024) is a valid release and the configuration syntax shown is still correct in current 3.x lines, but readers may want to use a newer 3.x build (3.7.x at time of review) for security fixes. The pinned version was left as written because it is not technically incorrect.
- **`AmbientCapabilities=CAP_NET_BIND_SERVICE` with `NoNewPrivileges=yes`**: This combination is correct — ambient capabilities are inherited from systemd's exec context and are not blocked by `NoNewPrivileges`. No change needed.
- **`useradd -r` group creation**: `useradd -r` creates a matching system group by default on Ubuntu, so the `Group=traefik` reference in the systemd unit resolves correctly without an explicit `groupadd`.
- **`tlsChallenge: {}` syntax**: Verified as the correct way to enable the TLS-ALPN-01 challenge with no further options in Traefik v3 YAML.
- **`accessLog.format: json`** and **`log.level: INFO`**: Both are valid in Traefik v3 (log levels: TRACE/DEBUG/INFO/WARN/ERROR/FATAL/PANIC).
- **Docker provider's `network: traefik-net`**: Valid in v3; it sets the default network used to reach containers when multiple networks are attached.
- **Certificate renewal claim ("about 30 days before expiry")**: Matches Traefik's documented ACME renewal window for the default 90-day Let's Encrypt certificates.
