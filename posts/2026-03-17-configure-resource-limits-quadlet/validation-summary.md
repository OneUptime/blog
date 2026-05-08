# Validation Summary: How to Configure Resource Limits in Quadlet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Linux cgroups
- Container CPU, memory, PID, and block I/O limits

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman run documentation for CPU, memory, PID, and device I/O flags: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman inspect documentation: https://docs.podman.io/en/v5.4.0/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The post said resource limits are configured through `PodmanArgs` generally. Quadlet has dedicated keys for some relevant limits, including `Memory=` and `PidsLimit=`, while `PodmanArgs=` is documented as a way to pass Podman flags directly when needed. Updated the introduction and summary to reflect both mechanisms.
- The memory examples used `PodmanArgs=--memory=...`. Quadlet documents `Memory=` as the dedicated key equivalent to Podman's `--memory` option. Updated those examples to use `Memory=`.
- The PID limit example used `PodmanArgs=--pids-limit=200`. Quadlet documents `PidsLimit=` as the dedicated key equivalent to `--pids-limit`. Updated the example to use `PidsLimit=200`.
- The verification commands inspected `myapp`, but Quadlet's default container name is `systemd-%N` when `ContainerName=` is not specified. Updated the commands to inspect `systemd-myapp` and `systemd-worker`.
- The verification commands checked CPU limits on `myapp`, although the `myapp` example only configured memory limits. Updated the commands to check memory and swap on `systemd-myapp` and CPU limits on `systemd-worker`.

## Review Notes
The remaining `PodmanArgs` examples use current Podman flags documented for `podman run`. Some resource flags may be unavailable or restricted on certain rootless or cgroups v1 configurations; Quadlet itself requires cgroup v2.
