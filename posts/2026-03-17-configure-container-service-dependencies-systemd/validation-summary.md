# Validation Summary: How to Configure Container Service Dependencies with systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd unit dependencies
- systemctl user services
- systemd-analyze dependency graphs
- Podman Quadlet `.container` files
- Podman Quadlet `.network` files
- Podman health checks and sd_notify readiness

## Sources Consulted
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd-analyze official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html
- Podman Quadlet container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The complete multi-service example referenced `Network=appnet.network` but did not define the corresponding `appnet.network` Quadlet file. Podman Quadlet documentation states that a referenced `.network` file must exist. Added a minimal `appnet.network` example with `NetworkName=appnet`.
- The "Starting with Dependencies" example said "Start the webapp" while the command starts `api.service`. Updated the comment to say "Start the API".

## Review Notes
The dependency descriptions are accurate: `After=` controls ordering without pulling in another unit; `Wants=` and `Requires=` pull in dependencies with different failure behavior; and `BindsTo=` is appropriate for tighter lifecycle coupling, especially when combined with `After=`. `Notify=healthy` with a configured `HealthCmd=` is valid for Podman Quadlet and can make dependent units wait until the dependency is reported healthy.
