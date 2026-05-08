# Validation Summary: How to Restart a Container in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Podman restart policies
- Quadlet
- systemd user services
- Bash scripting

## Sources Consulted
- Podman `podman-restart` official documentation: https://docs.podman.io/en/latest/markdown/podman-restart.1.html
- Podman restart policy official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html#restart-policy
- Podman `podman-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman Quadlet / `podman-systemd.unit` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-generate-systemd` official documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- systemd `loginctl` manual page from the local environment

## Issues Found
- The post described `podman restart --all` as restarting every running container. Official Podman documentation says `--all` restarts all containers regardless of state, while `--running` restarts containers that are already running. Changed the example to `podman restart --running`.
- The post said `podman restart` is equivalent to `podman stop && podman start` without qualifying that this only applies cleanly to running containers. Updated the wording to clarify the running-container case.
- The post claimed `podman restart` is atomic and slightly faster. The official documentation describes it as stopping and restarting containers, but does not document atomic behavior. Replaced the claim with a concrete behavior difference: `restart` is shorter and can start stopped containers, while the chained command only runs `start` if `stop` succeeds.
- The `--restart always` example comment said "unless explicitly stopped", which is easy to confuse with `unless-stopped`, especially for reboot behavior. Changed it to "Always restart when the container exits."
- The Quadlet user-service example was intended to start after host reboot, but user services require lingering if they must start without an active login session. Added `loginctl enable-linger "$USER"` with a brief comment.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The Quadlet example uses current Podman guidance; `podman generate systemd` is correctly described as deprecated in favor of Quadlet.
