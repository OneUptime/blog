# Validation Summary: How to Manage Docker Secrets in Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Secrets
- Docker CLI
- Compose stack files for Swarm
- Bash
- Python
- Node.js

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: `docker secret create` - https://docs.docker.com/reference/cli/docker/secret/create/
- Docker Docs: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Compose services `secrets` reference - https://docs.docker.com/reference/compose-file/services/
- Portainer Docs: Secrets - https://docs.portainer.io/user/docker/secrets
- Portainer Docs: Add a new secret - https://docs.portainer.io/user/docker/secrets/add
- Portainer Docs: Services - https://docs.portainer.io/user/docker/services
- Portainer Docs: Configure service options - https://docs.portainer.io/2.21/user/docker/services/configure

## Issues Found
- The CLI sections did not state that Swarm management commands such as `docker secret create`, `docker service update`, and `docker secret rm` must be run on a Swarm manager node. I added that prerequisite and CLI note because Docker documents these as cluster-management commands that run on managers.
- The string-based secret creation example used `echo`, which can append a trailing newline to the secret value. I changed it to `printf "%s"` to match Docker’s documented examples and avoid unintentionally changing the stored secret.
- The file-based secret creation example claimed it avoided shell-history exposure while embedding the secret directly in the shell command. I replaced it with a secure-file example so the guidance matches the actual command behavior.
- The security-model bullet said secrets are “in-memory only on worker nodes - not written to disk,” which was too broad. I corrected it to Docker’s documented Linux-container behavior: decrypted secrets are mounted in memory and flushed from node memory when the task stops.
- The Step 5 explanation said applications must read secrets from files “not environment variables,” but the post also used supported `_FILE` environment-variable patterns. I clarified that applications should read from `/run/secrets`, and that many images support `_FILE` variables pointing to those files.
- The update section implied that rotating a secret is always just swapping the mounted secret. I added the Docker-documented caveat that some credentials, such as database passwords, also require application-specific rotation steps.
- The rotation script accepted the new secret value as a positional argument, which exposes it via process arguments, and it assumed the old secret source name never changed. I replaced it with a stdin-based version that finds the currently attached secret source by mounted target name before updating services.
- The old-secret removal example used `db-password-v1`, even though the walkthrough created `db-password` and then `db-password-v2`. I corrected the removal example to the actual old secret name used in the walkthrough.
- Portainer navigation wording was adjusted to match current Portainer documentation more closely (`Secrets`, `Add secret`, `Remove`).

## Review Notes
- The guide is effectively Linux-specific. Docker documents different secret mount paths and persistence behavior for Windows containers, while this post uses Linux paths such as `/run/secrets/...`.
- `version: "3.8"` remains acceptable for Swarm stack examples because `docker stack deploy` still uses the legacy Compose v3 file format.
- `_FILE` environment variables are image-specific conventions, not a universal Docker Secrets feature. The `postgres` example is valid because official images commonly support this pattern.
