# Validation Summary: How to Recover Orphaned Stacks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker Engine
- Docker Compose
- Docker Swarm

## Sources Consulted
- Portainer Docs, Stacks: https://docs.portainer.io/user/docker/stacks
- Portainer Docs, Recover orphaned stacks FAQ: https://docs.portainer.io/faqs/troubleshooting/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment
- Portainer Docs, Access control: https://docs.portainer.io/sts/advanced/access-control
- Portainer Docs, Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer Docs, What does Portainer's backup include?: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Docker Docs, How Compose works: https://docs.docker.com/compose/intro/compose-application-model/
- Docker Docs, Docker object labels: https://docs.docker.com/engine/manage-resources/labels/
- Docker Docs, docker container ls / docker ps: https://docs.docker.com/reference/cli/docker/container/ls
- Docker Docs, docker stack services: https://docs.docker.com/reference/cli/docker/stack/services/
- Portainer official source, stack associate handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_associate.go
- Portainer official source, stack list handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_list.go
- Portainer official source, stack create handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_create.go
- Portainer official source, compose stack creation handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer official source, stack file handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_file.go
- Portainer official source, Docker label constants: https://raw.githubusercontent.com/portainer/portainer/develop/api/docker/consts/labels.go

## Issues Found
- The post defined orphaned stacks too broadly. I corrected it to Portainer's documented meaning: stacks previously created in Portainer whose environment was removed and later re-added on the same node or Swarm.
- The post incorrectly treated direct CLI deployments and Portainer data-loss scenarios as orphaned stacks. I corrected those cases to external workloads with limited control, which are not recoverable through the orphaned-stack association flow.
- The original recovery flow told readers to recreate a stack by deploying a new stack with the same name. Portainer's current stack-creation handlers reject name collisions with existing Compose-project or Swarm stack names, so I replaced that guidance with Portainer's supported re-association flow.
- The original Portainer API example used `POST /api/stacks` with an outdated/incorrect payload. I replaced it with the current orphaned-stack workflow: list stacks with `IncludeOrphanedStacks` and use `PUT /api/stacks/{id}/associate` with `endpointId` and `orphanedRunning`.
- The post claimed Portainer BE had an External stacks association workflow for CLI-created stacks. I corrected this to reflect current Portainer behavior: externally deployed workloads are limited/external, and the orphaned-stack associate flow does not apply.
- The post said Portainer reinstall/data loss could be fixed by re-importing the same Compose file and having Portainer re-associate running containers. I corrected this to explain that once Portainer's stack records are gone, those workloads are no longer orphaned stacks; recovery requires restoring a Portainer backup or treating them as external workloads and redeploying from Portainer.
- The compose-file discovery command only searched for `docker-compose.yml`. I updated it to include current and legacy Compose filenames: `compose.yaml`, `compose.yml`, `docker-compose.yaml`, and `docker-compose.yml`.

## Review Notes
- Orphaned-stack association is an admin-only capability in current Portainer.
- The `orphanedRunning` parameter on the associate endpoint controls whether the re-associated stack comes back as active or inactive.
- Portainer backups include Portainer's configuration and stack definitions created in Portainer, but not the environment's containers, images, volumes, or application data.
