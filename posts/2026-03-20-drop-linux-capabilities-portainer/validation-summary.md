# Validation Summary: How to Drop Unnecessary Linux Capabilities in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux capabilities
- Container hardening
- NGINX
- PostgreSQL
- Redis
- Pi-hole
- WireGuard

## Sources Consulted
- Docker Engine security: https://docs.docker.com/engine/security/
- Running containers: https://docs.docker.com/engine/containers/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker inspect reference: https://docs.docker.com/reference/cli/docker/inspect/
- Linux capabilities man page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- strace(1) man page: https://man7.org/linux/man-pages/man1/strace.1.html
- ping(8) man page: https://man7.org/linux/man-pages/man8/ping.8.html
- PostgreSQL Docker Official Image entrypoint: https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
- Redis Docker Official Image entrypoint: https://raw.githubusercontent.com/redis/docker-library-redis/master/docker-entrypoint.sh
- Redis Docker Official Image Dockerfile: https://raw.githubusercontent.com/redis/docker-library-redis/master/7.4/alpine/Dockerfile
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- wg-easy compose example: https://raw.githubusercontent.com/wg-easy/wg-easy/master/docker-compose.yml
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- Removed the obsolete top-level `version: "3.8"` keys from the Compose snippets. Current Compose treats `version` as informative and obsolete.
- Fixed the NGINX example. `nginx:alpine` listens on port 80 by default, so `8080:8080` conflicted with both the image behavior and the capability explanation. The mapping was corrected to `8080:80`, and the unsupported `CHOWN` recommendation was removed.
- Corrected the PostgreSQL example. The original text said PostgreSQL needed extra capabilities for "memory management" and listed `FOWNER` and `DAC_OVERRIDE` as required. The official image entrypoint shows the common first-start needs are ownership changes plus dropping to the `postgres` user, so the example was reduced to `CHOWN`, `SETUID`, and `SETGID`.
- Corrected the Redis example. The official Redis image starts as root and uses `gosu redis`; with `cap_drop: ALL`, a zero-capability example is only consistent if the container is started as the image's non-root `redis` user. The snippet now sets `user: "redis"`.
- Corrected the Pi-hole example. The original `NET_ADMIN` comment described iptables manipulation, which is not how the official docs justify it. The example now reflects a DNS-only deployment and notes when `NET_ADMIN` and `SYS_TIME` are actually needed.
- Updated the WireGuard comments so they match the capability purposes shown in the official `wg-easy` compose example more closely.
- Updated the `strace` troubleshooting command. The original used the deprecated `trace=process` form and implied `SYS_PTRACE` was needed for this usage. The example now uses current `%file`, `%network`, and `%process` selectors and traces the launched process directly.
- Replaced the `ping` verification for `NET_RAW`. Modern `ping` can use ICMP datagram sockets in some environments, so failure or success is not a reliable proof that `CAP_NET_RAW` is present or absent. The post now verifies the container configuration with `docker inspect`.
- Fixed the audit wording. Not using `cap_drop: [ALL]` does not mean a container has "ALL capabilities"; it means it has not dropped the full default capability set.
- Softened the conclusion so it no longer overstates that most database images run with zero capabilities; stateful images often need a small set during initialization.

## Review Notes
- The post is technically relevant and salvageable.
- Capability requirements depend heavily on image entrypoints, whether the process starts as root, and whether mounted data is already owned by the runtime user. The post now reflects that distinction more clearly.
- Some example image tags are illustrative rather than the newest releases as of 2026-05-01, but the corrected capability guidance does not rely on those exact tag versions.
