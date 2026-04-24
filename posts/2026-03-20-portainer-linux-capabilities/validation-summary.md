# Validation Summary: How to Configure Linux Capabilities for Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux capabilities
- seccomp
- AppArmor

## Sources Consulted
- Portainer docs, "Add a new container": https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer docs, "Advanced container settings": https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs, "Running containers": https://docs.docker.com/engine/containers/run/
- Docker Docs, "Services" (Compose file reference): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Docker Engine security": https://docs.docker.com/engine/security/
- Docker Docs, "Seccomp security profiles for Docker": https://docs.docker.com/engine/security/seccomp/
- Docker Docs, "AppArmor security profiles for Docker": https://docs.docker.com/engine/security/apparmor/
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Linux kernel docs, "IP Sysctl" (`ip_unprivileged_port_start`, `ping_group_range`): https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
- The backup example granted `SYS_RAWIO` for "Direct I/O operations". That capability is for raw I/O and port-level operations, not ordinary backup/file-read behavior. I removed it and left `DAC_READ_SEARCH`, which matches the stated use case.
- The NTP example added `NET_ADMIN`, but the action described was setting the system clock. `SYS_TIME` is the relevant capability for that. I removed `NET_ADMIN` as an unnecessary extra privilege.
- The web-server section stated too absolutely that non-root users can only bind above port 1024. I corrected this to account for environments where the privileged-port threshold may differ because of runtime or sysctl behavior.
- The ping example comment said `NET_RAW` was strictly required. I softened that to "needed when ping uses raw sockets" because ICMP behavior can also depend on `ping_group_range`.
- The section titled "Using seccomp and AppArmor Together" only demonstrated seccomp. I added an explicit AppArmor profile entry so the example now matches the section heading and conclusion.

## Review Notes
- The Docker default capability list in the post matches the current Docker documentation.
- `cap_add`, `cap_drop`, `security_opt`, `tmpfs`, and `user` are valid Compose service keys in current Docker Compose documentation.
- AppArmor settings apply only on Linux hosts with AppArmor enabled. Using `apparmor:docker-default` in the example makes the AppArmor layer explicit; on many Docker hosts that profile is already the default.
- Low-port binding and `ping` behavior can vary by kernel and runtime configuration, especially around `ip_unprivileged_port_start` and `ping_group_range`.
