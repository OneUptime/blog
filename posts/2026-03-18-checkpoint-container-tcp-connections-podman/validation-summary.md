# Validation Summary: How to Checkpoint a Container with TCP Connections in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman container checkpoint and restore
- CRIU checkpoint/restore
- TCP connection state and TCP repair mode
- Linux TCP keepalive sysctls
- Python socket and database retry examples

## Sources Consulted
- Podman checkpoint documentation: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` manual: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` manual: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU TCP connection documentation: https://criu.org/TCP_connection
- CRIU advanced usage documentation: https://criu.org/Advanced_usage
- CRIU CRIT documentation: https://criu.org/CRIT
- Linux `tcp(7)` manual: https://www.man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found
- The original long-lived connection example used `curl --keepalive-time` against the default nginx index page. That request normally completes and closes instead of leaving an established TCP socket for checkpoint testing. Changed it to open a TCP socket with Bash `/dev/tcp` and keep the process alive briefly.
- Current Podman checkpoint exports default to zstd compression. The examples used `.tar.gz` filenames without `--compress=gzip`, which would create misleading archive names. Updated the checkpoint archive examples to use `.tar.zst`.
- The database connection demo swallowed connection failures, so it could keep running without any established TCP connection. Updated it to use the configured host and port and fail if the connection cannot be established.
- The TCP keepalive section implied that sysctl settings alone make all TCP sockets detect dead peers. Linux keepalive timers apply to sockets with TCP keepalive enabled, so the text now states that caveat.
- The `ss` command may not exist inside minimal container images such as nginx alpine. Added a caveat before the `podman exec ... ss` example.

## Review Notes
Podman, CRIU, and crit were not installed in the local environment, so CLI behavior was verified against the current official Podman and CRIU documentation rather than local `--help` output. The Python retry example was syntax-checked locally.
