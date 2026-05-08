# Validation Summary: How to Convert podman run Commands to Quadlet Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container configuration

## Sources Consulted
- Podman `podman-systemd.unit(5)` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The `pgdata.volume` example did not set `VolumeName=pgdata`. Quadlet-created volume units default to a `systemd-` prefixed Podman volume name, so the converted service would not use the original `pgdata` volume from the `podman run` command. Added `VolumeName=pgdata` to preserve the original named volume.
- The complex example used `PodmanArgs=--memory=512m` even though current Quadlet supports the native `Memory=` key. Changed it to `Memory=512m`.
- The mapping table omitted direct Quadlet mappings for `--tmpfs` and `--memory`, although both are used in examples and are documented as native Quadlet directives. Added `Tmpfs=` and `Memory=` rows.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against the official Podman documentation rather than local `podman --help` output.
- `PodmanArgs=--cpus=1.5` remains appropriate because current Quadlet container units do not document a native `Cpus=` equivalent.
