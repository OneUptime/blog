# Validation Summary: How to Create a Pod with Resource Limits in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Linux containers
- Cgroups resource limits
- CPU, memory, swap, and PIDs limits

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pod create documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman pod stats documentation: https://docs.podman.io/en/v4.9.3/markdown/podman-pod-stats.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman update documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The post stated that resource limits are set on individual containers within a pod. Current Podman also supports pod-level shared CPU and memory limits during `podman pod create`, so the wording was changed to say that limits can be set on individual containers within a pod.
- The memory-limit test used `dd if=/dev/zero of=/dev/null`, which streams data and does not reliably allocate the requested amount of resident memory. The example now uses Python to allocate a 128 MB bytearray under a 64 MB memory limit, which better demonstrates an OOM condition.

## Review Notes
The examples use current Podman flags for container-level CPU, memory, swap, memory reservation, CPU shares, CPU sets, PIDs limits, stats, inspect, and update operations. Some resource-limit flags are not supported on cgroups v1 rootless systems, and current Podman also supports shared pod-level limits with `podman pod create --cpus` and `--memory`; the tutorial intentionally focuses on per-container limits inside the pod.
