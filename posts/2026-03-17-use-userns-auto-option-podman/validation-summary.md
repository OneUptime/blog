# Validation Summary: How to Use the --userns=auto Option in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux user namespaces
- Rootless containers
- Subordinate UID/GID mappings
- containers.conf

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `--userns` option documentation: https://docs.podman.io/en/stable/markdown/options/userns.container.html
- containers/common `containers.conf` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md

## Issues Found
- The post stated that `--userns=auto` ensures containers cannot access each other's files. This was too absolute because file access still depends on reachable paths, Unix permissions, mounts, labels, and other controls. Updated the wording to say auto mode helps prevent containers from sharing the same host UID ownership.
- The post stated that auto mode allocates 65536 UIDs per container by default. Current Podman documentation says Podman estimates the namespace size from the image unless `size=SIZE` is specified. Updated the comments accordingly.
- The prerequisite section used the 65536 value as though it were the default. Updated the example to make clear it applies to containers explicitly using `size=65536`.
- The service example claimed a compromised web container cannot access database files. Updated this to the more precise claim that the web container cannot use the same host UID mapping as the database container's root user.
- The comparison and summary described auto mode as "maximum" isolation and said it prevents compromised containers from accessing files. Updated this to "stronger UID/GID isolation" and clarified that it helps prevent access through shared host UID mappings.

## Review Notes
Podman was not installed in the local environment, so command validation was performed against the current official Podman documentation rather than local `podman --help` output. The `--userns=auto:size=...` syntax, `containers.conf` `[containers] userns = "auto"` setting, and `podman system migrate` command are consistent with documented Podman behavior.
