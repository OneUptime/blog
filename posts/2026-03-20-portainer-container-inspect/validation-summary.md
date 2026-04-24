# Validation Summary: How to View Container Details and Inspect JSON in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Engine inspect output
- `jq`

## Sources Consulted
- Portainer Documentation, "View a container's details": https://docs.portainer.io/2.33-lts/user/docker/containers/view
- Portainer Documentation, "Inspect a container": https://docs.portainer.io/user/docker/containers/inspect
- Docker Docs, "`docker inspect`": https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs, "Deprecated Docker Engine features": https://docs.docker.com/engine/deprecated/
- Docker Docs, "`docker container ls`": https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Engine API v1.51 OpenAPI spec: https://docs.docker.com/reference/api/engine/version/v1.51.yaml

## Issues Found
- The post referred to an "Overview" tab on the container page. Portainer's current docs document a container details page and a separate Inspect view, so this was corrected to "Container Details Page" and softened to note that visible fields can vary by container and environment.
- The post said clicking **Inspect** shows the full JSON directly. Portainer's docs state the Inspect view opens in a tree view and the raw JSON is shown after clicking **Text**, so this was corrected.
- The CLI example used `NetworkSettings.IPAddress` as the primary lookup path. Docker marks top-level `NetworkSettings` IP and MAC properties as deprecated in favor of per-network data under `NetworkSettings.Networks`, so the example was updated to extract IP addresses by network.
- The explanation for `ExitCode: 137` said it meant OOM or manual kill. Docker's docs document `137` as a `SIGKILL` exit and list additional causes such as Docker daemon restarts, so the explanation was expanded.
- The post described `docker inspect ... | jq '.[].Image'` as returning the exact image digest for pinned deployments. Docker's Engine API distinguishes the container's image ID from image manifest digests in `RepoDigests`, so the example was replaced with an image-inspect command that reads `RepoDigests` when available.
- One navigation snippet was labeled as a `bash` block even though it was plain UI text. This was corrected to a `text` block so the example is syntactically accurate.

## Review Notes
- Docker may still expose deprecated top-level network properties in inspect output for backward compatibility, but automation should prefer `NetworkSettings.Networks`.
- `RepoDigests` may be empty for locally built images or images that were never pulled from or pushed to a registry.
