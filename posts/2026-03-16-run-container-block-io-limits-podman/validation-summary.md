# Validation Summary: How to Run a Container with Block IO Limits in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups
- Block I/O resource controls
- Shell commands

## Sources Consulted
- Podman `run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `container inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `stats` official documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html

## Issues Found
- The read throughput and read IOPS examples used `dd if=/dev/zero of=/dev/null`, which does not perform reads from the limited block device and would not demonstrate `--device-read-bps` or `--device-read-iops`. Updated those examples to create a temporary file on the container filesystem and read it back with direct I/O so the examples exercise storage reads.

## Review Notes
- The Podman block I/O flags and inspect fields used in the post match the official Podman documentation.
- Podman documents these resource-limit options as unsupported on cgroups v1 rootless systems, and notes that some non-root environments may not allow resource-limit changes.
