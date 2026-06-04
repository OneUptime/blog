# Validation Summary: How to Use Docker Compose cap_add and cap_drop

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Compose
- Linux capabilities
- Container security hardening
- Docker CLI

## Sources Consulted
- Docker Compose file reference, service `cap_add` and `cap_drop`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine `docker run` Linux capabilities reference: https://docs.docker.com/engine/containers/run/
- Docker Engine security documentation, Linux kernel capabilities: https://docs.docker.com/engine/security/
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local Docker CLI help for `docker run --cap-add`, `--cap-drop`, and `--security-opt`

## Issues Found
- Removed obsolete `version: "3.8"` lines from Compose examples because the Compose Specification now treats the top-level `version` property as obsolete and informational.
- Clarified `capsh --print` as showing current process capability sets, not an abbreviated list of all Linux capabilities.
- Changed the selective `cap_drop` example to drop capabilities that are actually in Docker's default kept set. `SYS_ADMIN`, `SYS_PTRACE`, and `SYS_MODULE` are not granted by Docker's default profile, so presenting them as default capabilities to drop was misleading.
- Clarified that low ports require `NET_BIND_SERVICE` on Linux systems where ports below 1024 are privileged, since container runtimes can alter that behavior with namespaced sysctls.
- Replaced the `strace -p 1` example because it would replace the container command with `strace` and attempt to attach to PID 1 inside the new container. The corrected example runs the target command under `strace` when `strace` is available in the image.
- Reworded the `pscap` paragraph because the provided commands inspect `/proc` capability bitmasks and decode them with `capsh`; they do not use `pscap`.

## Review Notes
The Compose snippets use valid `cap_add` and `cap_drop` keys and the `ALL` value is supported by Docker. The Nginx capability examples were also spot-checked locally with Docker Engine 29.4.2; dropping all capabilities without adding `CHOWN` caused the official `nginx:alpine` startup check to fail, while the corrected capability set passed `nginx -t`.
