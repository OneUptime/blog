# Validation Summary: How to Deploy Bookstack via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose stacks
- BookStack
- LinuxServer.io BookStack container image
- MariaDB
- OpenID Connect (OIDC)

## Sources Consulted
- LinuxServer.io BookStack image documentation: https://docs.linuxserver.io/images/docker-bookstack/
- BookStack installation documentation: https://www.bookstackapp.com/docs/admin/installation/
- BookStack OpenID Connect documentation: https://www.bookstackapp.com/docs/admin/oidc-auth/
- BookStack email and webhooks documentation: https://www.bookstackapp.com/docs/admin/email-webhooks/
- BookStack backup and restore documentation: https://www.bookstackapp.com/docs/admin/backup-restore/
- BookStack content overview documentation: https://www.bookstackapp.com/docs/user/content-overview/
- BookStack organising content documentation: https://www.bookstackapp.com/docs/user/organising-content/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- MariaDB Docker official image environment variables: https://mariadb.com/kb/en/mariadb-server-docker-official-image-environment-variables/
- MariaDB dump utility documentation: https://mariadb.com/kb/en/mysqldump-options/

## Issues Found
- The stack example used a top-level `version: "3.8"` key. I removed it because current Docker Compose documentation marks the `version` field as obsolete.
- The BookStack service definition omitted `APP_KEY`. I added `APP_KEY` and the official LinuxServer command used to generate it because the image documentation requires an application key.
- The original `APP_URL` (`https://wiki.example.com`) did not match the access URL shown later in the guide (`http://<host>:8080`). I changed `APP_URL` to `http://<host>:8080` so the configured base URL matches the URL readers are told to open.
- The heading `Configuring SSO (SAML/OIDC)` overstated what the snippet covered. I changed it to `Configuring SSO (OIDC)` because the example only configures OIDC.

## Review Notes
- `MYSQL_*` environment variables are still supported by the MariaDB 10.11 image used in the post, although current MariaDB documentation prefers `MARIADB_*` variable names.
- The backup example uses `mysqldump`, which remains valid for `mariadb:10.11`. If this guide is later updated to MariaDB 11.x or newer, `mariadb-dump` should be used instead.
- The guide uses `lscr.io/linuxserver/bookstack:latest`, which is valid, but pinning a specific image release would make the deployment more reproducible over time.
