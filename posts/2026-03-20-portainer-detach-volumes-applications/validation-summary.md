# Validation Summary: How to Detach Volumes from Applications in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine API
- Docker volumes and container mounts
- Docker Compose stacks
- `curl` and `jq`

## Sources Consulted
- Portainer Documentation: Accessing the Portainer API — https://docs.portainer.io/api/access
- Portainer Documentation: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer Documentation: Edit a stack — https://docs.portainer.io/sts/user/docker/stacks/edit
- Docker Docs: Docker Engine API v1.51 reference — https://docs.docker.com/reference/api/engine/version/v1.51/
- Docker Docs: Storage in Docker — https://docs.docker.com/storage/
- Docker Docs: Compose file reference, volumes — https://docs.docker.com/reference/compose-file/volumes/

## Issues Found

1. **The Portainer API examples were ambiguous relative to current access-token usage.** The post used `Authorization: Bearer $TOKEN` without explaining JWT authentication via `/api/auth`. Updated the examples to use Portainer's documented access-token header, `X-API-Key`, and added a concrete `API_KEY` variable so the snippets are self-consistent.

2. **The container inspection example did not capture all configuration needed to recreate published ports.** It only extracted `HostConfig.PortBindings`. Updated the `jq` output to include `Config.ExposedPorts` as well, which matches Docker's container create schema.

3. **The container create payload contained invalid JSON and an incomplete port-publishing example.** The inline `#` comment inside the JSON body made the payload invalid, and the example omitted `ExposedPorts`. Removed the comment, added `ExposedPorts`, and captured the new container ID before calling the start endpoint.

4. **The stack editing instructions were too broad for Portainer.** Portainer's `Editor` tab is only available for stacks deployed with the Web Editor or an uploaded compose file. Updated the text to direct Git-backed stacks to edit the compose file in the repository and redeploy.

5. **The verification step assumed `.Mounts` should always be an empty array.** That is only true if the recreated container has no remaining mounts at all. Updated the example to inspect the mounts list and verify that the detached volume or mount path is no longer present.

## Review Notes
- The updated examples assume Portainer API access via an access token and the `X-API-Key` header. Portainer's API specification also defines JWT authentication via the `Authorization` header, but that flow requires obtaining a JWT from Portainer first and was not described in the post.
