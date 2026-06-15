# Validation Summary: How to Set Up Docker Container Capabilities

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux capabilities
- Linux namespaces
- seccomp
- Docker container security

## Sources Consulted
- Docker Docs: Running containers, runtime privilege and Linux capabilities - https://docs.docker.com/engine/containers/run/
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/
- Linux manual page: capabilities(7) - https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local Docker Engine 29.4.2 command checks for capability masks, NET_RAW behavior, NET_BIND_SERVICE behavior, NET_ADMIN behavior, and seccomp option handling.

## Issues Found
- The description and conclusion said capabilities grant privileges "without running as root." Docker `--cap-add` grants capabilities to the container, but non-root processes do not automatically get effective privileges simply because the container was started with `--cap-add`. Changed this wording to "without using privileged mode" / "without full privileged access."
- The default capability decoding command used double quotes around `sh -c`, causing the `$(...)` command substitution to run on the host shell before Docker starts the container. Changed it to single quotes so `/proc/1/status` is read inside the container.
- The `NET_RAW` drop example used `ping localhost`, but current Linux/Docker environments can allow ping through unprivileged ping sockets even without `NET_RAW`. Replaced the test with `tcpdump`, which requires raw/packet socket access and fails as expected without `NET_RAW`.
- The low-port binding test assumed binding to port 80 always fails without `NET_BIND_SERVICE`. Current Docker containers may set `net.ipv4.ip_unprivileged_port_start=0`, making low ports unprivileged inside the container. Added an explicit `--sysctl net.ipv4.ip_unprivileged_port_start=1024` to the failing test and clarified that the capability matters when privileged ports are enforced.
- The Compose hardening snippet included `security_opt: seccomp:default`, which Docker treats as a path named `default` and fails to open. Removed that invalid option because Docker applies the default seccomp profile unless it is overridden.
- The audit command placed `strace` where the image name belongs. Changed it to run `strace` as the command inside `myapp:latest`.
- Comments for `NET_RAW`, `NET_ADMIN`, and VPN/TUN setup were tightened to match the Linux capability definitions more accurately.

## Review Notes
The top-level `version: '3.8'` key in Compose examples is now informational/obsolete in modern Docker Compose, but it remains accepted for backward compatibility. Future edits could remove it to avoid Compose v2 warnings.
