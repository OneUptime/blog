# Validation Summary: How to Recreate a Container with Updated Settings in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Engine API
- Docker Compose / Portainer stacks
- Bash
- `curl`
- `jq`
- YAML

## Sources Consulted
- Portainer Docs: Edit or duplicate a container - https://docs.portainer.io/2.27/user/docker/containers/edit
- Portainer Docs: Containers - https://docs.portainer.io/2.21/user/docker/containers
- Portainer Docs FAQ: How does the image update notification icon work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-does-the-image-update-notification-icon-work
- Portainer Docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs: Webhooks - https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: Webhooks - https://docs.portainer.io/2.27/user/docker/containers/webhooks
- Docker Docs: `docker container update` - https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Persisting container data - https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/
- Docker Docs: `docker compose up` - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: `docker container create` - https://docs.docker.com/reference/cli/docker/container/create/
- Docker Docs: `docker container start` - https://docs.docker.com/reference/cli/docker/container/start

## Issues Found
- The post said restart policy and resource limits require recreation. I corrected this because Docker supports changing restart policy and certain resource limits with `docker update`.
- The Portainer `Duplicate/Edit` workflow was described as requiring a manual stop before deploying the replacement container. I corrected this to match Portainer's documented `Deploy the container` then `Replace` flow, and clarified that duplicates need a different container name.
- The image update indicator was described as triggering an automatic pull and recreate. I corrected this because Portainer documents the indicator as an availability/recheck signal, not an automatic redeploy action.
- The blue-green API example created a container but never started it. I fixed the script to capture the returned container ID and call the start endpoint through Portainer's Docker API gateway.
- The stack redeploy section implied the in-UI Editor workflow always applies. I corrected this to distinguish Web Editor stacks from Git-backed stacks, which must be updated in the repository and then redeployed from Portainer.
- The stack redeploy explanation implied all containers are always stopped and recreated. I corrected it to reflect Compose behavior: changed services are recreated while mounted volumes are preserved.
- The webhook recommendation did not mention Portainer edition limits. I clarified that Portainer webhooks are a Business Edition feature.

## Review Notes
- The blue-green shell example assumes `curl` and `jq` are installed and that the application can be validated on an alternate host port before traffic is switched.
- Portainer's current stack-editing documentation contains some ambiguity around uploaded stacks versus Web Editor stacks, but Git-backed stack behavior is clearly documented and was reflected in the corrected post.
