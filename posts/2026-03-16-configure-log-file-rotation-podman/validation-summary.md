# Validation Summary: How to Configure Log File Rotation in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman logging drivers
- containers.conf
- systemd-journald
- Podman Compose / Compose logging configuration
- Shell commands

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.8.2/markdown/podman-run.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman-logs` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- containers.conf manual page: https://www.mankier.com/5/containers.conf
- systemd `journald.conf` manual page: https://www.freedesktop.org/software/systemd/man/249/journald.conf.html

## Issues Found
- The post claimed Podman supports `--log-opt max-file`. Current Podman documentation lists `path`, `max-size`, and `tag`, but not `max-file`. I removed `max-file` from examples and corrected the explanations.
- The post described Docker-style retained rotated files such as `.1` and `.2`. Podman's `log_size_max` behavior is documented as truncating and reopening the log file so the limit is not exceeded. I updated the workflow and examples to describe size limiting instead of retained file rotation.
- The post claimed `podman logs` automatically reads across rotated files. Since Podman does not provide the described `max-file` retained-file behavior, I changed this section to explain reading logs through Podman or reading the current k8s-file log directly.
- Several examples used `.LogPath`. The current documented inspect output exposes the path under `.HostConfig.LogConfig.Path`, so I updated the commands accordingly.
- The post treated `json-file` as a distinct log driver with separate rotation behavior. Podman documents `json-file` as an alias for `k8s-file`, so I clarified that relationship.
- The system-wide defaults section implied a `max-file` default. There is no such Podman `containers.conf` option in the consulted documentation, so I removed that note and retained the documented `log_size_max` setting.

## Review Notes
The corrected post now covers Podman's built-in log size limiting rather than multi-file log rotation. Users who need retained log history should use journald retention, external log collection, or a separate rotation strategy appropriate for their deployment.
