# Validation Summary: How to Harden Podman Container Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- SELinux
- Linux user namespaces
- Containerfile / OCI image builds
- Docker Compose / Compose Specification
- Linux cgroups and resource limits

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman inspect documentation: https://docs.podman.io/en/v5.4.0/markdown/podman-inspect.1.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Debian apt-get documentation: https://www.debian.org/doc/manuals/apt-guide/ch2.en.html
- Ubuntu apt-get manpage: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html

## Issues Found
- The Debian/Ubuntu update command used `apt-get upgrade -y podman`, which is not the correct apt-get form for upgrading a named package. Changed it to `apt-get install --only-upgrade -y podman` after `apt-get update`.
- The runtime example used `--security-opt seccomp=default`. Podman documents `seccomp=unconfined` and `seccomp=profile.json`; the default seccomp profile is applied by default unless overridden. Removed the invalid explicit option.
- The Podman examples set `--memory-swap` equal to `--memory`. Current Podman documentation says `--memory-swap` is memory plus swap and must be larger than `--memory`. Changed the values to `512m` for a `256m` memory limit and `256m` for a `128m` memory limit.
- The read-only Nginx runtime example only mounted `/tmp` as tmpfs. Added tmpfs mounts for `/var/cache/nginx` and `/var/run`, matching the compose example and giving Nginx writable runtime/cache paths with a read-only root filesystem.
- The Compose example included `version: "3"`, which the current Compose Specification keeps only for backward compatibility and Docker documents as obsolete. Removed the top-level `version` field.

## Review Notes
- Docker Compose validation passed with `docker compose -f - config`.
- Podman is not installed in the local environment, so Podman command validation was performed against official Podman documentation rather than executing the examples locally.
