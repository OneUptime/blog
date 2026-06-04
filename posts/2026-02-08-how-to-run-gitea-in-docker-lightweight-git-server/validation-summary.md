# Validation Summary: How to Run Gitea in Docker (Lightweight Git Server)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Gitea
- Docker
- Docker Compose
- PostgreSQL
- Gitea Actions
- Gitea act runner
- Nginx reverse proxy
- Gitea REST API
- Backup and restore commands

## Sources Consulted
- Gitea 1.22 Docker installation documentation: https://docs.gitea.com/1.22/installation/install-with-docker
- Gitea 1.22 configuration cheat sheet: https://docs.gitea.com/1.22/administration/config-cheat-sheet
- Gitea Actions quick start: https://docs.gitea.com/1.22/usage/actions/quickstart
- Gitea act runner documentation: https://docs.gitea.com/1.24/usage/actions/act-runner
- Gitea backup and restore documentation: https://docs.gitea.com/usage/backup-and-restore
- Gitea REST API documentation for repository migration: https://docs.gitea.com/api/
- Gitea database preparation documentation: https://docs.gitea.com/1.22/installation/database-prep
- Gitea reverse proxy documentation: https://docs.gitea.com/usage/reverse-proxies
- Docker Compose file reference for the top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- Removed the obsolete top-level `version: "3.8"` field from the Docker Compose example. Modern Docker Compose uses the current Compose Specification and treats the top-level version as backward-compatible metadata.
- Changed `GITEA__repository__DEFAULT_PRIVATE=true` to `GITEA__repository__DEFAULT_PRIVATE=private`. Gitea expects `DEFAULT_PRIVATE` to be one of `last`, `private`, or `public`, not a boolean.
- Clarified Gitea Actions enablement for Gitea 1.22. Instance-level Actions are enabled by default in 1.22, but repositories still need Actions enabled in repository settings before workflows run.
- Corrected the Docker backup command to stop Gitea for consistency, run `gitea dump` as the `git` user from `/tmp`, and copy a predictable backup filename out of the container.
- Corrected the restore example to copy the dump into the container, unpack it, restore data and repositories to the documented Docker paths, and regenerate Git hooks after startup.

## Review Notes
The examples remain version-specific to Gitea 1.22. The pinned `gitea/gitea:1.22` image tag is usable for the guide, but future updates could pin a full patch version such as `1.22.6` or move to a newer supported Gitea release.
