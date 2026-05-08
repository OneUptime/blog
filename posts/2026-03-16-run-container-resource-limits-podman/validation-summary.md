# Validation Summary: How to Run a Container with Resource Limits in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux cgroups
- Container resource limits
- CPU, memory, block I/O, and PID controls

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman update documentation: https://docs.podman.io/en/latest/markdown/podman-update.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman pod stats documentation: https://docs.podman.io/en/latest/markdown/podman-pod-stats.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The combined limits example used `--memory 512m --memory-swap 512m`. Current Podman documentation defines `--memory-swap` as the memory-plus-swap limit and says it must be larger than `--memory`, so this was changed to `--memory-swap 1g`.
- The memory limit test used `dd if=/dev/zero of=/dev/null`, which streams bytes and does not allocate more than the container's memory limit. It was changed to a Python command that allocates a 256 MiB byte array under a 128 MiB memory limit.
- The pod stats example used `podman stats --filter "pod=my-pod"`, but the documented pod-scoped command is `podman pod stats`. It was changed to `podman pod stats --no-stream my-pod`.

## Review Notes
- Podman was not installed in the local review environment, so commands could not be executed locally. Validation was performed against the current official Podman documentation.
- Several resource limit options are not supported on cgroups v1 rootless systems, as noted in the official Podman documentation. The post already mentions cgroup versions at a high level, but this caveat may be worth expanding in a future revision.
