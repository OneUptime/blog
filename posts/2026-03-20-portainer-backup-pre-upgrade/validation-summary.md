# Validation Summary: How to Back Up Portainer Database Before Major Changes - Pre Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker volumes and container lifecycle
- Bash shell scripting
- `curl`
- `jq`
- `tar`

## Sources Consulted
- Portainer documentation, "Back up Portainer" and restore notes: https://docs.portainer.io/admin/settings/general
- Portainer FAQ, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer install docs, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer update docs, "Updating on Docker Standalone": https://docs.portainer.io/sts/start/upgrade/docker
- Portainer FAQ, "How can I roll back to a previous version of Portainer?": https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer official Docker image build file showing the `/portainer` entrypoint: https://github.com/portainer/portainer/blob/develop/build/linux/Dockerfile
- Docker docs, "Volumes" including backup and restore guidance: https://docs.docker.com/engine/storage/volumes/

## Issues Found
- The checklist script used `docker exec portainer /app/portainer --version`, but the official Portainer image entrypoint is `/portainer` and the CLI docs document `--version`. This was corrected to `docker exec portainer /portainer --version`.
- The API examples used `http://localhost:9000`, which is the legacy HTTP port. Current Portainer docs use HTTPS on `9443` by default, with `9000` only if legacy HTTP is explicitly retained. The script was updated to use `https://localhost:9443` with `curl -k` for the default self-signed certificate.
- The auth request embedded the password directly into a JSON string, which could break for passwords containing quotes or other special characters. The payload is now generated with `jq` so it remains valid JSON.
- The upgrade example used `portainer/portainer-ce:latest`, but the current official install and upgrade docs use `portainer/portainer-ce:sts`. The image tag was updated accordingly.
- The upgrade and rollback `docker run` examples exposed `9000` by default and omitted `8000`. Current Portainer standalone install and update guidance uses `9443` and `8000` by default, with `9000` only as an optional legacy port. The examples were updated and now note that `9000` can be added only if legacy HTTP is still required.
- The verify, rollback, and retention snippets referenced `/opt/backups/portainer-pre-upgrade-...`, but the checklist script actually writes backups into `/opt/backups/portainer/`. Those paths were corrected so the steps are internally consistent.
- The backup verification snippet matched `portainer.db` loosely via `grep`, which could misread the wrong archive entry if multiple matching files existed. It now finds the exact database path in the archive first, then measures that file's size directly.

## Review Notes
- Portainer's built-in backup already includes Portainer-managed stack definitions stored under `/data`, so the explicit stack export step is not required for completeness. It is still technically reasonable as an extra human-readable rollback aid.
- Portainer's documented restore flow for UI-generated backups is performed on a fresh instance during initial setup. This post uses a manual tar-based Docker volume backup and restore approach instead, which is consistent with Docker's documented volume backup/restore pattern.
