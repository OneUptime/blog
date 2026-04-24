# Validation Summary: How to Clean Up Stale Data in the Portainer Database - Stale

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- BoltDB / bbolt
- Docker CLI
- Cron

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer database encryption: https://docs.portainer.io/advanced/db-encryption
- Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer API documentation: https://docs.portainer.io/api/docs
- Environments: https://docs.portainer.io/admin/environments/environments
- Stacks: https://docs.portainer.io/user/docker/stacks
- Remove a stack: https://docs.portainer.io/user/docker/stacks/remove
- What does Portainer's backup include?: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- "Failed logging user activity" error in Portainer: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/failed-logging-user-activity-error-in-portainer
- Stream auth and activity logs to an external provider: https://docs.portainer.io/sts/advanced-topics/siem
- Docker prune docs: https://docs.docker.com/engine/manage-resources/pruning/
- Portainer source for stack deletion parameters: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_delete.go
- Portainer source for CLI flags: https://raw.githubusercontent.com/portainer/portainer/develop/api/cli/cli.go
- Portainer source for BoltDB compaction behavior: https://raw.githubusercontent.com/portainer/portainer/develop/api/database/boltdb/db.go

## Issues Found
- The post described activity logs as part of `portainer.db`. Portainer documents Business Edition activity logs separately in `useractivity.db`, so I corrected the growth explanation and the activity-log section.
- The database growth table included unsupported categories and over-specific growth claims. I replaced it with metadata categories Portainer explicitly documents in backups: snapshot metadata, stack-related metadata, and environment metadata.
- The database size section used fixed size thresholds that are not documented by Portainer. I replaced that with a baseline-before-and-after compaction check.
- The compaction section treated `--compact-db` like a one-shot maintenance command and used `portainer/portainer-ce:latest`, which could unintentionally change versions. I corrected it to the documented startup-flag workflow and switched it to reuse the currently running image tag.
- The stack deletion API example omitted the required `endpointId` query parameter. I added `EndpointId` to the listing output and fixed the DELETE example.
- The activity log section claimed a retention setting under `Settings > Authentication`. I replaced it with documented behavior and the supported Syslog streaming option for external retention/auditing.
- The environment removal steps referred to a trash icon. I corrected them to the documented Environments page workflow using selection plus **Remove**.
- The automation script attempted compaction via a temporary `docker run --rm ... --compact-db` container. Because `--compact-db` is a startup flag, I changed the script to safe pruning and size reporting and noted that compaction should be done during a planned restart.

## Review Notes
- The post uses Docker Standalone examples. If Portainer is deployed with Docker Compose, Docker Swarm, or Kubernetes, the same `--compact-db` flag must be added to that platform's startup definition and applied during a restart.
- Leaving `--compact-db` in the long-term container definition will compact the database on every Portainer startup. That is valid, but it can lengthen restart time.
- Portainer's general API docs now emphasize access tokens in the `X-API-Key` header for ongoing automation. The post's `/api/auth` plus Bearer JWT example is still supported by Portainer's API examples, so it was left in place.
