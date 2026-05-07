# Validation Summary: How to Run Gitea in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Gitea
- PostgreSQL
- SQLite
- Git over SSH and HTTP
- Gitea REST API
- Gitea CLI administration
- Container volumes and port publishing

## Sources Consulted
- Gitea Installation with Docker: https://docs.gitea.com/1.26/installation/install-with-docker
- Gitea Installation with Docker (rootless): https://docs.gitea.com/installation/install-with-docker-rootless
- Gitea Configuration Cheat Sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Gitea Command Line: https://docs.gitea.com/next/administration/command-line
- Gitea Backup and Restore, Docker restore commands and hook regeneration: https://docs.gitea.com/1.23/administration/backup-and-restore
- Gitea API documentation: https://docs.gitea.com/api/
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html

## Issues Found
- The introduction described the deployment as "in a rootless container", but the commands use the standard Gitea image layout (`/data`, SSH on container port 22), not the Gitea rootless image layout (`/var/lib/gitea`, `/etc/gitea`, internal SSH on port 2222). Changed the wording to avoid claiming the container image is rootless.
- The `podman run` examples used the unqualified image name `gitea/gitea:latest` after pulling `docker.io/gitea/gitea:latest`. Changed the run commands to use `docker.io/gitea/gitea:latest` consistently so Podman does not depend on short-name registry resolution.
- The administrative examples ran the Gitea CLI without explicitly using the container's config file or the `git` user. Updated them to use `podman exec -u git` and `gitea --config /data/gitea/conf/app.ini`, matching the standard Docker image config path and Gitea CLI guidance.
- The hook regeneration command used `gitea admin repo-sync-releases`, which is not the documented command for regenerating repository Git hooks. Changed it to `gitea admin regenerate hooks`.
- The summary said "Podman's rootless execution keeps your Git hosting secure and isolated", which overstated the default behavior. Changed it to note that running Podman rootless depends on host configuration and helps with isolation.

## Review Notes
Podman was not installed in this workspace, so CLI behavior was validated against official Podman documentation rather than local `podman --help` output. The API examples use Basic Auth for demonstration; for production, Gitea access tokens are usually preferable.
