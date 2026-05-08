# Validation Summary: How to Use the --mount Flag vs --volume Flag in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman CLI
- Container bind mounts
- Named volumes
- tmpfs mounts
- Volume driver options

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman --mount option documentation: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman --volume option documentation: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman volume create documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html

## Issues Found
- The post claimed `--volume` (`-v`) auto-creates missing host directories. Podman documentation states that missing host path sources return an error and users must pre-create source files or directories. Updated the table, auto-creation section, and summary.
- The `--mount` bind example was labeled equivalent to `:ro,Z` but used `bind-propagation=rprivate` instead of SELinux relabeling. Updated it to use `readonly=true,relabel=private`.
- The post claimed Podman `--mount` can pass volume driver options inline with `volume-opt=...`. Podman documents driver options on `podman volume create --opt`, not inline `--mount volume-opt`. Replaced the example with a `podman volume create` command followed by a `--mount type=volume` run command.
- Tightened minor syntax details: changed `-v` wording to "up to three fields," used documented boolean form `readonly=true`, used `100M` to match Podman examples, and renamed "Volume options" to "Mount options" in the comparison table.

## Review Notes
Podman was not installed in the local environment, so CLI behavior could not be tested with `podman run --help` or live containers. Review was based on official Podman documentation.
