# Validation Summary: How to Use Docker Swarm Configs for Non-Secret Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker Swarm configs
- Docker CLI
- Docker stack deployments
- Docker Compose file syntax for stack deployments
- Nginx configuration
- Go template syntax for Swarm configs

## Sources Consulted
- Docker Docs: Store configuration data using Docker Configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: docker config create - https://docs.docker.com/reference/cli/docker/config/create/
- Docker Docs: docker config inspect - https://docs.docker.com/reference/cli/docker/config/inspect/
- Docker Docs: docker config ls - https://docs.docker.com/reference/cli/docker/config/ls/
- Docker Docs: docker config rm - https://docs.docker.com/reference/cli/docker/config/rm/
- Docker Docs: docker service create - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker stack deploy - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Compose file services configs - https://docs.docker.com/reference/compose-file/services/#configs
- Docker Docs: Compose configs top-level element - https://docs.docker.com/reference/compose-file/configs/
- Docker Docs: Deploy services to a swarm, templates - https://docs.docker.com/engine/swarm/services/
- Local Docker CLI help output for `docker config create`, `docker service create`, `docker service update`, and `docker stack deploy`

## Issues Found
- The post said configs are stored unencrypted in the Raft log. Docker documentation describes configs as non-sensitive and mounted directly rather than as secrets, but current docs also state configs are stored in the encrypted Raft log. I changed the wording to avoid the incorrect storage claim and keep the intended warning that configs should not hold sensitive data.
- The post used `docker config inspect nginx-conf --pretty` to view actual base64-encoded config content. Official inspect examples show the content in `Spec.Data` in JSON output. I changed the command to `docker config inspect --format '{{.Spec.Data}}' nginx-conf`.
- The Nginx service example referenced `--network app-network` and upstream `api:8080` without noting those resources must exist. I added a short assumption to the command comment so the example does not imply it is standalone.
- The Compose stack section said Swarm detects a config file content change and performs a rolling update on redeploy. Docker configs are immutable; Docker's docs say a stack must use a new config to pick up new content. I corrected the sentence to describe using a new config name and redeploying.

## Review Notes
- The remaining Docker CLI flags, Compose config syntax, config immutability, 500 KB size limit, default Linux mount path, default file mode, multiple config usage, external config usage, and Go template examples were consistent with Docker's current official documentation.
- The Compose example uses `version: "3.8"`, which is common for Swarm stack files. Docker's current Compose Specification no longer requires a `version` field for regular Compose usage, but `docker stack deploy` documentation still discusses Compose file version 3.0 and above for stack deployments.
