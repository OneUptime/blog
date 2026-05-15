# Validation Summary: How to Set Up Podman Auto-Updates for Containers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Podman auto-update
- Quadlet / podman-systemd.unit
- systemd services and timers
- Container health checks

## Sources Consulted
- Podman official documentation: podman-auto-update(1), https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- Podman official documentation: podman-systemd.unit(5) / Quadlet, https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, sections on automatically updating containers using Podman and systemd, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/

## Issues Found
- The post implied that adding `io.containers.autoupdate=registry` to a standalone `podman run` container is sufficient. Podman auto-update requires the container or workload to run inside a systemd unit that can be restarted to create a new container. I added that requirement to the setup section and clarified that auto-update restarts the systemd unit.
- The registry-policy example used an unqualified image name. Podman's registry auto-update policy requires a fully qualified image reference, so I changed the example to `registry.example.com/myapp/web:latest`.
- The rollback explanation claimed that failed health checks directly cause Podman auto-update rollback. Official Podman documentation says rollback happens when restarting the systemd unit fails, and recommends readiness signaling with `sd_notify` for reliable startup failure detection. I updated the diagram and rollback section to reflect that behavior and added `HealthOnFailure=kill` to the health-check example.
- The health-check example used `curl` inside the `nginx` container, which is not guaranteed to be available in the official image. I changed the command to `nginx -t`, which uses the image's own nginx binary.
- The Quadlet start command used `systemctl --user start web`. I changed it to `systemctl --user start web.service` to match the generated service name used by the official examples.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- RHEL 9 documentation still shows the older `io.containers.autoupdate=image` label in some examples; current upstream Podman documents `registry` as the primary policy and notes `image` is retained for backward compatibility.
