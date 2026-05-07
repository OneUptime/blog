# Validation Summary: How to View Pod Logs in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Pods
- Container logging
- CLI commands

## Sources Consulted
- Official Podman documentation: `podman pod logs` - https://docs.podman.io/en/latest/markdown/podman-pod-logs.1.html
- Official Podman documentation: `podman logs` - https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Official Podman documentation: `podman pod create` - https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Official Podman documentation: `podman run` - https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
No technical issues found.

## Review Notes
The local environment did not have the `podman` binary installed, so commands could not be executed directly. The examples were validated against the current official Podman CLI documentation. `podman pod logs -f` follows containers that are present when the command starts; if a new container is added to the pod while following logs, the command needs to be reinvoked for the new container's logs to appear.
