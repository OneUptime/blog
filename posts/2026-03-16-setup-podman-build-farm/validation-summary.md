# Validation Summary: How to Set Up a Podman Build Farm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman farm
- Podman system connections
- SSH
- systemd user sockets
- Multi-architecture container image builds
- Container image manifests

## Sources Consulted
- Podman farm command documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-farm.1.html
- Podman farm build documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman farm create documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-farm-create.1.html
- Podman system connection add documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-inspect.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html

## Issues Found
- The post described `podman farm build` as only creating a local manifest list, then showed a separate `podman manifest push --all` step. Current Podman documentation says `podman farm build` builds on the farm nodes, pushes the architecture-specific images to the registry named by `--tag`, then creates and pushes the manifest list. I updated the build step comments, moved `podman login` before the build, and changed the follow-up step to inspect the manifest instead of pushing it again.
- The testing example used `-t test-multiarch:latest`, but `podman farm build` requires a full registry image name because farm build pushes directly to a registry. I changed the tag to `registry.example.com/test-multiarch:latest` and updated the manifest inspection command accordingly.

## Review Notes
- Podman was not installed in the local review environment, so CLI validation was performed against official Podman command documentation rather than local `--help` output.
- Podman farm machines must run Podman v4.9.0 or later according to the Podman farm documentation. The post does not state a version requirement, but the commands and workflow are otherwise current.
