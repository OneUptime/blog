# Validation Summary: How to Configure Quadlet Container Dependencies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd unit dependencies
- systemctl user services
- PostgreSQL container health checks

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- systemd unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The dependency directive table described `After=` and `Before=` as if they start dependencies. Updated the descriptions to clarify that they only control ordering when both units are part of the transaction.
- The `Requires=` and `Wants=` descriptions were imprecise. Updated them to state that they pull in listed units and differ in failure handling.
- The sample explicitly set `Type=notify` in a `.container` Quadlet unit. Current Quadlet documentation says `.container` units default to `Type=notify`, and only calls out explicit `Type=oneshot` for containers that exit after running. Removed the redundant explicit service type.

## Review Notes
- The examples correctly use generated `.service` names such as `database.service` for dependencies between `.container` Quadlet files.
- The `Network=appnet.network` examples require a matching `appnet.network` Quadlet file to exist.
- `Notify=healthy` is valid with `HealthCmd` and delays startup notification until the container is healthy.
