# Validation Summary: How to Update a Running Container's Resource Limits in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Container cgroup resource limits
- CPU, memory, block I/O, PID, and restart policy configuration
- Shell scripting with Bash

## Sources Consulted
- Podman official documentation: `podman update` - https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman official documentation: `podman stats` - https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman official documentation: `podman container inspect` - https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html

## Issues Found
- The memory swap example used `podman update --memory-swap 1g mem-test` by itself. Official Podman documentation states that `--memory-swap` must be used with `--memory`, so the example was changed to `podman update --memory 512m --memory-swap 1g mem-test`.
- The "Listing All Updateable Resources" section claimed to list all resources updateable on a running container, but current Podman supports additional update options such as device I/O limits and healthcheck-related options. The wording was changed from "all resources" to "common resources" to avoid an inaccurate completeness claim.

## Review Notes
- Several resource update flags are not supported on cgroups v1 rootless systems, and some may require sufficient permissions. The post remains technically correct as a general guide, but future revisions could mention these environment-specific caveats.
