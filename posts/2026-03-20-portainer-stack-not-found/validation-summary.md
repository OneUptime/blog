# Validation Summary: How to Fix 'Stack Not Found' After a Portainer Crash - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Portainer HTTP API
- Shell scripting (`bash`)
- `curl`
- `jq`

## Sources Consulted
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer orphaned stack recovery FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI schema reviewed for current endpoints and payloads: https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Portainer backup and restore documentation: https://docs.portainer.io/admin/settings/general
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Docker Compose application model docs: https://docs.docker.com/compose/intro/compose-application-model/
- Docker Compose project name docs: https://docs.docker.com/compose/how-tos/project-name/
- Docker container listing docs (`docker ps` / `docker container ls` formatting): https://docs.docker.com/reference/cli/docker/container/ls/
- Docker inspect docs: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Compose up docs: https://docs.docker.com/reference/cli/docker/compose/up/
- `docker-autocompose` project README: https://github.com/Red5d/docker-autocompose

## Issues Found
- The post said containers become "orphaned" after Portainer metadata loss. That is not the documented orphaned-stack case in Portainer. I changed the explanation to say Portainer loses the stack record while containers keep running, and I reserved "orphaned" for Portainer's documented deleted-environment recovery flow.
- The post attributed Compose project labels to Portainer. Docker Compose is the component that sets `com.docker.compose.project`, so I corrected the wording in Steps 1 and 2.
- The Step 2 command used an invalid `docker ps --format "{{.Names}}" -q` combination and unnecessary `xargs docker inspect` flow. I replaced it with a current documented `docker ps -a --format '{{.Names}}: {{.Label "com.docker.compose.project"}}'` approach based on Docker's `--format` placeholders.
- Step 3 claimed Portainer can re-import running containers by using Add Stack, Web Editor, and the same name, and that Portainer would detect and associate them. Portainer's documented reassociation flow is specifically for orphaned stacks that still exist in Portainer. I rewrote Step 3 to use the documented orphaned-stack association workflow and directed readers to recover the Compose file and redeploy if no orphaned stack entry exists.
- Step 4 used an old-style container-name placeholder and read mounts from `.HostConfig.Binds`, which misses named-volume information. I changed the examples to use a generic `<container-id>` placeholder and `.Mounts` for mount inspection.
- Step 5 used `pip3 install docker-autocompose`, but the PyPI package is old and the project's current maintained usage is via the published container image. I updated the example to the current `ghcr.io/red5d/docker-autocompose` usage and explicitly marked it as third-party.
- Step 6 used an outdated Portainer stack-create endpoint and incorrect JSON field casing (`name`, `stackFileContent`). I updated it to the current Docker Standalone endpoint `/api/stacks/create/standalone/string` and the current payload fields `Name` and `StackFileContent`, consistent with Portainer's current OpenAPI schema.
- Step 7 instructed readers to untar a backup directly into the Portainer data volume and restart Portainer. Portainer's current restore docs say restore is performed on a fresh instance with an empty data volume during initial setup. I replaced that section with the documented restore flow and clarified what backups do and do not include.
- Step 8 recommended manual tar backups of the Portainer data volume. I updated the example to use Portainer's documented backup API endpoint `/api/backup`, which is the current official interface for generating backup archives.
- Step 9 authenticated with legacy bearer-token examples and used legacy HTTP URLs. I updated the export example to use the current documented access-token approach via `X-API-Key`, current HTTPS `9443` examples, and added directory creation so the script works as written.
- The description and conclusion still used "re-import" wording after the technical corrections. I updated them to distinguish between re-associating orphaned stacks and redeploying recovered Compose stacks.

## Review Notes
- The post now accurately distinguishes two different recovery cases: `orphaned` stacks that Portainer can reassociate, and `lost metadata` cases where you must recover the Compose definition and redeploy the stack.
- The API deployment example is for Docker Standalone / Compose stacks. Docker Swarm uses different Portainer endpoints and recovery behavior.
- `docker-autocompose` remains a useful helper, but it is a third-party tool and its output should be reviewed carefully before redeployment.
- Portainer backups restore Portainer's own configuration and stack metadata, not the containers or application data running in the managed environment.
