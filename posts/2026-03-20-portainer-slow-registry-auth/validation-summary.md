# Validation Summary: How to Fix Slow Stack Deployments Due to Registry Authentication - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker Engine
- Docker Compose
- Docker Registry / CNCF Distribution
- AWS ECR
- DNS

## Sources Consulted
- Portainer docs: API documentation index - https://docs.portainer.io/api/docs
- Portainer docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer docs: Add an AWS ECR registry - https://docs.portainer.io/admin/registries/add/ecr
- Portainer docs: Registries in Docker environments - https://docs.portainer.io/user/docker/host/registries
- Portainer docs: Stacks - https://docs.portainer.io/user/docker/stacks
- Portainer docs: Add a new stack - https://docs.portainer.io/2.21/user/docker/stacks/add
- Portainer source: registry create handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_create.go
- Portainer source: registry update handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_update.go
- Portainer source: ECR token refresh logic - https://github.com/portainer/portainer/blob/develop/api/internal/registryutils/ecr_reg_token.go
- Docker docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker docs: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker docs: docker compose - https://docs.docker.com/compose/reference/
- Docker docs: docker compose pull - https://docs.docker.com/reference/cli/docker/compose/pull/
- Docker docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker docs: daemon configuration and DNS troubleshooting - https://docs.docker.com/engine/daemon/ and https://docs.docker.com/engine/daemon/troubleshoot/
- Docker docs: mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution docs: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution docs: Registry as a pull through cache - https://distribution.github.io/distribution/recipes/mirror/
- AWS docs: Private registry authentication in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS docs: AuthorizationData API reference - https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_AuthorizationData.html

## Issues Found
- The containerized DNS timing example used `docker run --rm busybox time nslookup ...`, which is not a reliable invocation because `time` needs to run through a shell in that container context. I corrected it to `docker run --rm busybox sh -c 'time nslookup ...'`.
- The custom registry login example used `docker login ... -p password`. While the flag still exists, Docker documents `--password-stdin` as the correct non-interactive pattern. I changed the example accordingly.
- The post said Docker caches credentials in `~/.docker/config.json`. Docker's current documentation says credentials are stored in the configured credential store when one is configured, and only otherwise in `config.json`. I updated the explanation to reflect that.
- The AWS ECR section for Portainer was technically wrong. Portainer's current ECR support expects IAM access key, secret access key, and region, then refreshes the temporary ECR authorization token internally. I replaced the "update the ECR password token every 12 hours" guidance and the refresh script with a correct Portainer API example using `X-API-Key`, IAM credentials, and `Ecr.Region`.
- The registry mirror example used `registry:2`. Current CNCF Distribution deployment documentation uses `registry:3`, so I updated the example to the current image tag.
- The Compose parallel-pull section was incorrect on two points: `--parallel` is a global `docker compose` flag, not a `pull` subcommand flag, and Compose does not document pulls as sequential by default. I corrected the command to `docker compose --parallel 8 pull` and rewrote the explanation.
- The Docker daemon concurrency section implied that `max-concurrent-downloads` controls pulling multiple images simultaneously. Docker documents this as concurrent downloads for each pull, so I corrected the wording.
- The digest-pinning section overstated the performance benefit by claiming digest references avoid manifest lookup overhead and make auth faster. Docker documents digests primarily as immutable identifiers for deterministic pulls. I rewrote the section to reflect that.
- The conclusion repeated the misleading ECR token guidance. I updated it to say Portainer should be configured with IAM credentials for ECR so it can refresh temporary tokens automatically.

## Review Notes
- The `daemon.json` examples are valid standalone snippets, but if a host already has Docker daemon settings, the keys must be merged rather than blindly overwriting unrelated configuration.
- The local registry mirror guidance applies to Docker Hub pulls. Docker's current mirror documentation notes that pull-through caching does not extend to arbitrary private registries in the same way.
