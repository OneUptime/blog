# Validation Summary: How to Troubleshoot Pod Startup Failures in Podman

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman pods and containers
- Podman CLI commands
- Container image pulls and registry login
- Container logs and events
- Bind mounts and SELinux volume labels
- Linux resource and port diagnostics

## Sources Consulted
- Podman `podman pod ps` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman `podman logs` documentation: https://docs.podman.io/en/stable/markdown/podman-logs.1.html
- Podman `podman events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman search` documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman kube play` documentation for init container support: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html

## Issues Found
- The post described a `Degraded` pod as meaning that one or more containers "failed." Podman's pod status handling is broader than that; degraded means one or more containers are not in the expected running state. Updated the wording to avoid overdiagnosing the cause.
- The exit code note for `125` said "Container failed to start." Podman's documented exit code meaning is that the error is with Podman itself or the container engine path before the container command runs. Updated the wording to "Podman or container engine error."
- The debug-shell command overrode the image entrypoint but did not override the image command. For an image such as `nginx:alpine`, the original command can still be passed as arguments to `/bin/sh`. Added `-l` so the command reliably starts a shell.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed directly. Validation was performed against current official Podman documentation. The `podman events --filter event=die` example is acceptable because the Podman documentation maps Docker-compatible `die` to Podman's `died` event status.
