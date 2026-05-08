# Validation Summary: How to Configure Secret File Permissions in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman secrets
- Container file permissions
- Linux UID, GID, and file modes

## Sources Consulted
- Podman run documentation, `--secret` option: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html#secret-secret-opt-opt
- Podman secret create documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html

## Issues Found
- The post stated that default secret file permissions allow the container's root user to read mounted secrets. Podman documents mounted secret defaults as `uid=0`, `gid=0`, and `mode=0444`, which makes the file readable by users inside the container, not only root. Updated the default-permissions explanation to reflect the documented defaults.

## Review Notes
- The `--secret` options used in the examples (`mode`, `uid`, `gid`, and `target`) match the official Podman run documentation for mounted secrets.
- Podman was not installed in the local review environment, so command behavior was verified against official documentation rather than local `--help` output.
