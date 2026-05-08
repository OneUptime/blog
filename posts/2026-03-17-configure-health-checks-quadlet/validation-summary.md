# Validation Summary: How to Configure Health Checks in Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container health checks
- nginx
- PostgreSQL
- Redis

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman healthcheck documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman healthcheck run documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman run health check option documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html

## Issues Found
- The `podman healthcheck run webapp` and `podman inspect webapp` commands referenced a container named `webapp`, but Quadlet names containers `systemd-<unit-name>` by default unless `ContainerName=` is set. Added `ContainerName=webapp` to the webapp example so the later commands target the correct container.
- The nginx example used `curl` inside the container. Health check commands run inside the container, and the stock nginx image should not be assumed to include `curl`. Changed the command to `nginx -t || exit 1`, which uses the nginx binary included in the image.

## Review Notes
- The listed Quadlet health check directives match current Podman Quadlet documentation and map to Podman's health check options.
- `Restart=on-failure` alone does not make systemd restart a container when Podman marks it unhealthy; that requires configuring a health failure action such as `HealthOnFailure=kill`. The post does not claim automatic restart on unhealthy state, so no change was required.
