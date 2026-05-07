# Validation Summary: How to Run Rootless Podman Containers That Survive Logout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman rootless containers
- Podman Quadlet
- systemd user services
- loginctl linger
- journald / journalctl

## Sources Consulted
- Podman `podman-generate-systemd(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman `podman-systemd.unit(5)` official Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-container.unit(5)` official Quadlet container documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman `podman-pod.unit(5)` official Quadlet pod documentation: https://docs.podman.io/en/latest/markdown/podman-pod.unit.5.html
- Local `loginctl(1)` man page for `enable-linger`
- Local `logind.conf(5)` man page for session process cleanup and linger behavior
- Local `systemctl --help` and `journalctl --help` output for user service and journal commands

## Issues Found
- The post recommended `podman generate systemd`, which current Podman documentation marks as deprecated in favor of Quadlet. I replaced the generated systemd workflow with Quadlet `.container` and `.pod` examples under `~/.config/containers/systemd/`.
- The original text stated too absolutely that systemd kills all user processes on logout. I softened this to reflect systemd/logind behavior more accurately: processes in the login session scope can be cleaned up, while linger keeps the user manager available for long-running user services.
- The original example said the test container could be "stopped or missing" after logout even though a directly started container without `--rm` should remain in container storage and show as stopped. I changed this to "stopped."
- The examples used unqualified image names such as `nginx` and `postgres:16`. I changed them to fully qualified Docker Hub references to avoid short-name resolution ambiguity.
- The summary promised restart-on-failure behavior. I added explicit `Restart=on-failure` entries in the Quadlet examples.

## Review Notes
Podman was not installed in the local environment, so Podman CLI behavior was verified against the current official Podman documentation rather than local `podman --help` output. The local systemd tools were available and used for `loginctl`, `systemctl`, and journald command validation.
