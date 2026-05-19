# Validation Summary: How to Install Gitea (Self-Hosted GitHub Alternative) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Gitea
- PostgreSQL
- systemd
- Nginx
- Certbot / Let's Encrypt
- OpenSSH
- Git LFS
- Gitea webhooks
- Gitea repository migration and mirroring API
- Gitea backup and restore CLI

## Sources Consulted
- Gitea installation from binary: https://docs.gitea.com/installation/install-from-binary
- Gitea Linux service documentation: https://docs.gitea.com/installation/linux-service
- Gitea database preparation: https://docs.gitea.com/installation/database-prep
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Gitea command line documentation: https://docs.gitea.com/administration/command-line
- Gitea backup and restore documentation: https://docs.gitea.com/administration/backup-and-restore
- Gitea Git LFS setup: https://docs.gitea.com/administration/git-lfs-setup
- Gitea reverse proxy documentation: https://docs.gitea.com/administration/reverse-proxies
- Gitea API documentation for repository migration: https://docs.gitea.com/api/
- Gitea 1.26.1 release announcement: https://blog.gitea.com/release-of-1.26.1/
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The install commands did not install Git, but Gitea requires Git on the server. Added `git` to the package installation command.
- The post used Gitea `1.23.1`, which is outdated as of the validation date. Updated the sample version to `1.26.1`, the current stable release found in official Gitea sources.
- The `git` user creation comment said "no login shell" while the command explicitly configured `/bin/bash`. Reworded the comment to say it creates a dedicated Git user.
- The web installer hardening step only secured `app.ini`. Added the official recommended `chmod 750 /etc/gitea`.
- The Nginx HTTPS sequence tested and reloaded a config that referenced Let's Encrypt certificate files before Certbot had created them. Reworked the section into an HTTP-only bootstrap config, Certbot issuance, and final HTTPS reverse proxy config.
- The Nginx config used `listen 443 ssl http2`; updated it to `listen 443 ssl;` plus `http2 on;`, matching current Nginx HTTP/2 directive syntax.
- The LFS snippet only showed `[lfs] PATH`; added the required `[server] LFS_START_SERVER = true` setting to the standalone LFS snippet.
- The restore example used `gitea restore-backup`, but Gitea has no full-instance restore command. Replaced it with the manual restore flow documented by Gitea: unzip the dump, restore `app.ini`, data, logs, repositories, import `gitea-db.sql`, fix ownership, restart, and regenerate hooks.

## Review Notes
- The API migration example remains valid, though newer Gitea API documentation also supports `repo_owner`; `uid` is still accepted for compatibility.
- The manual configuration uses local PostgreSQL with `SSL_MODE = disable`, which is appropriate for a local `127.0.0.1` connection but should be revisited for remote database deployments.
