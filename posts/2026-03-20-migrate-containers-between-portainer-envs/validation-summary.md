# Validation Summary: How to Migrate Containers Between Portainer Environments - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose specification
- Docker volumes
- Container registries
- `scp`

## Sources Consulted
- Portainer Documentation, Environment-related: https://docs.portainer.io/sts/admin/environments
- Portainer Documentation, Migrate, duplicate or rename a stack: https://docs.portainer.io/user/docker/stacks/migrate
- Portainer Documentation, Inspect or edit a stack: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs, Define and manage volumes in Docker Compose: https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, docker image tag: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs, docker image push: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs, docker container logs: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, docker container exec: https://docs.docker.com/engine/reference/commandline/exec

## Issues Found
- The post said Portainer could not move workloads between environments from the UI. I corrected this to reflect current Portainer behavior: stack definitions can be migrated in the UI, but persistent volume contents are not moved automatically.
- The post recommended copying stack files from `/var/lib/docker/volumes/portainer_data/_data/compose/...`. I removed this because it is not a documented, portable Portainer workflow and replaced it with supported UI-based and Git/detach guidance.
- The data migration example only backed up and restored `my_app_data` even though the sample stack also used `db_data`. I expanded the backup and restore examples and marked both volumes as external in the Compose snippet so the deployment matches the migrated data layout.
- The Compose example used the top-level `version: "3.8"` field. I removed it because current Docker Compose documentation marks `version` as obsolete.
- The summary described the workflow as a four-step process even though the post had six steps and included image publishing. I corrected the summary to match the actual workflow.

## Review Notes
- The revised guide is accurate for Docker-based Portainer stack migrations. Kubernetes workloads in Portainer use different export and redeploy mechanics, so this post should continue to be treated as Docker-focused.
