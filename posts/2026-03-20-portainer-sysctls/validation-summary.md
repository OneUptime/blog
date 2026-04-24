# Validation Summary: How to Configure Sysctls for Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux sysctl
- Linux networking
- Linux IPC

## Sources Consulted
- Portainer documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer documentation: Add a new container - https://docs.portainer.io/2.27/user/docker/containers/add
- Docker CLI reference: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file reference: `services.sysctls` - https://docs.docker.com/reference/compose-file/services/
- Docker daemon reference: `dockerd` configuration - https://docs.docker.com/reference/cli/dockerd/
- Linux kernel documentation: IP sysctls - https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel documentation: `/proc/sys/net` - https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel documentation: `/proc/sys/vm` - https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux manual page: `sysctl(8)` - https://man7.org/linux/man-pages/man8/sysctl.8.html
- Linux manual page: `tcp(7)` - https://man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found
- The supported sysctl list was too loose and misclassified some keys. I corrected it to match Docker's documented namespaced support, including `fs.mqueue.*`, and removed the implication that most `fs.*` values are container-safe.
- The Redis/Kafka example used `vm.overcommit_memory` as a container sysctl and described it as related to Transparent Huge Pages. That is incorrect: `vm.overcommit_memory` is a host-level `vm.*` sysctl, and THP is controlled elsewhere. I removed that line from the container example.
- The low-latency example used `net.ipv4.tcp_low_latency` and `net.ipv4.tcp_nodelay`. `tcp_low_latency` is a legacy no-op, and `TCP_NODELAY` is a socket option rather than a sysctl. I replaced them with valid namespaced TCP sysctls.
- The web-server example comments were partially incorrect. I clarified that `tcp_fastopen` may also require application-level listener support, and fixed the `tcp_fin_timeout` comment because it affects orphaned `FIN_WAIT_2`, not `TIME_WAIT`.
- The Docker daemon section was inaccurate. Docker's current `dockerd` reference does not document a `default-sysctls` daemon setting in `daemon.json`, and non-namespaced sysctls are not something Docker supports via per-container `--sysctl`. I replaced that section with host-level Linux sysctl configuration using `/etc/sysctl.d` and `sysctl --system`.
- The verification example hard-coded a host default `net.core.somaxconn` of `128`, which is outdated on modern kernels. I changed it to a modern example value and marked it as an example.
- The post overgeneralized isolation by saying container sysctl values are independent of the host without qualification. I tightened that wording so it applies specifically to namespaced sysctls and added the documented `--network=host` / `--ipc=host` restrictions.

## Review Notes
- Example sysctl values are workload- and kernel-dependent. The post is technically correct after the fixes, but operators should still validate the exact values against their application vendor guidance and kernel version before using them in production.
- Docker documents `net.*` as supported namespaced sysctls, but network drivers and kernel/runtime combinations can still restrict specific keys. Testing on the target host remains necessary.
