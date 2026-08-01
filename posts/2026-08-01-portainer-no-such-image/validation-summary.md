# Validation Summary: Portainer “No Such Image”: Pull Policies, Registries, and Tags

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose
- Docker Swarm
- Container image registries
- Docker Buildx
- Multi-platform container images

## Sources Consulted
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer FAQ: Can I build an image while deploying a stack/application from Git? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer known issue: Docker Compose files including build steps fail - https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Docker Docs: Build, tag, and publish an image - https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Docker Docs: Compose interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker CLI reference: `docker compose config` - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose file reference: `pull_policy` - https://docs.docker.com/reference/compose-file/services/#pull_policy
- Docker Compose Build Specification - https://docs.docker.com/reference/compose-file/build/
- Docker CLI reference: `docker stack deploy` - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker CLI reference: `docker service ps` - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: Deploy services to a Swarm - https://docs.docker.com/engine/swarm/services/
- Docker CLI reference: `docker buildx build` - https://docs.docker.com/reference/cli/docker/buildx/build/
- CNCF Distribution: Registry HTTP API V2 - https://distribution.github.io/distribution/spec/api/

## Issues Found
- The environment-variable discussion said an empty variable creates a different image reference. Docker Compose substitutes an unset variable with an empty string by default, which can make this example an invalid image reference. Updated the text to distinguish invalid references caused by unset or empty values from valid but incorrect references caused by stale values.
- The `pull_policy` section could be read as applying to every Portainer stack type. Added that it applies to Docker Compose deployments such as Docker Standalone stacks, while `docker stack deploy` does not support `pull_policy` for Swarm stacks.
- A Git commit SHA used as a tag is not inherently immutable because registries can allow tags to be overwritten. Changed the recommendation to require registry-enforced tag immutability or a digest pin.
- The Swarm section stated that every image must be available from a registry. Swarm can use the exact cached image when it is already present, so the text now allows the deliberate preloading case while retaining a reachable registry as the normal deployment recommendation.

## Review Notes
- The Portainer remote-build limitation remains documented for versions 2.29.2 and later, and Portainer continues to recommend external builds as the stable workaround.
- Time-based Compose pull policies depend on the Compose implementation and version, as the post already notes.
- The multi-platform Buildx example is syntactically current; the configured builder still needs support for the requested target platforms.
