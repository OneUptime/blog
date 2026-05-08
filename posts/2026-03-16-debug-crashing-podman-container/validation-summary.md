# Validation Summary: How to Debug a Crashing Podman Container

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Linux containers
- Container logs and inspection
- Container filesystem export and copy operations
- Container networking
- Shell diagnostics

## Sources Consulted
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman diff documentation: https://docs.podman.io/en/latest/markdown/podman-diff.1.html
- Podman system df documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman cp documentation: https://docs.podman.io/en/v2.2.0/markdown/podman-cp.1.html
- Podman export documentation: https://docs.podman.io/en/v4.3/markdown/podman-export.1.html

## Issues Found
- The command override example said it ran a different command, but `podman run IMAGE COMMAND` only replaces the image command/CMD. If the image has an entrypoint, the supplied command is passed as arguments to that entrypoint. I clarified that the example applies when the image has no entrypoint.
- The manual diagnostic shell example used `podman run IMAGE /bin/bash -c ...`, which would not reliably start Bash for images with an entrypoint. I changed it to `podman run --entrypoint /bin/bash IMAGE -c ...` so the diagnostic shell is actually used.
- The connectivity example used `--network container:my-crashing-app` even though the post is about a crashed container. Podman's `container:id` network mode reuses another container's network stack, which is not appropriate once the target container has exited. I changed the example to run the debug container on the same user-defined network instead.

## Review Notes
Podman was not installed in the local workspace, so commands were validated against the official Podman documentation rather than local `--help` output. The remaining commands and flags reviewed are current and consistent with the documented Podman CLI behavior.
