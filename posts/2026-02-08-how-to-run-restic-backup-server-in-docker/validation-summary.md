# Validation Summary: How to Run Restic Backup Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Restic
- Restic REST server
- Docker
- Docker Compose
- Apache htpasswd
- Cron
- Nginx reverse proxy and TLS
- OneUptime HTTP monitoring

## Sources Consulted
- Restic REST server README and Docker image notes: https://github.com/restic/rest-server
- Restic REST backend documentation: https://restic.readthedocs.io/en/latest/REST_backend.html
- Restic repository setup and REST repository URL documentation: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Restic backup documentation: https://restic.readthedocs.io/en/v0.17.3/040_backup.html
- Restic restore documentation: https://restic.readthedocs.io/en/latest/050_restore.html
- Restic forget/prune documentation: https://restic.readthedocs.io/en/latest/060_forget.html
- Restic repository format and encryption design: https://restic.readthedocs.io/en/stable/design.html
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version field documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- NGINX release documentation for HTTP/2 directive changes: https://docs.nginx.com/nginx/releases/

## Issues Found
- The retention examples used `docker exec restic-server restic ...`, but the official `restic/rest-server` Docker image includes the REST server binary and helper user-management scripts, not the `restic` client. Updated the examples to run the `restic` client on the server host against the bind-mounted repository path.
- The retention examples omitted how the repository encryption password is supplied. Added `RESTIC_PASSWORD` for the single-repository command and `RESTIC_PASSWORD_FILE` for the cleanup script.
- The append-only explanation said an attacker cannot destroy backups. Narrowed this to deleting existing backups through the compromised client's REST server credentials, because append-only mode does not protect against full server or storage compromise.
- The Nginx snippet used `listen 443 ssl http2;`, whose `http2` listen parameter is deprecated in current Nginx releases. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The monitoring note assumed a plain HTTP monitor on port 8000 would be enough even when authentication or a TLS reverse proxy is used. Updated it to mention port 443 for reverse-proxy setups and basic-auth or expected `401 Unauthorized` handling.

## Review Notes
- Docker Compose still accepts the top-level `version` field for backward compatibility, but current Compose documentation marks it obsolete and informational. The snippet remains functional, so it was not changed.
- The post uses `restic/rest-server:latest`, which is convenient for tutorials but can change behavior over time. Pinning a release tag would be more reproducible in production.
