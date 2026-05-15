# Validation Summary: How to Run Podman Containers as systemd Services Using Quadlet on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Quadlet
- systemd
- Linux containers

## Sources Consulted
- Podman `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-auto-update` documentation: https://docs.podman.io/en/v5.2.3/markdown/podman-auto-update.1.html
- Podman `podman-run` documentation for health checks: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-generate-systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Red Hat Enterprise Linux 9 container management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers

## Issues Found
- The first nginx example referenced `web-data.volume` before the tutorial created that Quadlet volume file. Removed that volume reference from the basic container example so the start command works as written.
- The rootless startup instructions used `systemctl --user enable nginx` as the boot-enablement step. Updated this to `sudo loginctl enable-linger "$USER"` and clarified that the Quadlet `[Install]` section supplies the target relationship for the generated unit.
- The environment-file guidance said `EnvironmentFile=` could be used in `[Service]` or `[Container]` to pass variables to the container. Updated it to use `[Container]`, where Quadlet maps it to Podman's `--env-file`.
- The health check used `curl` inside the official nginx image, where `curl` should not be assumed to exist. Changed the example to `HealthCmd=nginx -t`, which uses the nginx binary provided by the image.
- The rootful file creation example used `sudo cat > /etc/containers/systemd/monitoring.container`, but shell redirection would still run as the unprivileged user. Replaced it with `sudo tee ... > /dev/null`.
- The dependency example used generated service names directly. Changed it to depend on the other Quadlet file name, `database.container`, so Quadlet can translate the dependency to the generated service.
- The debugging command used an older/non-current Quadlet executable path. Replaced it with the current documented generator dry-run command: `/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun`.

## Review Notes
- The post is accurate after the corrections above. Future improvements could mention that Quadlet is available in RHEL beginning with Podman 4.6 and that rootless services only run before login when user lingering is enabled.
