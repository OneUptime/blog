# Validation Summary: How to Deploy Paperless-ngx via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Paperless-ngx
- PostgreSQL
- Redis
- Apache Tika
- Gotenberg
- IMAP email ingestion
- OCR

## Sources Consulted
- Paperless-ngx configuration documentation - https://docs.paperless-ngx.com/configuration/
- Paperless-ngx usage documentation - https://docs.paperless-ngx.com/usage/
- Paperless-ngx setup documentation - https://docs.paperless-ngx.com/setup/
- Official Paperless-ngx Docker Compose template with Tika/Gotenberg - https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres-tika.yml
- Docker Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element reference - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `docker container cp` CLI reference - https://docs.docker.com/reference/cli/docker/container/cp/
- Docker Compose volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose project naming reference - https://docs.docker.com/compose/how-tos/project-name/

## Issues Found
- The stack example used the top-level `version: "3.8"` field. Docker now treats the Compose `version` field as obsolete, so I removed it.
- The Tika/Gotenberg services were declared but Paperless was not configured to use them. I added `PAPERLESS_TIKA_ENABLED`, `PAPERLESS_TIKA_ENDPOINT`, and `PAPERLESS_TIKA_GOTENBERG_ENDPOINT`, and added `gotenberg` and `tika` to `depends_on` so the optional document-conversion services match the official Paperless setup pattern.
- The Tika image reference used `ghcr.io/paperless-ngx/tika:latest`, while the current official Paperless compose template uses the Apache Tika image. I changed it to `apache/tika:latest`.
- The consume-folder copy example used Docker's internal named-volume path directly. That is brittle for Compose/Portainer deployments because resource names are project-scoped. I replaced it with `docker cp invoice.pdf paperless:/usr/src/paperless/consume/`, which is valid Docker CLI syntax and works with the container path used in the post.
- The email-consumption section was technically incorrect. The `PAPERLESS_EMAIL_*` variables shown there configure SMTP email sending, not inbound IMAP document consumption. I replaced that snippet with the correct UI-based setup flow under `Settings -> Mail`.
- The mobile scanner section implied a named Docker volume could simply be shared over Samba/NFS. I corrected it to explain that a bind mount is needed for network-share workflows and noted that `PAPERLESS_CONSUMER_POLLING` is required on filesystems without `inotify`, such as common NFS setups.

## Review Notes
- The post now aligns with the current Paperless-ngx docs for Docker deployment, document consumption, optional Tika/Gotenberg support, and incoming email setup.
- The workspace does not have the Docker CLI installed, so command behavior was validated against the current Docker CLI reference rather than executed locally.
