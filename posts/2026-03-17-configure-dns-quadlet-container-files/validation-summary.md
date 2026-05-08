# Validation Summary: How to Configure DNS in Quadlet Container Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet container units
- Podman networking
- DNS resolver configuration
- systemd user services

## Sources Consulted
- Podman `podman-systemd.unit` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html

## Issues Found
- The verification commands used `podman exec myapp ...`, but Quadlet names containers `systemd-<unit>` by default unless `ContainerName=` is set. Added `ContainerName=myapp` to the first complete example so the verification commands match the generated container.
- The custom network examples used `Network=mynet.network`, which is valid only when a matching `mynet.network` Quadlet unit exists. Changed these examples to `Network=mynet`, matching Podman's normal custom network name form and avoiding an undeclared Quadlet network dependency.

## Review Notes
Podman's official documentation confirms that `--dns`, `--dns-search`, and `--dns-option` are valid `podman run` flags and that Quadlet `PodmanArgs=` can pass unsupported container options through to `podman run`. Podman documents `PodmanArgs=` as not generally recommended because Quadlet cannot reason about unexpected interactions, but its use here is technically valid for options without dedicated Quadlet container keys.
