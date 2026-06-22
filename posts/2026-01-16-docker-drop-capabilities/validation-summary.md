# Validation Summary: How to Drop Linux Capabilities in Docker Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux capabilities
- Alpine Linux package management
- libcap tools (`capsh`, `getpcaps`)

## Sources Consulted
- Docker Docs: Running containers, runtime privilege and Linux capabilities - https://docs.docker.com/engine/containers/run/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Linux man-pages: capabilities(7) - https://man7.org/linux/man-pages/man7/capabilities.7.html
- Linux man-pages: getpcaps(8) - https://man7.org/linux/man-pages/man8/getpcaps.8.html
- Alpine Linux package index: libcap/libcap-utils capabilities tools - https://pkgs.alpinelinux.org/
- Local Docker CLI checks with Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The Mermaid diagram used `CAP_NET_BIND`, which is not the Linux capability name. Changed it to `CAP_NET_BIND_SERVICE`.
- The Docker default capabilities table described `FSETID` as setting file capabilities. That describes `SETFCAP`; updated `FSETID` to preserving set-user-ID and set-group-ID bits.
- The post implied `NET_BIND_SERVICE` is always required for nginx on ports 80/443. Updated wording to say it is required when privileged ports are enforced, because modern Docker bridge containers commonly set `net.ipv4.ip_unprivileged_port_start` to `0`.
- The `nginx` examples that drop all capabilities and add only `NET_BIND_SERVICE` were incomplete for the default nginx image. Added `CHOWN`, `SETGID`, and `SETUID` where needed for nginx startup behavior.
- The capsh verification comment referenced `libcap-ng-utils`, while the Alpine command installs `libcap` and that package provides `capsh` and `getpcaps` in the tested Alpine image. Updated the comment.
- Removed obsolete Compose top-level `version: '3.8'` fields from examples; current Compose uses the Compose Specification and treats `version` as obsolete.

## Review Notes
Most examples are intentionally workload-dependent. The final capability set should still be tested per image and runtime because entrypoints, selected user, file ownership, port sysctls, seccomp, and read-only filesystem settings can change the required capabilities.
