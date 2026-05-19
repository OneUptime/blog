# Validation Summary: How to Install Mattermost (Self-Hosted Slack Alternative) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Mattermost (Team Edition) self-hosted messaging platform
- Ubuntu 22.04 / 24.04
- PostgreSQL (14+)
- Nginx (reverse proxy, SSL/TLS termination, WebSocket upgrade)
- Let's Encrypt / certbot
- systemd (service unit, sd_notify Type=notify)
- Bash / shell scripting (backup, cron)
- Mattermost CLI (user create command)
- Mattermost Incoming Webhooks / curl

## Sources Consulted
- Mattermost installation documentation: https://docs.mattermost.com/install/install-tar.html
- Mattermost Nginx configuration reference: https://docs.mattermost.com/install/install-nginx.html
- Mattermost releases page URL pattern: https://releases.mattermost.com/
- Mattermost desktop app docs: https://docs.mattermost.com/install/desktop-app-install.html
- Mattermost configuration settings reference: https://docs.mattermost.com/configure/configuration-settings.html
- PostgreSQL pg_hba.conf default behavior on Ubuntu (peer auth on local socket)
- PostgreSQL 15+ public schema permission changes (https://www.postgresql.org/docs/15/ddl-schemas.html)
- Mattermost desktop release naming: https://github.com/mattermost/desktop/releases

## Issues Found

1. **Mattermost binary download URL was for Enterprise Edition, not Team Edition.**
   The post advertises installing Mattermost Team Edition (free / open-source), but the URL `mattermost-${MATTERMOST_VERSION}-linux-amd64.tar.gz` actually downloads the Enterprise Edition build. The Team Edition tarball uses the `mattermost-team-` prefix per Mattermost's official install docs. Updated the download command (and the corresponding extract command, plus the update section) to use `mattermost-team-${VERSION}-linux-amd64.tar.gz`.

2. **PostgreSQL verification command would fail under default peer authentication.**
   The original command `sudo -u postgres psql -U mmuser -d mattermost -c "SELECT version();"` runs psql as OS user `postgres` but tries to authenticate as DB role `mmuser` over the local Unix socket. Ubuntu's default `pg_hba.conf` uses `local all all peer`, which requires the OS user and DB user names to match — so this command would be rejected. Replaced with a TCP connection that exercises password authentication: `PGPASSWORD='strong-password-here' psql -h 127.0.0.1 -U mmuser -d mattermost -c "SELECT version();"`.

3. **Mattermost desktop wget URL pointed to a non-existent `/latest/` path with an incorrect filename.**
   `https://releases.mattermost.com/desktop/latest/mattermost-desktop-linux-x64.AppImage` is not a valid URL — Mattermost desktop releases are versioned (e.g., `/desktop/5.7.0/...`) with no `latest` alias, and the actual AppImage filenames include the version and use `x86_64` (not `x64`). Replaced with a versioned `DESKTOP_VERSION` variable and the correct filename pattern (`mattermost-desktop-${DESKTOP_VERSION}-linux-x86_64.AppImage`), and replaced the unrelated `apt install -y mattermost-desktop` (no official upstream apt repository exists) with the correct approach of installing the official `.deb` package directly.

## Review Notes

- **Mattermost binary CLI deprecation.** The `mattermost user create` command used to create the first admin still works in 9.x but is officially deprecated in favor of `mmctl`. Left as-is since (a) it functions correctly in the installed version, (b) the post offers the web-UI alternative immediately after, and the deprecation does not affect correctness.
- **Mattermost 9.4.0 version pin.** As of the validation date (2026-05-19) this is an older release; Mattermost has shipped many newer minor/major versions. The post explicitly tells the reader to "check mattermost.com for current version," so the pin is illustrative rather than authoritative — left unchanged.
- **systemd `Type=notify`.** Verified: the Mattermost server binary uses `sd_notify` to signal readiness, so this is correct (matches the official systemd unit template).
- **PostgreSQL `GRANT ALL ON SCHEMA public TO mmuser;`** is included, which is the right thing to do for PostgreSQL 15+ where the public schema no longer grants CREATE to PUBLIC by default. Good practice retained.
- **`useradd -m -d /opt/mattermost`** with `-s /bin/bash` is slightly unconventional for a system service account (login shell + manual home), but functionally works because the subsequent `tar` extraction merges into the directory and `chown -R` corrects ownership. Not changed.
- **Nginx `ssl_ciphers`** list is narrow (two DHE/ECDHE-RSA-AES256-GCM-SHA512 suites). It is secure but quite restrictive; modern guidance favors a broader Mozilla "intermediate" list. Left alone — not incorrect, just conservative.
- **`MaxFileSize: 52428800`** (50 MB) and `client_max_body_size 50m` are consistent with each other, which is good. Mattermost's default `MaxFileSize` is 100 MB; lowering it here is a stylistic choice and not an error.
