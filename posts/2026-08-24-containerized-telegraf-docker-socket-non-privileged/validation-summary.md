# Validation Summary: How to Give Containerized Telegraf Access to the Docker Socket Without Running `--privileged`

## Status
validated

## Post Type
Technical guide / container security tutorial

## Technologies Covered
- Telegraf 1.39 and the `inputs.docker` input plugin
- Docker Engine API and its Unix domain socket
- Docker Compose service configuration
- Docker CLI container execution and bind mounts
- Linux discretionary access control, numeric GIDs, and supplemental groups
- Docker Swarm service metrics
- Rootless Docker
- Podman and its Docker-compatible API
- Mutual TLS for remote Docker endpoints
- Docker authorization plugins

## Sources Consulted
- [Telegraf Docker input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/docker/) - checked the endpoint, Swarm setting, container filters, permissions guidance, and Podman compatibility.
- [Telegraf v1.39.3 Docker input sample configuration](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/docker/sample.conf) - checked the version-specific TOML keys and defaults.
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/) - checked `--config`, `--test`, and `--input-filter`.
- [Telegraf v1.39.3 release](https://github.com/influxdata/telegraf/releases/tag/v1.39.3) and [Docker Official Image tag manifest](https://github.com/docker-library/official-images/blob/master/library/telegraf) - confirmed that the `telegraf:1.39` image line is current and resolves to the 1.39 series.
- [Official Telegraf 1.39 Dockerfile](https://github.com/influxdata/influxdata-docker/blob/a2353390bbaca5b5b987453c2fe10fe38d2d8aab/telegraf/1.39/Dockerfile) and [entrypoint](https://github.com/influxdata/influxdata-docker/blob/a2353390bbaca5b5b987453c2fe10fe38d2d8aab/telegraf/1.39/entrypoint.sh) - checked the image command, entrypoint, and `telegraf` account execution behavior.
- [Docker Compose services reference](https://docs.docker.com/reference/compose-file/services/) - checked `user`, numeric `group_add`, volume short syntax, and read-only access mode.
- [Docker Compose variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) - checked `${DOCKER_GID}` interpolation.
- [Docker `container run` reference](https://docs.docker.com/reference/cli/docker/container/run/) - checked `--user`, `--group-add`, and the `--mount` form.
- [Docker `compose run` reference](https://docs.docker.com/reference/cli/docker/compose/run/) - checked `--rm`, `--entrypoint`, and one-off command placement.
- [Docker bind-mount documentation](https://docs.docker.com/engine/storage/bind-mounts/) - checked `readonly`/`ro` syntax and bind-mount behavior.
- [Docker Linux post-installation guidance](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user) and [Docker Engine security](https://docs.docker.com/engine/security/) - checked socket ownership, the `docker` group's root-level authority, and the daemon attack surface.
- [Docker authorization plugin documentation](https://docs.docker.com/engine/extend/plugins_authorization/) - checked the default all-or-nothing authorization model, granular request policy, and streaming/upgraded-connection limitations.
- [Docker daemon socket protection](https://docs.docker.com/engine/security/protect-access/) and [Docker rootless mode](https://docs.docker.com/engine/security/rootless/) - checked mutual TLS guidance and the security properties of a rootless daemon.
- [Podman system service documentation](https://docs.podman.io/en/latest/markdown/podman-system-service.1.html) - checked rootful and rootless API socket paths.
- [GNU Coreutils `stat` documentation](https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html) - checked `-c` and the `%a`, `%u`, `%g`, and `%n` format directives.
- [Linux `unix(7)` manual page](https://man7.org/linux/man-pages/man7/unix.7.html) and [Linux `getgroups(2)` manual page](https://man7.org/linux/man-pages/man2/setgroups.2.html) - checked pathname-socket permission enforcement and supplemental group semantics.

## Issues Found
No technical issues found.

## Review Notes
- The examples were also exercised with Docker Engine 29.4.3, Docker Compose 5.1.4, and the official `telegraf:1.39` image (Telegraf 1.39.3). The numeric supplemental group appeared in `id`, and Telegraf successfully polled the Engine through the read-only socket bind while running as `telegraf` without `--privileged`.
- `telegraf:1.39` is a mutable minor-series tag. It is valid as written, but deployments requiring byte-for-byte reproducibility should use an exact patch tag such as `1.39.3` or an image digest.
- The numeric-GID technique assumes a conventional rootful Linux Docker setup governed by normal Unix socket permissions. Rootless engines, user-namespace remapping, SELinux or another mandatory access-control policy, and Docker Desktop Enhanced Container Isolation can require different identity mapping or an explicit policy exception.
- Compose short bind-mount syntax can create a directory on the host when the source path does not exist. The post correctly tells readers to confirm the runtime and socket path; a future hardening refinement could use long syntax with `bind.create_host_path: false` so an incorrect path fails immediately.
- Mutual TLS authenticates clients and protects remote transport, but it does not make an authenticated Docker API client read-only. The post correctly treats authorization policy as a separate control and warns that ordinary daemon access remains powerful.
- Telegraf test mode selects only the Docker input with `--input-filter docker`, but configured processors and aggregators can still run. This does not invalidate the post's polling-input verification procedure.
