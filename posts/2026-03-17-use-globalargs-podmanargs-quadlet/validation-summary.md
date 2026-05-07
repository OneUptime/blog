# Validation Summary: How to Use GlobalArgs and PodmanArgs in Quadlet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container CLI arguments and configuration

## Sources Consulted
- Podman official Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman official `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official global options documentation: https://docs.podman.io/en/latest/markdown/podman.1.html

## Issues Found
- The post implied `PodmanArgs` should generally be used for options such as memory limits, capabilities, ulimits, sysctls, DNS, hostnames, and entrypoints. Current Quadlet documentation provides dedicated directives for many of those options, so the README now says to prefer dedicated Quadlet directives when they exist.
- The `PodmanArgs` explanation said arguments are appended to `podman run` without clarifying placement. The README now states they are added before the image name, matching the official Quadlet documentation.
- The example used `PodmanArgs=--ulimit=nproc=4096:4096`. Podman documentation advises against using `nproc` with `--ulimit` for container process limits and recommends `--pids-limit`, so the example was changed to `PodmanArgs=--pids-limit=4096`.
- The first `PodmanArgs` example used several options that now have dedicated Quadlet keys. It was adjusted to use valid raw `podman run` flags that better demonstrate pass-through arguments.

## Review Notes
The remaining `PodmanArgs` examples are syntactically valid Podman flags, but several have first-class Quadlet equivalents. The post now calls this out explicitly so readers understand that `PodmanArgs` is best reserved for raw Podman flags that Quadlet does not model directly.
