# Validation Summary: How to Configure the passthrough Log Driver in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman log drivers
- containers.conf
- systemd user services
- journald
- Compose / Podman Compose

## Sources Consulted
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-logs(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman `podman-compose(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Compose Specification logging section: https://compose-spec.github.io/compose-spec/spec.html#logging
- containers/common `containers.conf(5)` upstream documentation: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md

## Issues Found
- The post used `--log-driver passthrough` with `podman run -it`, but current Podman documentation states that `passthrough` is not allowed on a TTY. Updated the interactive TTY example to use `passthrough-tty` and added brief notes distinguishing TTY usage.
- The post described `k8s-file` as the default log driver. Current Podman documentation treats the default as configuration/platform dependent, with journald commonly used when available. Updated comments to refer to the configured default and changed the performance example to describe `k8s-file` as an explicit driver.
- The systemd service example wrote into `~/.config/systemd/user` without ensuring the directory exists. Added `mkdir -p ~/.config/systemd/user` before creating the service file.
- The performance example described the `none` driver as discarding output. In foreground runs, output can still be attached to the terminal; the driver disables log storage. Updated the comment to say `none` has no log storage.

## Review Notes
Podman was not installed in the local workspace, so command behavior was validated against current official documentation rather than local `--help` output. Podman Compose support depends on the configured external compose provider, as documented by `podman compose`; the Compose logging syntax itself is valid, but provider behavior can vary.
