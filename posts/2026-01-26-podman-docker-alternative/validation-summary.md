# Validation Summary: How to Use Podman as Docker Alternative

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker CLI compatibility
- Docker Compose / Compose Specification
- podman-compose and `podman compose`
- Rootless containers
- Podman pods
- Container networking
- Container volumes and SELinux volume labels
- Dockerfile / Containerfile image builds
- systemd and Quadlet

## Sources Consulted
- Podman documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman build documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman ps documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman top documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- Podman compose documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman generate systemd documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman Quadlet / systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman network connect documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-network-connect.1.html
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described Podman rootless containers as "rootless by default." Podman can run as a regular user and has strong rootless support, but whether it runs rootless depends on invoking it as a non-root user. Updated the wording to "rootless support."
- The pod explanation said pods share "network and storage namespaces." Podman pods share a network namespace and can share volumes, but storage is not accurately described that way. Updated the wording.
- The Compose section described `podman compose` as built-in/native Compose support and tied it to Podman 3.0+. Current Podman documentation describes `podman compose` as a wrapper around an external Compose provider such as `podman-compose` or `docker-compose`. Updated the text and migration table.
- The Compose YAML used the top-level `version: '3.8'` field. Docker's current Compose documentation marks the top-level `version` property as obsolete and informative only. Removed it from the example.
- The systemd section used `podman generate systemd` as the recommended workflow. Current Podman documentation marks `podman generate systemd` as deprecated and recommends Quadlet files for containers and pods under systemd. Replaced that section with a Quadlet-based example.
- The summary referred to generating systemd services as a current Podman capability. Updated it to refer to Quadlet support.

## Review Notes
- Most basic Podman CLI examples, including `run`, `ps`, `logs`, `stop`, `rm`, `build`, `push`, `volume`, `network`, `inspect`, `exec`, `stats`, `top`, `export`, `diff`, `save`, `load`, and `history`, match current Podman command syntax.
- The `podman generate systemd` command still exists, but it is deprecated and receives only urgent bug fixes, so the post now uses the current recommended Quadlet workflow.
