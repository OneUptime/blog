# Validation Summary: How to Deploy and Update Portainer Stacks from a Git Repository

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Portainer
- GitOps
- Git
- Docker Compose
- Docker Standalone
- Docker Swarm
- Podman
- Container registries and OCI image tags/digests
- CI/CD webhooks and polling

## Sources Consulted

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add#option-3-git-repository)
- [Portainer: How do automatic updates for stacks/applications work?](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer: Inspect or edit a stack](https://docs.portainer.io/user/docker/stacks/edit)
- [Portainer: Stack webhooks](https://docs.portainer.io/user/docker/stacks/webhooks)
- [Portainer: Required Git provider token scopes](https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker Compose file reference: `image`](https://docs.docker.com/reference/compose-file/services/#image)
- [Docker: `docker stack deploy`](https://docs.docker.com/reference/cli/docker/stack/deploy/)
- [Docker Hub: Immutable tags](https://docs.docker.com/docker-hub/repos/manage/hub-images/immutable-tags/)

## Issues Found

- The post described a uniquely versioned image tag as inherently immutable. Docker tags are mutable by default unless immutability is enforced by the registry or by a release policy that prevents reuse. Changed both occurrences to "unique, never-reused image tag" while retaining digest pinning as the stronger content-identity option.

## Review Notes

- Current Portainer documentation marks stack webhooks as a Business Edition feature limited to non-Edge environments. The post correctly tells readers to verify edition, environment type, installed version, and network exposure requirements.
- `docker stack deploy` uses the legacy Compose v3 format rather than the latest Compose Specification, so Swarm users should continue validating their specific stack fields against Swarm support.
- The Compose tag and digest examples were rendered successfully with Docker Compose v5.1.4, and the documented `config --images` option is present.
