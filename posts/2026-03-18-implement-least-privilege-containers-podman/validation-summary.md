# Validation Summary: How to Implement Least Privilege Containers with Podman

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Podman
- Rootless containers and Linux user namespaces
- Linux capabilities
- seccomp profiles
- SELinux volume relabeling options
- Podman Quadlet / containers-systemd units
- Container resource limits and health checks

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-systemd.unit` / Quadlet official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman network create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman rootless mode documentation: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- containers/common seccomp profile repository: https://github.com/containers/common
- Linux kernel `no_new_privs` documentation: https://docs.kernel.org/userspace-api/no_new_privs.html

## Issues Found
- The resource-limit examples used `--memory-swap` values equal to `--memory`. Current Podman documentation defines `--memory-swap` as memory plus swap and says it must be larger than `--memory`, so I changed `512m/512m` to `512m/1g` and `256m/256m` to `256m/512m`.
- The Quadlet hardened-container example passed seccomp through `PodmanArgs` and omitted the native `SeccompProfile=` directive. I added `SeccompProfile=/usr/share/containers/seccomp.json` and kept only the remaining runtime options in `PodmanArgs`.
- The Quadlet example included an empty `AddDevice=` line. Since `AddDevice=` is for adding host device nodes and an empty assignment does not express a least-privilege control, I removed it.

## Review Notes
- Podman rootless behavior, capability flags, read-only filesystem flags, `no-new-privileges`, seccomp profile usage, network isolation examples, volume `ro,Z` options, health-check flags, and Quadlet keys were checked against official documentation and are technically valid.
- Resource-limit flags may not work on cgroups v1 rootless systems, and CPU limits can be unavailable to non-root users on some hosts. The post's examples are valid for current Podman on supported cgroups configurations.
- The custom seccomp profile is syntactically valid as an example, but real applications usually need profiles generated or tuned from observed syscall usage.
