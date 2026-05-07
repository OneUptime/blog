# Validation Summary: How to Use Podman for Socket Activation

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Podman
- systemd socket activation
- systemd service and socket units
- Podman Quadlet
- Rootless Linux containers
- Python example workloads inside containers

## Sources Consulted
- Podman `podman system service(1)`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Quadlet / `podman-systemd.unit(5)`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman run(1)` for `--preserve-fds`: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman generate systemd(1)`: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- systemd `systemd.socket(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html
- systemd `systemd.service(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- Verified locally against `man systemd.socket`, `man systemd.service`, and `man systemctl`

## Issues Found
- The original main service example paired a `.socket` unit with an `nginx` container that never consumed the inherited socket. I replaced it with a minimal Python container example that uses `--preserve-fds=1` and accepts the socket on file descriptor 3, because systemd keeps the port open and a plain `podman run nginx` would not bind successfully.
- The original Quadlet example mixed `.socket` activation with `PublishPort=` and included `[Install] WantedBy=default.target` in the `.container` file. I replaced it with a socket-aware Quadlet example and removed the eager-start install stanza, because a socket-activated Quadlet should be started by the socket rather than by `default.target`.
- The advanced rate-limiting snippet used `MaxConnections=` and `MaxConnectionsPerSource=` with `Accept=no`, but those directives only apply to `Accept=yes` sockets. I removed them and documented the limitation.
- The socket permissions snippet applied `SocketUser=`, `SocketGroup=`, and `SocketMode=` to a TCP listener. I changed it to a Unix socket example, since those settings apply to filesystem sockets and FIFOs.
- The generated-systemd section implied that a generated unit can simply be “enhanced with socket activation.” I clarified that socket activation still requires a workload that handles inherited sockets.
- The monitoring example used `systemctl show --output=json` while parsing `key=value` output. I corrected it to request explicit properties from `systemctl show`.
- The idle-timeout section used `TimeoutIdleSec=` in a `.service` unit. I replaced it with correct guidance noting that `TimeoutIdleSec=` is not a service directive and referenced `podman system service --time` as the supported built-in idle-shutdown example.
- The development automation script suggested that ordinary published-port containers such as PostgreSQL, Redis, and MailHog can be made socket-activated just by adding `.socket` units. I replaced it with a warning explaining why that pattern does not work without a socket-aware workload or proxy.

## Review Notes
- `podman generate systemd` is deprecated but still supported; the post now reflects the current recommendation to prefer Quadlet for new work.
- `--preserve-fds` is a local Linux Podman feature and is not available with remote Podman clients.
- The first activation may take longer if the image has not been pulled yet, so the `TimeoutStartSec` values in the examples still matter.
