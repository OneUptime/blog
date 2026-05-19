# Validation Summary: How to Install Focalboard on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Focalboard Personal Server
- Ubuntu Linux
- PostgreSQL
- SQLite
- systemd
- nginx
- Certbot / Let's Encrypt
- Linux shell commands

## Sources Consulted
- Focalboard Personal Server Ubuntu installation guide: https://www.focalboard.com/docs/personal-edition/ubuntu/
- Focalboard server setup guide: https://www.focalboard.com/guide/server-setup/
- Focalboard v7.11.3 GitHub release assets: https://github.com/mattermost-community/focalboard/releases/tag/v7.11.3
- Focalboard v7.11.4 GitHub release notes: https://github.com/mattermost-community/focalboard/releases/tag/v7.11.4
- Focalboard v7.11.3 README and maintenance notice: https://github.com/mattermost-community/focalboard/blob/v7.11.3/README.md
- Focalboard v7.11.3 server config source: https://github.com/mattermost-community/focalboard/blob/v7.11.3/server/services/config/config.go
- Focalboard v7.11.3 packaged config: https://github.com/mattermost-community/focalboard/blob/v7.11.3/server-config.json
- Certbot nginx instructions: https://eff-certbot.readthedocs.io/en/stable/using.html#nginx

## Issues Found
- The post downloaded `v7.11.4/focalboard-server-linux-amd64.tar.gz`, but `v7.11.4` is a plugin-only release and does not provide the standalone server tarball. Changed the example to `v7.11.3`, which has the standalone Linux server asset.
- The deployment-mode description presented standalone server mode as the team-focused deployment. Updated it to distinguish Personal Server from Mattermost Boards, matching upstream Focalboard guidance.
- The config examples used `/opt/focalboard/webapp` for `webpath`, but the standalone server package contains the web app under `pack`. Changed `webpath` to `/opt/focalboard/pack`.
- The SQLite config stored the database directly under `/opt/focalboard`, while the service runs as an unprivileged user and `/opt/focalboard` is made root-owned. Moved the SQLite database path to `/opt/focalboard/data/focalboard.db?_busy_timeout=5000` and added creation/ownership commands for `/opt/focalboard/data`.
- The nginx example referenced Let's Encrypt certificate files before running Certbot, which would make `nginx -t` fail on a fresh install. Changed the example to start with an HTTP proxy and then let Certbot update nginx for HTTPS.
- The post documented `focalboard-admin`, `--useradmin`, and `--diagnose`, but the standalone v7.11.3 server package ships only `bin/focalboard-server`, whose supported flags are `-config`, `-dbconfig`, `-dbtype`, `-monitorpid`, `-port`, and `-single-user`. Replaced those sections with web-based first-user registration and valid server flag examples.
- The SQLite backup path still referenced the old database location. Updated it to `/opt/focalboard/data/focalboard.db`.
- The update procedure excluded the old root-level SQLite database path. Updated it to preserve the `data/` directory and restore ownership on both `files/` and `data/`.

## Review Notes
Focalboard Personal Server and Personal Desktop were transitioned to community support after April 30, 2023. The standalone server remains usable, but future team-focused Mattermost Boards work moved into Mattermost.
