# Validation Summary: How to Debug Failed Podman Builds

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile image builds
- Linux package managers (`apt`, `apk`)
- Container image layers and intermediate build containers
- Podman event monitoring and storage cleanup

## Sources Consulted
- Podman build reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman events reference: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman start reference: https://docs.podman.io/en/stable/markdown/podman-start.1.html
- Podman system prune reference: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman system df reference: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The post said `--rm=false` alone keeps containers from failed build steps. Podman documents `--rm` as controlling successful builds, while `--force-rm` controls removal after failed builds and defaults to true. Updated the guidance and command to use `--rm=false --force-rm=false`.
- The post described `podman start -ai <container-id>` as starting a shell in the failed container filesystem. `podman start` starts the existing container command and attaches; it does not replace the command with a shell. Updated the wording to say it re-runs the failed container's original command interactively.
- The Alpine debug Containerfile ran `npm install` but only installed `curl`. Updated the package install command to include `nodejs` and `npm`.
- The events example used `podman events --filter event=build`, but `build` is not a documented event status filter. Updated it to monitor container events with `podman events --filter type=container`, which aligns with build `RUN` instructions creating build containers.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against current official Podman documentation rather than local `--help` output.
