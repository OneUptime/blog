# Validation Summary: How to Install and Configure Gitea on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Gitea (self-hosted Git service)
- Ubuntu (20.04+)
- Git
- MariaDB / MySQL
- PostgreSQL
- SQLite
- systemd
- Nginx (reverse proxy)
- Let's Encrypt / Certbot
- Gitea Actions (act_runner CI/CD)
- Prometheus metrics

## Sources Consulted
- Gitea — Installation from binary: https://docs.gitea.com/installation/install-from-binary
- Gitea — Command Line reference: https://docs.gitea.com/administration/command-line
- Gitea — Configuration Cheat Sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Gitea downloads (binary + act_runner): https://dl.gitea.com
- Gitea Actions / act_runner documentation: https://docs.gitea.com/usage/actions/act-runner

## Issues Found
- **`gitea doctor` command syntax (Troubleshooting → Database Issues).** The post used `gitea doctor --config /etc/gitea/app.ini`. Current Gitea requires a subcommand under `doctor` (the documented form is `gitea doctor check`). Changed to `sudo -u git gitea doctor check --config /etc/gitea/app.ini` to match the current command-line reference.

## Review Notes
- The installation flow (system user creation with `adduser`, `/var/lib/gitea/{custom,data,log}` layout, ownership/permissions, `/etc/gitea` config dir, and the systemd unit) matches the official "Installation from binary" documentation exactly.
- The download host `dl.gitea.com` and the binary/act_runner URL patterns are correct and current (the older `dl.gitea.io` host is no longer used).
- The health endpoint (`/api/healthz`), Prometheus `[metrics]` section (`/metrics`), `app.ini` keys, database SQL setup, and Nginx reverse-proxy config are all accurate.
- Version caveat: `act_runner` is pinned to `0.2.6` in the example. This is a valid, working pinned version but is not the latest release — readers may want to substitute the current act_runner version. Left as-is since it is not incorrect, only dated.
- The sample `actions/checkout@v3` action works; a newer `@v4` is also available but `@v3` is not deprecated/broken, so it was left unchanged.
