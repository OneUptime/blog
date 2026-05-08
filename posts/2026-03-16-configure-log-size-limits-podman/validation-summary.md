# Validation Summary: How to Configure Log Size Limits for Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman logging drivers
- containers.conf
- Podman Compose / Compose logging configuration
- systemd-journald
- Bash shell commands

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.3.1/markdown/podman-compose.1.html
- containers/common `containers.conf` config package documentation: https://pkg.go.dev/github.com/containers/common/pkg/config
- Podman GitHub discussion on `max-file` support: https://github.com/containers/podman/discussions/20985
- systemd `journald.conf` documentation: https://www.freedesktop.org/software/systemd/man/journald.conf.html

## Issues Found
- The post described Docker-style `max-file` log rotation as supported by Podman. Official Podman documentation lists `path`, `max-size`, and `tag` as supported `--log-opt` names, and a Podman maintainer notes that there is no code handling `max-file`. I removed `max-file` examples and changed the explanation to Podman's `max-size` truncation behavior.
- The post implied `json-file` is a distinct Podman driver with rotation support. Podman documents `json-file` as an alias for `k8s-file`. I updated the driver example to say that explicitly and removed the unsupported rotation option.
- The log-size inspection commands assumed every container has a `.LogPath`. This is not true for journald-backed containers. I added checks for empty or missing log paths and noted that journald-managed logs are not file-based container logs.
- The post used `podman system df -v` as a way to check total container log usage. That command reports Podman storage usage, not a reliable total of container log files. I replaced it with a loop that sums file-based container log paths.
- The post suggested `podman info --format '{{.Host.LogSizeMax}}'` to verify `log_size_max`. Podman `info` documents host fields such as `LogDriver`, but not `LogSizeMax`. I replaced that with inspecting a newly created container's `.HostConfig.LogConfig.Size`.
- The sizing guidance calculated totals using `max-file`. Since Podman does not support `max-file`, I revised the examples to recommend per-file `max-size` values only.
- The Podman Compose example included unsupported `max-file` options. I removed those options and kept the supported `max-size` option.

## Review Notes
Podman's default log driver can vary by environment, though current Podman documentation shows journald as the default when available. File-size commands in the post apply to file-based logging such as `k8s-file`; journald deployments should manage retention through `journald.conf` settings such as `SystemMaxUse=`.
