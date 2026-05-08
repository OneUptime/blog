# Validation Summary: How to Expose All Container Ports with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile EXPOSE instruction
- Container port publishing and inspection
- Shell commands

## Sources Consulted
- Podman `run` command documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `build` command documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Docker Dockerfile `EXPOSE` reference: https://docs.docker.com/reference/builder/#expose
- Podman source code for publish-all port mapping behavior: https://github.com/containers/podman/blob/main/pkg/specgen/generate/ports.go

## Issues Found
- The section "Combining -P with Manual Port Mappings" claimed that port 80 would be mapped both to the explicit host port 8080 and to a random host port from `-P`. Podman's port mapping implementation skips publish-all random assignment for a container port/protocol that is already covered by an explicit mapping. Updated the comment to state that port 80 uses the explicit 8080 mapping, while `-P` auto-assigns any other exposed ports.

## Review Notes
- The local environment did not have `podman` installed, so commands could not be executed locally. Validation was performed against official Podman documentation and Podman's current source code.
