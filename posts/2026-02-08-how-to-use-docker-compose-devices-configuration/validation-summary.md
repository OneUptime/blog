# Validation Summary: How to Use Docker Compose devices Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose service `devices`
- Compose Deploy Specification GPU device reservations
- Linux device files and cgroup device rules
- udev rules
- USB, serial, sound, video, and NVIDIA GPU device access

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference for `devices`, `device_cgroup_rules`, and `group_add`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification for device reservations: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose GPU support guide: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine run reference for `--device`, default `rwm` permissions, `--group-add`, and privileged mode behavior: https://docs.docker.com/engine/reference/run/
- Local `docker compose config` output from Docker Compose v5.1.3
- Local `docker run --help` output
- Local `udevadm info`, `udevadm control`, and `udevadm trigger` help output

## Issues Found
- The NVIDIA GPU example and IoT sensor gateway example used `version: "3.8"`. Current Docker Compose treats the top-level `version` property as obsolete and ignores it, emitting a warning. Removed the `version` field from both snippets so the examples use the current Compose Specification format.

## Review Notes
- The `devices` syntax, default `rwm` permissions, explicit `r`, `rw`, and `rwm` examples, and `device_cgroup_rules` format match Docker's documented Compose behavior.
- The GPU reservation example matches Docker's current Compose GPU support guidance. It still requires the Docker host and NVIDIA runtime/toolkit prerequisites to be configured correctly.
- The `group_add` examples are valid Compose syntax; in real deployments, numeric GIDs are often more portable when host and container group names do not line up.
