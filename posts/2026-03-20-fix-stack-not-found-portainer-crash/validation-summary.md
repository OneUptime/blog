# Validation Summary: How to Fix 'Stack Not Found' After a Portainer Crash

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose / stacks
- BoltDB

## Sources Consulted
- Portainer Documentation, "Back up Portainer" and restore workflow: https://docs.portainer.io/admin/settings/general
- Portainer Documentation, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Documentation, "How can I roll back to a previous version of Portainer?": https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer Documentation, "How do I recover orphaned stacks from a previously deleted environment?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment
- Portainer Documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation, "Encrypting the Portainer database": https://docs.portainer.io/sts/advanced-topics/db-encryption
- Docker Docs, `docker network ls`: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker Docs, `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, `docker container ls`: https://docs.docker.com/reference/cli/docker/container/ls/

## Issues Found
- The original backup restore instructions were incorrect. Portainer documents restore only during initial setup on a fresh instance with an empty data volume, not from `Settings`. Step 3 was updated to match the official restore flow.
- The original "re-import" guidance claimed Portainer could link running containers back into a stack from container metadata. Portainer's documented recovery path is to re-associate orphaned stacks after the environment is recreated, so Step 4 was rewritten to use that workflow.
- The original `--rollback-from` example used an unsupported rollback flag and an incorrect rollback process. Step 5 was replaced with Portainer's documented rollback approach: restore `backups/portainer.db.bak` and then start the matching previous Portainer image version.
- The prevention section used a manual tar command instead of Portainer's documented backup workflow. It was replaced with the built-in `Settings > Back up Portainer` guidance so the backup format matches the documented restore process.
- Minor command cleanup was applied for accuracy and portability: `docker network ls --filter name=<stack-name>` and `grep -Ei`.

## Review Notes
- The exact "Stack Not Found" error condition is not explicitly documented by Portainer, but the post now uses only documented recovery mechanisms around Portainer's configuration database, backups, orphaned stacks, and upgrade rollback.
- The rollback example intentionally uses `portainer/portainer-ce:<previous-version>` as a placeholder. Readers must substitute the exact earlier CE or BE version they were running, and it must match the version that created `backups/portainer.db.bak`.
