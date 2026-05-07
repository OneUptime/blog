# Validation Summary: How to Add Linux Capabilities to a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux capabilities
- libcap tools (`capsh`, `getpcaps`)
- Linux sysctl settings
- Container privilege and security configuration

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- containers/common `containers.conf` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Linux `capabilities(7)` manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local `capsh --help` and `getpcaps --help` output from libcap

## Issues Found
- `capsh --print` was described as listing all available Linux capabilities. It actually prints the current process capability state. Updated the wording to say it inspects the current shell's capability sets.
- The post implied `NET_BIND_SERVICE` is not normally present by default in Podman containers. Podman's documented default capability list commonly includes `NET_BIND_SERVICE`, so the examples now describe adding it back after dropping capabilities.
- The web server example claimed a default Podman container running as a non-root user would fail on port 80 until `NET_BIND_SERVICE` was added. This was too broad because Podman defaults and network namespace sysctls affect the behavior. Updated the example to explicitly drop capabilities and set `net.ipv4.ip_unprivileged_port_start=1024` for the demonstration.
- The description of `NET_ADMIN` as allowing network statistics reads was imprecise. Updated it to network administration tasks, matching `capabilities(7)`.
- The `--cap-add ALL` section said this effectively gives full root privileges. Updated it to say it grants every capability available to the container, while noting that it is still not the same as `--privileged`.
- The inspect section only mentioned `HostConfig.CapAdd`. Added `EffectiveCaps` because Podman documents it as the resulting effective capability set.

## Review Notes
Podman was not installed in the review environment, so Podman command behavior was checked against current official documentation rather than executed locally. The libcap helper commands were checked locally.
