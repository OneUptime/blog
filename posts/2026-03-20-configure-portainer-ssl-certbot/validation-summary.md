# Validation Summary: How to Configure Portainer SSL with Certbot

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Certbot (Let's Encrypt ACME client)
- Let's Encrypt (HTTP-01 and DNS-01 challenges)
- Portainer CE (2.x)
- Docker
- Nginx (certbot plugin)
- systemd (timers for auto-renewal)
- OpenSSL (cert inspection)

## Sources Consulted
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot CLI reference: https://eff-certbot.readthedocs.io/en/stable/cli-help.html
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Portainer CE installation docs (Linux/Docker): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer CLI flag reference (source): https://github.com/portainer/portainer (cmd/portainer flags `--ssl`, `--sslcert`, `--sslkey`)
- Certbot renewal hooks: https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates
- Debian/Ubuntu certbot package (provides `certbot.timer`/`certbot.service`)

## Issues Found
1. **Incorrect systemd timer name for apt-installed certbot.** The post installed `python3-certbot-nginx` via `apt-get`, which pulls in the apt `certbot` package. The corresponding systemd unit is `certbot.timer`, not `snap.certbot.renew.timer` (the latter only exists when certbot is installed via snap). I changed the `systemctl status` example to `certbot.timer` and added a commented-out note showing the snap-install variant for users who installed via snap.

## Review Notes
- Certbot CLI flags used (`certonly`, `--standalone`, `--http-01-port`, `--manual`, `--preferred-challenges dns`, `--agree-tos`, `--non-interactive`, `--email`, `-d`, `--nginx`, `renew --dry-run`, `certificates`) are all valid and current.
- Portainer CE 2.x exposes HTTPS on port 9443 by default; the `--ssl`, `--sslcert`, and `--sslkey` flags shown are still accepted by the binary, so the docker run example is correct. Note that `--ssl` is technically optional in 2.x since SSL is enabled by default when cert/key are provided, but including it is harmless.
- The `--manual` DNS-01 flow is interactive by design — the post correctly notes Certbot will prompt the user. For fully automated DNS-01 issuance, users would need a DNS provider plugin (e.g., `certbot-dns-cloudflare`) or `--manual-auth-hook`/`--manual-cleanup-hook`, but that's out of scope for this guide.
- The `/etc/letsencrypt/renewal-hooks/deploy/` directory is the correct location for post-renewal scripts; certbot executes everything in it after a successful renewal.
- The bind-mount `-v /etc/letsencrypt:/letsencrypt:ro` plus referencing `/letsencrypt/live/<domain>/fullchain.pem` works because `/etc/letsencrypt/live/<domain>/` contains symlinks into `/etc/letsencrypt/archive/<domain>/` — both directories are inside the bind-mounted tree, so the symlinks resolve correctly inside the container.
- Stopping `nginx` before the standalone HTTP-01 challenge is correct since both bind to port 80; users running other reverse proxies (Traefik, Caddy, HAProxy) would need to stop those instead.
