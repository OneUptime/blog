# Validation Summary: How to Configure Log Drivers in Quadlet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container log drivers
- journald

## Sources Consulted
- Podman Quadlet container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman run documentation for log drivers and log options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The available log driver list omitted `passthrough-tty` and the `json-file` alias for `k8s-file`. Added both to match current Podman documentation.
- The examples and verification commands used `myapp` as the container name, but Quadlet defaults to a `systemd-` prefix unless `ContainerName=` is set. Added `ContainerName=myapp` to the snippets so `podman logs myapp`, `podman inspect myapp`, and the journald container-name filter are accurate.
- The log options section used `PodmanArgs=--log-opt=...` and included `max-files`, which is not listed as a supported Podman log option in the official documentation. Changed the example to use Quadlet's documented `LogOpt=max-size=10mb`.
- The summary referred to configuring log rotation with `--log-opt` options. Updated it to say log options are configured with `LogOpt` entries.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was checked against the current official Podman documentation rather than local `podman --help` output.
